import express from "express";
import productRoutes from "./routes/product.routes.js";
import bundleRoutes from "./routes/bundle.routes.js";
import orderRoutes from "./routes/order.routes.js";
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
app.use("/api/orders", orderRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => console.log(`Server running → http://localhost:${PORT}`));
