import { MenuCategoryModel } from "@/models/postgres/menu-categories.model";
import { CreateMenuCategoryDto, UpdateMenuCategoryDto, MenuCategory } from "@/types";
import { AppError } from "@/middleware/error-handler";

export class CategoryService {
  // Get all categories with filters
  static async getAllCategories(
    filters?: {
      restaurant_id?: string;
      parent_category_id?: string | null;
      is_active?: boolean;
    },
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: MenuCategory[]; total: number }> {
    return await MenuCategoryModel.findAll(filters, pagination);
  }

  // Get category by ID
  static async getCategoryById(categoryId: string): Promise<MenuCategory> {
    const category = await MenuCategoryModel.findById(categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    return category;
  }

  // Get categories by restaurant
  static async getRestaurantCategories(restaurantId: string, includeInactive: boolean = false): Promise<MenuCategory[]> {
    return await MenuCategoryModel.findByRestaurant(restaurantId, includeInactive);
  }

  // Get category tree (hierarchical structure)
  static async getCategoryTree(restaurantId: string): Promise<MenuCategory[]> {
    return await MenuCategoryModel.getCategoryTree(restaurantId);
  }

  // Get root categories (no parent)
  static async getRootCategories(restaurantId: string): Promise<MenuCategory[]> {
    return await MenuCategoryModel.findRootCategories(restaurantId);
  }

  // Get child categories
  static async getChildCategories(parentCategoryId: string): Promise<MenuCategory[]> {
    return await MenuCategoryModel.findChildren(parentCategoryId);
  }

  // Create category
  static async createCategory(data: CreateMenuCategoryDto): Promise<MenuCategory> {
    // Validate parent category if provided
    if (data.parent_category_id) {
      const parent = await MenuCategoryModel.findById(data.parent_category_id);
      if (!parent) {
        throw new AppError("Parent category not found", 404);
      }
      if (parent.restaurant_id !== data.restaurant_id) {
        throw new AppError("Parent category must belong to the same restaurant", 400);
      }
    }

    return await MenuCategoryModel.create(data);
  }

  // Update category
  static async updateCategory(categoryId: string, data: UpdateMenuCategoryDto): Promise<MenuCategory> {
    const existing = await MenuCategoryModel.findById(categoryId);
    if (!existing) {
      throw new AppError("Category not found", 404);
    }

    // Validate parent category if being changed
    if (data.parent_category_id !== undefined && data.parent_category_id !== existing.parent_category_id) {
      if (data.parent_category_id) {
        const parent = await MenuCategoryModel.findById(data.parent_category_id);
        if (!parent) {
          throw new AppError("Parent category not found", 404);
        }
        if (parent.restaurant_id !== existing.restaurant_id) {
          throw new AppError("Parent category must belong to the same restaurant", 400);
        }
        // Prevent circular reference
        if (data.parent_category_id === categoryId) {
          throw new AppError("Category cannot be its own parent", 400);
        }
        // Check for circular reference in hierarchy
        let current = parent;
        while (current.parent_category_id) {
          if (current.parent_category_id === categoryId) {
            throw new AppError("Circular reference detected in category hierarchy", 400);
          }
          const next = await MenuCategoryModel.findById(current.parent_category_id);
          if (!next) break;
          current = next;
        }
      }
    }

    const updated = await MenuCategoryModel.update(categoryId, data);
    if (!updated) {
      throw new AppError("Failed to update category", 500);
    }
    return updated;
  }

  // Delete category
  static async deleteCategory(categoryId: string): Promise<void> {
    const category = await MenuCategoryModel.findById(categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    await MenuCategoryModel.delete(categoryId);
  }
}
