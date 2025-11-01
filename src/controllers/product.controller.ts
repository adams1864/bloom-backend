import path from "path";
import type { Request, Response } from "express";
import { and, asc, desc, eq, like, sql, type InferSelectModel } from "drizzle-orm";
import { db } from "../db/index.js";
import { products } from "../db/schema.js";

type ProductRow = InferSelectModel<typeof products>;

const COLOR_HEX_MAP: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#facc15",
  pink: "#ec4899",
  purple: "#a855f7",
  white: "#f9fafb",
  black: "#030712",
  gray: "#6b7280",
};

const PLACEHOLDER_IMAGE = "https://placehold.co/600x800?text=No+Image";

const SORTABLE_COLUMNS = {
  createdAt: products.createdAt,
  name: products.name,
  price: products.price,
  status: products.status,
} as const;

function parseNumericQuery(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function normalizeStatus(value: unknown): "published" | "unpublished" | "archived" {
  if (value === "archived") return "archived";
  if (value === "published") return "published";
  return "unpublished";
}

function normalizeMediaPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeColor(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean)
      .join(",");
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(",");
  }
  return "";
}

function mapColorSwatches(value: string | null): { name: string; hex: string }[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const lower = entry.toLowerCase();
  const hex = COLOR_HEX_MAP[lower];
  let resolvedHex: string = COLOR_HEX_MAP.gray ?? "#6b7280";
      if (typeof hex === "string" && hex.length > 0) {
        resolvedHex = hex;
      }
      return { name: entry, hex: resolvedHex };
    });
}

export function mapProductRow(row: ProductRow) {
  const coverImage = normalizeMediaPath(row.coverImage);
  const image1 = normalizeMediaPath(row.image1);
  const image2 = normalizeMediaPath(row.image2);

  const images = [coverImage, image1, image2].filter(Boolean) as string[];
  const colorRaw = typeof row.color === "string" ? normalizeColor(row.color) : "";
  const colorValues = colorRaw ? colorRaw.split(",").filter(Boolean) : [];
  const colorSwatches = colorValues.length > 0 ? mapColorSwatches(colorRaw) : [];

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: row.category ?? "",
    size: row.size ?? "",
    gender: row.gender ?? "",
    price: row.price,
    stock: row.stock ?? 0,
    status: row.status ?? "unpublished",
    coverImage: coverImage ?? PLACEHOLDER_IMAGE,
    image1: image1 ?? null,
    image2: image2 ?? null,
    images: images.length > 0 ? images : [PLACEHOLDER_IMAGE],
    color: colorRaw,
    colorValues,
    colors: colorSwatches,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  };
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

function resolveUploadedPath(file?: Express.Multer.File): string | null {
  if (!file) return null;
  return `/uploads/${path.basename(file.path)}`;
}

function buildFilters(query: Request["query"]) {
  const conditions = [] as any[];
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const status = typeof query.status === "string" ? query.status.trim() : "";
  const category = typeof query.category === "string" ? query.category.trim() : "";

  if (search) {
    conditions.push(like(products.name, `%${search}%`));
  }

  if (status && ["published", "unpublished", "archived"].includes(status)) {
    conditions.push(eq(products.status, status as any));
  }

  if (category) {
    conditions.push(eq(products.category, category));
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

export const getProducts = async (req: Request, res: Response) => {
  const page = parseNumericQuery(req.query.page, 1);
  const perPageRaw = parseNumericQuery(req.query.perPage, 12);
  const perPage = Math.min(perPageRaw, 100);
  const offset = (page - 1) * perPage;

  const sortKey = typeof req.query.sort === "string" && req.query.sort in SORTABLE_COLUMNS ? (req.query.sort as keyof typeof SORTABLE_COLUMNS) : "createdAt";
  const sortOrder = req.query.order === "asc" ? "asc" : "desc";
  const sortColumn = SORTABLE_COLUMNS[sortKey];

  const whereClause = buildFilters(req.query);

  const countQuery = db.select({ value: sql<number>`count(*)` }).from(products);
  if (whereClause) {
    countQuery.where(whereClause);
  }
  const totalRows = await countQuery;
  const total = totalRows[0]?.value ?? 0;

  const query = db.select().from(products);
  if (whereClause) {
    query.where(whereClause);
  }
  query.orderBy(sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn));
  query.limit(perPage).offset(offset);

  const rows = await query;
  const data = rows.map(mapProductRow);

  res.json({
    data,
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  });
};

export const getProduct = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (rows.length === 0) {
    return res.status(404).json({ message: "Product not found" });
  }

  const productRow = rows[0]!;
  return res.json({ product: mapProductRow(productRow) });
};

