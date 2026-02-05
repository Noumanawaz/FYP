import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { UserModel } from "@/models/postgres/users.model";
import { AppError } from "./error-handler";
import { ApiResponse } from "@/types";

export type UserRole = "customer" | "restaurant_owner" | "admin";

/**
 * Role-based access control middleware
 * Checks if the authenticated user has the required role(s)
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user?.user_id) {
        const response: ApiResponse = {
          success: false,
          error: "Authentication required",
        };
        return res.status(401).json(response);
      }

      // Get user from database to check role
      const user = await UserModel.findById(req.user.user_id);
      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: "User not found",
        };
        return res.status(404).json(response);
      }

      // Check if user has required role
      if (!allowedRoles.includes(user.role as UserRole)) {
        const response: ApiResponse = {
          success: false,
          error: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${user.role}`,
        };
        return res.status(403).json(response);
      }

      // Attach user object with role to request
      req.user = {
        ...req.user,
        role: user.role as UserRole,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require admin role
 */
export const requireAdmin = requireRole("admin");

/**
 * Require restaurant owner or admin
 */
export const requireRestaurantOwnerOrAdmin = requireRole("restaurant_owner", "admin");

/**
 * Require customer, restaurant owner, or admin (any authenticated user)
 */
export const requireAnyRole = requireRole("customer", "restaurant_owner", "admin");

/**
 * Check if user owns a restaurant
 * Use this for restaurant-specific operations
 */
export const requireRestaurantOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.user_id) {
      const response: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      return res.status(401).json(response);
    }

    const user = await UserModel.findById(req.user.user_id);
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: "User not found",
      };
      return res.status(404).json(response);
    }

    // Admins can access any restaurant
    if (user.role === "admin") {
      req.user = { ...req.user, role: user.role as UserRole };
      return next();
    }

    // Restaurant owners can only access their own restaurants
    if (user.role === "restaurant_owner") {
      const restaurantId = req.params.id || req.params.restaurantId || req.body.restaurant_id;
      
      if (!restaurantId) {
        const response: ApiResponse = {
          success: false,
          error: "Restaurant ID required",
        };
        return res.status(400).json(response);
      }

      // Check restaurant ownership
      const { RestaurantModel } = await import("@/models/postgres/restaurants.model");
      const restaurant = await RestaurantModel.findById(restaurantId);
      
      if (!restaurant) {
        const response: ApiResponse = {
          success: false,
          error: "Restaurant not found",
        };
        return res.status(404).json(response);
      }
      
      if (restaurant.owner_id !== user.user_id) {
        const response: ApiResponse = {
          success: false,
          error: "Access denied. You can only manage your own restaurant",
        };
        return res.status(403).json(response);
      }
      
      req.user = { ...req.user, role: user.role as UserRole };
      return next();
    }

    const response: ApiResponse = {
      success: false,
      error: "Access denied. Restaurant owner or admin role required",
    };
    return res.status(403).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Role hierarchy check
 * Admin > Restaurant Owner > Customer
 */
export const hasRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    customer: 1,
    restaurant_owner: 2,
    admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

