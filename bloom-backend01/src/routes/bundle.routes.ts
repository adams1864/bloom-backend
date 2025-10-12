import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { requireAuth } from "../auth/auth.middleware.js";
import { getBundles, getBundle, createBundle, updateBundle, deleteBundle } from "../controllers/bundle.controller.js";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({ storage });

router.get("/", getBundles);
router.get("/:id", getBundle);
router.post("/", requireAuth, upload.single("cover"), createBundle);
router.put("/:id", requireAuth, upload.single("cover"), updateBundle);
router.delete("/:id", requireAuth, deleteBundle);

export default router;
