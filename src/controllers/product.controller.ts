import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import type { Request, Response } from "express";

export const getProducts = async (req: Request, res: Response) => {
  const allProducts = await db.select().from(products);
  res.json(allProducts);
};

export const getProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await db.select().from(products).where(eq(products.id, Number(id)));
  res.json(product[0]);
};

export const createProduct = async (req: Request, res: Response) => {
  const {
    name,
    description,
    category,
    size,
    gender,
    color,
    price,
    stock,
    status,
    coverImage,
    image1,
    image2,
  } = req.body as any;

  if (!name || !price) return res.status(400).json({ message: "Missing required fields: name or price" });

  await db.insert(products).values({
    name,
    description,
    category,
    size,
    gender,
    color,
    price: Number(price),
    stock: Number(stock ?? 0),
    status: status ?? "unpublished",
    coverImage: coverImage ?? "",
    image1: image1 ?? "",
    image2: image2 ?? "",
  });

  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.name, name), eq(products.coverImage, coverImage ?? "")))
    .limit(1);
  const inserted = rows[0] ?? null;

  res.status(201).json({ message: "Product created", product: inserted });
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, stock } = req.body;
  await db.update(products).set({ name, description, price, stock }).where(eq(products.id, Number(id)));
  res.json({ message: "Product updated" });
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.delete(products).where(eq(products.id, Number(id)));
  res.json({ message: "Product deleted" });
};