export const createProduct = async (req: Request, res: Response) => {
  const payload = req.body ?? {};
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const price = Number((payload as Record<string, unknown>).price);

  if (!name || !Number.isFinite(price)) {
    return res.status(400).json({ message: "Missing required fields: name or price" });
  }

  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const category = typeof payload.category === "string" ? payload.category.trim() : "";
  const size = typeof payload.size === "string" ? payload.size.trim() : "";
  const gender = typeof payload.gender === "string" ? payload.gender.trim() : "";
  const stock = Number((payload as Record<string, unknown>).stock ?? 0);
  const status = normalizeStatus(payload.status);
  const color = normalizeColor((payload as Record<string, unknown>).color ?? []);

  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
  const coverFile = files.coverImage?.[0];
  const imageFile1 = files.image1?.[0];
  const imageFile2 = files.image2?.[0];

  const coverImage = resolveUploadedPath(coverFile) ?? normalizeMediaPath(payload.coverImage) ?? "";
  const image1 = resolveUploadedPath(imageFile1) ?? normalizeMediaPath(payload.image1) ?? "";
  const image2 = resolveUploadedPath(imageFile2) ?? normalizeMediaPath(payload.image2) ?? "";

  const insertResult = await db.insert(products).values({
    name,
    description,
    category,
    size,
    gender,
    color,
    price: price,
    stock: Number.isFinite(stock) ? stock : 0,
    status,
    coverImage,
    image1,
    image2,
  });

  const insertId = extractInsertId(insertResult);
  if (!insertId) {
    return res.status(201).json({ message: "Product created" });
  }

  const rows = await db.select().from(products).where(eq(products.id, insertId)).limit(1);
  if (rows.length === 0) {
    return res.status(201).json({ message: "Product created" });
  }

  const productRow = rows[0]!;
  res.status(201).json({ message: "Product created", product: mapProductRow(productRow) });
};

export const updateProduct = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const existing = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (existing.length === 0) {
    return res.status(404).json({ message: "Product not found" });
  }

  const payload = req.body ?? {};
  const updates: Partial<typeof products["$inferInsert"]> = {};

  if (typeof payload.name === "string") updates.name = payload.name.trim();
  if (typeof payload.description === "string") updates.description = payload.description.trim();
  if (typeof payload.category === "string") updates.category = payload.category.trim();
  if (typeof payload.size === "string") updates.size = payload.size.trim();
  if (typeof payload.gender === "string") updates.gender = payload.gender.trim();
  if (payload.price !== undefined) {
    const price = Number((payload as Record<string, unknown>).price);
    if (!Number.isFinite(price)) {
      return res.status(400).json({ message: "Price must be a valid number" });
    }
    updates.price = price;
  }
  if (payload.stock !== undefined) {
    const stock = Number((payload as Record<string, unknown>).stock);
    if (!Number.isFinite(stock)) {
      return res.status(400).json({ message: "Stock must be a valid number" });
    }
    updates.stock = stock;
  }
  if (payload.status !== undefined) {
    updates.status = normalizeStatus(payload.status);
  }
  if (payload.color !== undefined) {
    updates.color = normalizeColor((payload as Record<string, unknown>).color);
  }

  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
  const coverFile = files.coverImage?.[0];
  const imageFile1 = files.image1?.[0];
  const imageFile2 = files.image2?.[0];

  const coverImage = resolveUploadedPath(coverFile);
  const image1 = resolveUploadedPath(imageFile1);
  const image2 = resolveUploadedPath(imageFile2);

  if (coverImage !== null) updates.coverImage = coverImage;
  if (image1 !== null) updates.image1 = image1;
  if (image2 !== null) updates.image2 = image2;

  if (typeof payload.image1 === "string" && !image1) {
    updates.image1 = normalizeMediaPath(payload.image1) ?? "";
  }
  if (typeof payload.image2 === "string" && !image2) {
    updates.image2 = normalizeMediaPath(payload.image2) ?? "";
  }
  if (typeof payload.coverImage === "string" && !coverImage) {
    updates.coverImage = normalizeMediaPath(payload.coverImage) ?? "";
  }

  if (Object.keys(updates).length === 0) {
    const [row] = existing;
    if (!row) {
      return res.json({ message: "Product updated" });
    }
    return res.json({ message: "Product updated", product: mapProductRow(row) });
  }

  await db.update(products).set(updates).where(eq(products.id, id));

  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const product = rows[0] ?? existing[0];

  if (!product) {
    return res.json({ message: "Product updated" });
  }

  res.json({ message: "Product updated", product: mapProductRow(product) });
};

export const deleteProduct = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  await db.delete(products).where(eq(products.id, id));
  res.status(204).send();
};
