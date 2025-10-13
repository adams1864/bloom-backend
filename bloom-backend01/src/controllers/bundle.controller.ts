import type { Request, Response } from "express";
import path from "path";
import { inArray, eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { bundles, bundleProducts, products } from "../db/schema.js";

interface BundlePayload {
  title?: string;
  description?: string;
  status?: string;
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

async function filterExistingProductIds(ids: number[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(inArray(products.id, ids));
  const valid = new Set(rows.map((row) => row.id));
  return ids.filter((id) => valid.has(id));
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
  const { title, description, status } = req.body as BundlePayload;
  const normalizedStatus = status === "published" ? "published" : "unpublished";
  const cover = (req as any).file;
  const coverPath = cover ? `/uploads/${path.basename(cover.path)}` : "";
  const productIds = await filterExistingProductIds(parseProductIds((req.body as any).productIds ?? []));

  if (!title) return res.status(400).json({ message: "Missing required field: title" });
  if (!description) return res.status(400).json({ message: "Missing required field: description" });

  await db.insert(bundles).values({
    title,
    description,
    status: normalizedStatus,
    coverImage: coverPath,
  });

  const newest = await db.select().from(bundles).orderBy(desc(bundles.id)).limit(1);
  const bundle = newest[0];

  if (!bundle) return res.status(500).json({ message: "Failed to create bundle" });

  if (productIds.length > 0) {
    const values = productIds.map((productId) => ({ bundleId: bundle.id, productId }));
    await db.insert(bundleProducts).values(values);
  }

  const [withProducts] = await attachProducts([bundle]);
  res.status(201).json({ message: "Bundle created", bundle: withProducts });
};

export const updateBundle = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid bundle id" });

  const existing = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1);
  if (existing.length === 0) return res.status(404).json({ message: "Bundle not found" });

  const payload = req.body as BundlePayload;
  const updates: Record<string, unknown> = {};

  if (payload.title) updates.title = payload.title;
  if (payload.description) updates.description = payload.description;
  if (payload.status) updates.status = payload.status === "published" ? "published" : "unpublished";

  const cover = (req as any).file;
  if (cover) {
    updates.coverImage = `/uploads/${path.basename(cover.path)}`;
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await db.update(bundles).set(updates).where(eq(bundles.id, id));
  }

  if (req.body?.productIds !== undefined) {
    const productIds = await filterExistingProductIds(
      parseProductIds((req.body as any).productIds)
    );

    await db.delete(bundleProducts).where(eq(bundleProducts.bundleId, id));
    if (productIds.length > 0) {
      const values = productIds.map((productId) => ({ bundleId: id, productId }));
      await db.insert(bundleProducts).values(values);
    }
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
