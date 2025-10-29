import express from "express";
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from "../controllers/product.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", requireAuth, createProduct);
router.put("/:id", requireAuth, updateProduct);
router.delete("/:id", requireAuth, deleteProduct);

export default router;
