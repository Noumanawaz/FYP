import { Request, Response, NextFunction } from "express";
import { MenuService } from "@/services/menu.service";
import { ApiResponse } from "@/types";

export class MenuController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MenuService.getAllMenuItems(req.query as any);
      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await MenuService.getMenuItemById(req.params.id);
      const response: ApiResponse = {
        success: true,
        data: item,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getRestaurantMenu(req: Request, res: Response, next: NextFunction) {
    try {
      const menu = await MenuService.getRestaurantMenu(req.params.restaurantId);
      const response: ApiResponse = {
        success: true,
        data: menu,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, restaurant_id } = req.query;
      if (!q || typeof q !== "string") {
        const response: ApiResponse = {
          success: false,
          error: "Search query is required",
        };
        return res.status(400).json(response);
      }

      const items = await MenuService.searchMenuItems(q, restaurant_id as string | undefined);
      const response: ApiResponse = {
        success: true,
        data: items,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await MenuService.createMenuItem(req.body);
      const response: ApiResponse = {
        success: true,
        data: item,
        message: "Menu item created successfully",
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await MenuService.updateMenuItem(req.params.id, req.body);
      const response: ApiResponse = {
        success: true,
        data: item,
        message: "Menu item updated successfully",
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await MenuService.deleteMenuItem(req.params.id);
      const response: ApiResponse = {
        success: true,
        message: "Menu item deleted successfully",
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}
