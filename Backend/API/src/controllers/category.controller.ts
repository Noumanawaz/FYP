import { Request, Response, NextFunction } from "express";
import { CategoryService } from "@/services/category.service";
import { ApiResponse } from "@/types";

export class CategoryController {
  // Get all categories
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      const pagination: any = {};

      if (req.query.restaurant_id) {
        filters.restaurant_id = req.query.restaurant_id as string;
      }
      if (req.query.parent_category_id !== undefined) {
        filters.parent_category_id = req.query.parent_category_id === "null" ? null : (req.query.parent_category_id as string);
      }
      if (req.query.is_active !== undefined) {
        filters.is_active = req.query.is_active === "true";
      }
      if (req.query.page) {
        pagination.page = parseInt(req.query.page as string);
      }
      if (req.query.limit) {
        pagination.limit = parseInt(req.query.limit as string);
      }

      const result = await CategoryService.getAllCategories(filters, pagination);
      const response: ApiResponse = {
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: pagination.page || 1,
          limit: pagination.limit || 100,
        },
      };
      
      // Disable caching for this endpoint to prevent stale data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get category by ID
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.getCategoryById(req.params.id);
      const response: ApiResponse = {
        success: true,
        data: category,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get restaurant categories
  static async getRestaurantCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.params.restaurantId;
      const includeInactive = req.query.include_inactive === "true";
      const categories = await CategoryService.getRestaurantCategories(restaurantId, includeInactive);
      const response: ApiResponse = {
        success: true,
        data: categories,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get category tree
  static async getCategoryTree(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.params.restaurantId;
      const tree = await CategoryService.getCategoryTree(restaurantId);
      const response: ApiResponse = {
        success: true,
        data: tree,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get root categories
  static async getRootCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.params.restaurantId;
      const categories = await CategoryService.getRootCategories(restaurantId);
      const response: ApiResponse = {
        success: true,
        data: categories,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get child categories
  static async getChildCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const parentCategoryId = req.params.parentId;
      const categories = await CategoryService.getChildCategories(parentCategoryId);
      const response: ApiResponse = {
        success: true,
        data: categories,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Create category
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.createCategory(req.body);
      const response: ApiResponse = {
        success: true,
        data: category,
        message: "Category created successfully",
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Update category
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.updateCategory(req.params.id, req.body);
      const response: ApiResponse = {
        success: true,
        data: category,
        message: "Category updated successfully",
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Delete category
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await CategoryService.deleteCategory(req.params.id);
      const response: ApiResponse = {
        success: true,
        message: "Category deleted successfully",
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

