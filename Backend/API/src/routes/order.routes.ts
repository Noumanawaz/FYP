import { Router } from "express";
import { OrderController } from "@/controllers/order.controller";
import { body, query } from "express-validator";
import { validate } from "@/middleware/validation";
import { authenticate, optionalAuth } from "@/middleware/auth";
import { requireBranchOrRestaurantOwner, requireAnyRole } from "@/middleware/rbac";

const router = Router();

router.post("/", [body("restaurant_id").notEmpty().isUUID(), body("location_id").notEmpty().isUUID(), body("order_type").isIn(["voice", "app", "web", "phone"]), body("items").isArray({ min: 1 }), body("phone").notEmpty().trim()], validate([]), optionalAuth, OrderController.create);

router.get("/history", [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })], validate([]), authenticate, OrderController.getOrderHistory);

router.get("/my-orders", [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })], validate([]), authenticate, OrderController.getMyOrders);

router.get("/restaurant/:restaurantId/history", [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })], validate([]), authenticate, requireBranchOrRestaurantOwner, OrderController.getRestaurantOrderHistory);

router.get("/:id", OrderController.getById);

router.get("/:id/items", OrderController.getOrderItems);

router.patch("/:id/status", [body("status").isIn(["pending", "confirmed", "preparing", "ready", "delivered", "completed", "cancelled"])], validate([]), authenticate, requireBranchOrRestaurantOwner, OrderController.updateStatus);

export default router;
