import { Router } from "express";
import { body } from "express-validator";
import { validate } from "@/middleware/validation";
import { UserController } from "@/controllers/user.controller";
import { authenticate, optionalAuth } from "@/middleware/auth";
import { requireAdmin, requireAnyRole } from "@/middleware/rbac";

const router = Router();

// List all users (admin only)
router.get("/", authenticate, requireAdmin, UserController.list);

// Get user by ID (own profile or admin)
router.get("/:id", optionalAuth, UserController.get);

// Create user (public - for registration)
router.post(
  "/",
  [
    body("name").notEmpty().trim(),
    body("preferred_language").isIn(["en", "ur"]),
    body("role").optional().isIn(["customer", "restaurant_owner", "admin"]),
    body("email").optional().isEmail().withMessage("Invalid email format"),
    body("phone").optional().isString(),
    body("password").optional().isString().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate([]),
  UserController.create
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

