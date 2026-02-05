import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiResponse } from "@/types";

export interface AuthRequest extends Request {
  user?: {
    user_id: string;
    email?: string;
    phone?: string;
    role?: "customer" | "restaurant_owner" | "admin";
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const response: ApiResponse = {
        success: false,
        error: "No token provided",
      };
      res.status(401).json(response);
      return;
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET not configured");
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      phone: decoded.phone,
      role: decoded.role,
    };

    next();
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Invalid or expired token",
    };
    res.status(401).json(response);
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;

      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as any;
        req.user = {
          user_id: decoded.user_id,
          email: decoded.email,
          phone: decoded.phone,
          role: decoded.role,
        };
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
};
