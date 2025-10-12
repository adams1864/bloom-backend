import express from "express";
import productRoutes from "./routes/product.routes.js";
import bundleRoutes from "./routes/bundle.routes.js";
import authRoutes from "./auth/auth.routes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
// serve uploads
app.use("/uploads", express.static("./uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bundles", bundleRoutes);

app.listen(4000, () => console.log("🚀 Server running on port 4000"));
