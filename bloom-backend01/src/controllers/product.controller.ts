import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import type { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

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
  // multer will process files; expect fields: name (title), description, category, size, gender, color, price, stock, status
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
  } = req.body as any;

  if (!name || !price) return res.status(400).json({ message: "Missing required fields: name or price" });

  // files: cover (single), images (up to 2)
  const cover = (req as any).files?.cover?.[0];
  const images = (req as any).files?.images ?? [];

  const coverPath = cover ? `/uploads/${path.basename(cover.path)}` : "";
  const image1 = images[0] ? `/uploads/${path.basename(images[0].path)}` : "";
  const image2 = images[1] ? `/uploads/${path.basename(images[1].path)}` : "";

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
    cover_image: coverPath,
    image_1: image1,
    image_2: image2,
  });

  // fetch the latest inserted product with same name (best-effort)
  const rows = await db.select().from(products).where(and(eq(products.name, name), eq(products.cover_image, coverPath))).limit(1);
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
