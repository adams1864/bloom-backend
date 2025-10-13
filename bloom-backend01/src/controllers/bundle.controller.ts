import type { Request, Response } from "express";
import path from "path";
import { inArray, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { bundles, bundleProducts, products } from "../db/schema.js";

interface BundlePayload {
  title?: string;
  description?: string;
  status?: string;
  coverImage?: string;
  productIds?: number[];
}

function parseProductIds(value: unknown): number[] {
  const collectNumbers = (items: unknown[]): number[] =>
    items
      .map((entry) => Number(entry))
      .filter((id) => Number.isInteger(id) && id > 0);

  if (Array.isArray(value)) {
    const flattened = value.flatMap((entry) => (typeof entry === "string" ? entry.split(",") : entry));
    return Array.from(new Set(collectNumbers(flattened)));
  }

  if (typeof value === "string") {
    try {
      const asJson = JSON.parse(value);
      if (Array.isArray(asJson)) {
        return Array.from(new Set(collectNumbers(asJson)));
      }
    } catch (_) {
      const numeric = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      return Array.from(new Set(collectNumbers(numeric)));
    }
  }

  return [];
}

async function validateProductIds(ids: number[]) {
  if (ids.length === 0) {
    return { valid: [] as number[], missing: [] as number[] };
  }

  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(inArray(products.id, ids));

  const validSet = new Set(rows.map((row) => row.id));
  const valid = ids.filter((id) => validSet.has(id));
  const missing = ids.filter((id) => !validSet.has(id));

  return { valid, missing };
}

function extractInsertId(result: unknown): number | null {
  if (!result) return null;

  if (Array.isArray(result)) {
    const [first] = result as Array<Record<string, unknown>>;
    const candidate = first?.insertId;
    if (typeof candidate === "number" || typeof candidate === "bigint") {
      return Number(candidate);
    }
    return null;
  }

  const candidate = (result as Record<string, unknown>).insertId;
  if (typeof candidate === "number" || typeof candidate === "bigint") {
    return Number(candidate);
  }
  return null;
}

async function attachProducts(bundleList: any[]) {
  if (bundleList.length === 0) return [];

  const ids = bundleList.map((bundle) => bundle.id);
  const rows = await db
    .select({
      bundleId: bundleProducts.bundleId,
      product: products,
    })
    .from(bundleProducts)
    .leftJoin(products, eq(bundleProducts.productId, products.id))
    .where(inArray(bundleProducts.bundleId, ids));

  const grouped = new Map<number, any[]>();
  rows.forEach((row) => {
    if (!row.product) return;
    const list = grouped.get(row.bundleId) ?? [];
    list.push(row.product);
    grouped.set(row.bundleId, list);
  });

  return bundleList.map((bundle) => ({
    ...bundle,
    products: grouped.get(bundle.id) ?? [],
  }));
}

export const getBundles = async (req: Request, res: Response) => {
  const rows = await db.select().from(bundles).orderBy(bundles.createdAt);
  const withProducts = await attachProducts(rows);
  res.json(withProducts);
};

export const getBundle = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid bundle id" });

  const row = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1);
  if (row.length === 0) return res.status(404).json({ message: "Bundle not found" });

  const [bundle] = await attachProducts(row);
  res.json(bundle);
};

export const createBundle = async (req: Request, res: Response) => {
  const payload = req.body as BundlePayload;
  const title = typeof payload.title === "string" ? payload.title.trim() : undefined;
  const description = typeof payload.description === "string" ? payload.description.trim() : undefined;
  const normalizedStatus = payload.status === "published" ? "published" : "unpublished";

  const coverFile = (req as any).file;
  const coverImage = coverFile
    ? `/uploads/${path.basename(coverFile.path)}`
    : typeof payload.coverImage === "string"
      ? payload.coverImage.trim()
      : "";

  const rawProductInput =
    (req.body as any).productIds ??
    (req.body as any).products ??
    (req.body as any).productID ??
    [];
  const parsedProductIds = parseProductIds(rawProductInput);
  const { valid: validProductIds, missing: missingProductIds } = await validateProductIds(parsedProductIds);

  if (missingProductIds.length > 0) {
    return res.status(400).json({
      message: "One or more selected products do not exist",
      invalidProductIds: missingProductIds,
    });
  }

  if (!title) return res.status(400).json({ message: "Missing required field: title" });
  if (!description) return res.status(400).json({ message: "Missing required field: description" });

  try {
    const bundle = await db.transaction(async (tx) => {
      const insertResult = await tx.insert(bundles).values({
        title,
        description,
        status: normalizedStatus,
        coverImage,
      });

      const bundleId = extractInsertId(insertResult);
      if (!bundleId) {
        throw new Error("Unable to determine bundle id after insert");
      }

      if (validProductIds.length > 0) {
        const relations = validProductIds.map((productId: number) => ({ bundleId, productId }));
        await tx.insert(bundleProducts).values(relations);
      }

      const rows = await tx.select().from(bundles).where(eq(bundles.id, bundleId)).limit(1);
      return rows[0];
    });

    if (!bundle) {
      return res.status(500).json({ message: "Failed to create bundle" });
    }

    const [withProducts] = await attachProducts([bundle]);
    return res.status(201).json({ message: "Bundle created", bundle: withProducts });
  } catch (error) {
    console.error("Failed to create bundle", error);
    return res.status(500).json({ message: "Failed to create bundle" });
  }
};

export const updateBundle = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid bundle id" });

  const existing = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1);
  if (existing.length === 0) return res.status(404).json({ message: "Bundle not found" });

  const payload = req.body as BundlePayload;
  const updates: Record<string, unknown> = {};

  if (typeof payload.title === "string") updates.title = payload.title.trim();
  if (typeof payload.description === "string") updates.description = payload.description.trim();
  if (typeof payload.status === "string") updates.status = payload.status === "published" ? "published" : "unpublished";

  const cover = (req as any).file;
  if (cover) {
    updates.coverImage = `/uploads/${path.basename(cover.path)}`;
  } else if (typeof payload.coverImage === "string") {
    updates.coverImage = payload.coverImage;
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await db.update(bundles).set(updates).where(eq(bundles.id, id));
  }

  if (
    (req.body as any)?.productIds !== undefined ||
    (req.body as any)?.products !== undefined ||
    (req.body as any)?.productID !== undefined
  ) {
    const rawProductInput =
      (req.body as any).productIds ??
      (req.body as any).products ??
      (req.body as any).productID;
    const parsedProductIds = parseProductIds(rawProductInput);
    const { valid: validProductIds, missing: missingProductIds } = await validateProductIds(parsedProductIds);

    if (missingProductIds.length > 0) {
      return res.status(400).json({
        message: "One or more selected products do not exist",
        invalidProductIds: missingProductIds,
      });
    }

    await db.transaction(async (tx) => {
      await tx.delete(bundleProducts).where(eq(bundleProducts.bundleId, id));
      if (validProductIds.length > 0) {
        const relations = validProductIds.map((productId: number) => ({ bundleId: id, productId }));
        await tx.insert(bundleProducts).values(relations);
      }
    });
  }

  const updated = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1);
  const [withProducts] = await attachProducts(updated);
  res.json({ message: "Bundle updated", bundle: withProducts });
};

export const deleteBundle = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid bundle id" });

  await db.delete(bundleProducts).where(eq(bundleProducts.bundleId, id));
  await db.delete(bundles).where(eq(bundles.id, id));
  return res.json({ message: "Bundle deleted" });
};
