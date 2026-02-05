import { Router } from "express";
import { CategoryController } from "@/controllers/category.controller";
import { body, query, custom } from "express-validator";
import { validate } from "@/middleware/validation";
import { authenticate, optionalAuth } from "@/middleware/auth";
import { requireRestaurantOwnerOrAdmin } from "@/middleware/rbac";

// Custom validator for optional UUID (can be null, empty, or valid UUID)
const optionalUUID = (value: any) => {
  if (value === null || value === undefined || value === "") {
    return true; // Allow null/empty
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof value === "string" && uuidRegex.test(value)) {
    return true;
  }
  throw new Error("Must be a valid UUID or empty");
};

const router = Router();

// Get all categories (public, with optional filters)
router.get(
  "/",
  [
    query("restaurant_id").optional().isUUID(),
    query("parent_category_id").optional().isUUID(),
    query("is_active").optional().isBoolean(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validate([]),
  CategoryController.getAll
);

// Get category by ID (public)
router.get("/:id", CategoryController.getById);

// Get restaurant categories (public)
router.get("/restaurant/:restaurantId", CategoryController.getRestaurantCategories);

// Get category tree for restaurant (public)
router.get("/restaurant/:restaurantId/tree", CategoryController.getCategoryTree);

// Get root categories for restaurant (public)
router.get("/restaurant/:restaurantId/roots", CategoryController.getRootCategories);

// Get child categories (public)
router.get("/parent/:parentId/children", CategoryController.getChildCategories);

// Create category (restaurant owner or admin only)
router.post(
  "/",
  [
    body("restaurant_id").notEmpty().isUUID(),
    body("name").notEmpty().trim(),
    body("parent_category_id").optional().custom(optionalUUID),
    body("display_order").optional().isInt({ min: 0 }),
    body("description").optional().isString(),
    body("image_url").optional().isURL(),
    body("is_active").optional().isBoolean(),
  ],
  validate([]),
  authenticate,
  requireRestaurantOwnerOrAdmin,
  CategoryController.create
);

// Update category (restaurant owner or admin only)
router.put(
  "/:id",
  [
    body("name").optional().trim(),
    body("parent_category_id").optional().custom(optionalUUID),
    body("display_order").optional().isInt({ min: 0 }),
    body("description").optional().isString(),
    body("image_url").optional().isURL(),
    body("is_active").optional().isBoolean(),
  ],
  validate([]),
  authenticate,
  requireRestaurantOwnerOrAdmin,
  CategoryController.update
);

// Delete category (restaurant owner or admin only)
router.delete("/:id", authenticate, requireRestaurantOwnerOrAdmin, CategoryController.delete);

export default router;

