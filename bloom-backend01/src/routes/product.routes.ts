import express from "express";
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from "../controllers/product.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();

// ensure uploads folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname);
		cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
	},
});

const upload = multer({ storage });

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", upload.fields([{ name: "cover", maxCount: 1 }, { name: "images", maxCount: 2 }]), requireAuth, createProduct);
router.put("/:id", requireAuth, updateProduct);
router.delete("/:id", requireAuth, deleteProduct);

export default router;
