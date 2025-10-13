import express from "express";
import { getOrder, getOrders, searchOrders } from "../controllers/order.controller.js";

const router = express.Router();

router.get("/search", searchOrders);
router.get("/", getOrders);
router.get("/:id", getOrder);

export default router;
