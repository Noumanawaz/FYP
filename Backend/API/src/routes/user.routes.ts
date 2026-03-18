import { Router } from "express";
import { body } from "express-validator";
import { validate } from "@/middleware/validation";
import { UserController } from "@/controllers/user.controller";
import { authenticate, optionalAuth } from "@/middleware/auth";
import { requireAdmin, requireAnyRole, requireRestaurantOwnerOrAdmin } from "@/middleware/rbac";

const router = Router();

// List all users (admin only)
router.get("/", authenticate, requireAdmin, UserController.list);

// Get user by ID (own profile or admin)
router.get("/:id", optionalAuth, UserController.get);

// Create user (public - for registration - restricted to customer/restaurant_owner)
router.post(
  "/",
  [
    body("name").notEmpty().trim(),
    body("preferred_language").isIn(["en", "ur"]),
    body("role").optional().isIn(["customer", "restaurant_owner"]),
    body("email").optional().isEmail().withMessage("Invalid email format"),
    body("phone").optional().isString(),
    body("password").optional().isString().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate([]),
  UserController.create
);

// Create branch user (authenticated - owners/admins only)
router.post(
  "/branch",
  [
    body("name").notEmpty().trim(),
    body("email").optional().isEmail().withMessage("Invalid email format"),
    body("phone").optional().isString(),
    body("password").isString().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("restaurant_id").notEmpty().isUUID(),
    body("location_id").notEmpty().isUUID(),
    body("preferred_language").optional().isIn(["en", "ur"]),
  ],
  validate([]),
  authenticate,
  requireRestaurantOwnerOrAdmin,
  UserController.createBranchUser
);

// Update user (own profile or admin)
router.put(
  "/:id",
  [
    body("preferred_language").optional().isIn(["en", "ur"]),
    body("role").optional().isIn(["customer", "restaurant_owner", "admin"]),
    body("email").optional().isEmail(),
  ],
  validate([]),
  authenticate,
  UserController.update
);

// Delete user (admin only)
router.delete("/:id", authenticate, requireAdmin, UserController.delete);

export default router;

