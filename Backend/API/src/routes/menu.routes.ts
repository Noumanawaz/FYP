import { Router } from "express";
import { MenuController } from "@/controllers/menu.controller";
import { body, query } from "express-validator";
import { validate } from "@/middleware/validation";
import { authenticate, optionalAuth } from "@/middleware/auth";
import { requireRestaurantOwnerOrAdmin } from "@/middleware/rbac";

const router = Router();

router.get("/", [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })], validate([]), MenuController.getAll);

router.get("/search", MenuController.search);

router.get("/restaurant/:restaurantId", MenuController.getRestaurantMenu);

router.get("/:id", MenuController.getById);

router.post("/", [body("restaurant_id").notEmpty().isUUID(), body("category_id").notEmpty().isUUID(), body("name").notEmpty().trim(), body("description").notEmpty().trim(), body("base_price").isFloat({ min: 0 })], validate([]), authenticate, requireRestaurantOwnerOrAdmin, MenuController.create);

router.put("/:id", authenticate, requireRestaurantOwnerOrAdmin, MenuController.update);

router.delete("/:id", authenticate, requireRestaurantOwnerOrAdmin, MenuController.delete);

export default router;
