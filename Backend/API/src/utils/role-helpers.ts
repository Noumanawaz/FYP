/**
 * Role Helper Utilities
 * Helper functions for role-based operations
 */

import { UserRole } from "@/middleware/rbac";

/**
 * Check if user can access a resource
 */
export const canAccess = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    customer: 1,
    restaurant_owner: 2,
    admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Check if user is admin
 */
export const isAdmin = (role: UserRole): boolean => {
  return role === "admin";
};

/**
 * Check if user is restaurant owner or admin
 */
export const isRestaurantOwnerOrAdmin = (role: UserRole): boolean => {
  return role === "restaurant_owner" || role === "admin";
};

/**
 * Check if user is customer
 */
export const isCustomer = (role: UserRole): boolean => {
  return role === "customer";
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role: UserRole): string => {
  const displayNames: Record<UserRole, string> = {
    customer: "Customer",
    restaurant_owner: "Restaurant Owner",
    admin: "Administrator",
  };
  return displayNames[role] || role;
};

/**
 * Get all roles
 */
export const getAllRoles = (): UserRole[] => {
  return ["customer", "restaurant_owner", "admin"];
};

