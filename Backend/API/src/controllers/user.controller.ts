import { Request, Response, NextFunction } from "express";
import { UserService } from "@/services/user.service";
import { ApiResponse } from "@/types";
import { AuthRequest } from "@/middleware/auth";
import { AppError } from "@/middleware/error-handler";

export class UserController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await UserService.getAllUsers();
      const response: ApiResponse = {
        success: true,
        data: users,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      const userId = req.params.id;
      
      const user = await UserService.getUserById(userId);
      
      // Users can view their own profile, admins can view any profile
      if (authReq.user?.user_id !== userId && authReq.user?.role !== "admin") {
        // Return limited info for other users
        const limitedUser = {
          user_id: user.user_id,
          name: user.name,
          // Don't expose email, phone, addresses to other users
        };
        const response: ApiResponse = {
          success: true,
          data: limitedUser,
        };
        return res.json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: user,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.createUser(req.body);
      const response: ApiResponse = {
        success: true,
        data: user,
        message: "User created successfully",
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      const userId = req.params.id;
      
      // Check if user is updating their own profile or is admin
      if (authReq.user?.user_id !== userId && authReq.user?.role !== "admin") {
        const response: ApiResponse = {
          success: false,
          error: "You can only update your own profile or must be an admin",
        };
        return res.status(403).json(response);
      }

      // Only admins can change roles
      if (req.body.role && authReq.user?.role !== "admin") {
        const response: ApiResponse = {
          success: false,
          error: "Only admins can change user roles",
        };
        return res.status(403).json(response);
      }

      const user = await UserService.updateUser(userId, req.body);
      const response: ApiResponse = {
        success: true,
        data: user,
        message: "User updated successfully",
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await UserService.deleteUser(req.params.id);
      const response: ApiResponse = {
        success: true,
        message: "User deleted successfully",
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

