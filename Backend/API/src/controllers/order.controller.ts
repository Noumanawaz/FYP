import { Request, Response, NextFunction } from "express";
import { OrderService } from "@/services/order.service";
import { ApiResponse } from "@/types";
import { AuthRequest } from "@/middleware/auth";

export class OrderController {
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.createOrder(req.body, req.user?.user_id);
      const response: ApiResponse = {
        success: true,
        data: order,
        message: "Order created successfully",
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.getOrderById(req.params.id);
      const response: ApiResponse = {
        success: true,
        data: order,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getMyOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.user_id) {
        const response: ApiResponse = {
          success: false,
          error: "Authentication required",
        };
        return res.status(401).json(response);
      }

      const result = await OrderService.getUserOrders(req.user.user_id, req.query as any);
      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getOrderHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.user_id) {
        const response: ApiResponse = {
          success: false,
          error: "Authentication required",
        };
        return res.status(401).json(response);
      }

      const result = await OrderService.getOrderHistory(req.user.user_id, req.query as any);
      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getRestaurantOrderHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurantId } = req.params;
      const result = await OrderService.getRestaurantOrderHistory(restaurantId, req.query as any);
      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      if (!status) {
        const response: ApiResponse = {
          success: false,
          error: "Status is required",
        };
        return res.status(400).json(response);
      }

      const order = await OrderService.updateOrderStatus(req.params.id, status, (req as AuthRequest).user?.user_id);
      const response: ApiResponse = {
        success: true,
        data: order,
        message: "Order status updated successfully",
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getOrderItems(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await OrderService.getOrderItems(req.params.id);
      const response: ApiResponse = {
        success: true,
        data: items,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}
