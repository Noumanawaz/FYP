import { Router } from "express";
import { RestaurantController } from "@/controllers/restaurant.controller";
import { body, query } from "express-validator";
import { validate } from "@/middleware/validation";
import { authenticate } from "@/middleware/auth";
import { requireRestaurantOwnerOrAdmin, requireAdmin } from "@/middleware/rbac";

const router = Router();

// Get all restaurants
router.get("/", [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 }), query("status").optional().isIn(["active", "inactive", "pending"]), query("price_range").optional().isIn(["budget", "mid-range", "premium"])], validate([]), RestaurantController.getAll);

// Search restaurants (must be before /:id)
router.get("/search", RestaurantController.search);

// Get nearby restaurants by location (must be before /:id)
router.get("/nearby", [query("lat").isFloat().withMessage("Latitude is required"), query("lng").isFloat().withMessage("Longitude is required"), query("radius").optional().isFloat({ min: 0.1, max: 50 }).withMessage("Radius must be between 0.1 and 50 km")], validate([]), RestaurantController.getNearby);

// Get restaurant by ID (must be after specific routes like /search and /nearby)
router.get("/:id", RestaurantController.getById);

// Get restaurant locations
router.get("/:id/locations", RestaurantController.getLocations);

// Check if address is within restaurant delivery zone
router.get("/:id/delivery-check", [query("lat").isFloat().withMessage("Latitude is required"), query("lng").isFloat().withMessage("Longitude is required")], validate([]), RestaurantController.checkDeliveryZone);

// Create restaurant (restaurant owner or admin only)
router.post("/", [body("name").notEmpty().trim(), body("country").notEmpty().trim(), body("price_range").isIn(["budget", "mid-range", "premium"]), body("categories").isArray(), body("specialties").isArray(), body("keywords").isArray()], validate([]), authenticate, requireRestaurantOwnerOrAdmin, RestaurantController.create);

// Add location to restaurant (restaurant owner or admin only)
router.post("/:id/locations", [
  body("city").notEmpty().trim(), 
  body("area").notEmpty().trim(), 
  body("address").notEmpty().trim(),
  body("lat").optional().isFloat().withMessage("Latitude must be a valid number"),
  body("lng").optional().isFloat().withMessage("Longitude must be a valid number"),
  body("phone").optional().isString(),
], validate([]), authenticate, requireRestaurantOwnerOrAdmin, RestaurantController.addLocation);

// Get my restaurant (for restaurant owners)
router.get("/my/restaurant", authenticate, requireRestaurantOwnerOrAdmin, RestaurantController.getMyRestaurant);

// Update restaurant (restaurant owner or admin only)
router.put("/:id", authenticate, requireRestaurantOwnerOrAdmin, RestaurantController.update);

// Delete restaurant (admin only)
router.delete("/:id", authenticate, requireAdmin, RestaurantController.delete);

export default router;
