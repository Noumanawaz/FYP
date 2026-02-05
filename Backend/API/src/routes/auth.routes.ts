import { Router } from "express";
import { body } from "express-validator";
import { validate } from "@/middleware/validation";
import { AuthService } from "@/services/auth.service";
import { UserService } from "@/services/user.service";
import { UserModel } from "@/models/postgres/users.model";
import { ApiResponse, User } from "@/types";
import { Request, Response, NextFunction } from "express";

const router = Router();

// Login endpoint (email/phone based with password)
router.post(
  "/login",
  [
    body("email").optional().isEmail().withMessage("Invalid email format"),
    body("phone").optional().isString(),
    body("password").optional().isString().withMessage("Password must be a string"),
    body("user_id").optional().isUUID().withMessage("Valid user ID required"),
  ],
  validate([]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, phone, password, user_id } = req.body;

      let user: (User & { password_hash?: string }) | null = null;

      // Support both email/phone login and user_id login (for backward compatibility)
      if (user_id) {
        user = await UserService.getUserById(user_id, true) as User & { password_hash?: string };
      } else if (email) {
        user = await UserService.getUserByEmail(email, true); // Include password for verification
      } else if (phone) {
        user = await UserService.getUserByPhone(phone, true); // Include password for verification
      } else {
        const response: ApiResponse = {
          success: false,
          error: "Email, phone, or user_id is required",
        };
        return res.status(400).json(response);
      }

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: "User not found",
        };
        return res.status(404).json(response);
      }

      if (!password) {
        const response: ApiResponse = {
          success: false,
          error: "Password is required",
        };
        return res.status(400).json(response);
      }

      // Always enforce password verification when a password is provided
      if (!user.password_hash) {
        const response: ApiResponse = {
          success: false,
          error: "Password not set for this account. Please reset your password.",
        };
        return res.status(400).json(response);
      }

      const isPasswordValid = await UserModel.verifyPassword(user, password);
      if (!isPasswordValid) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid password",
        };
        return res.status(401).json(response);
      }

      // Generate tokens
      const accessToken = await AuthService.generateToken(user.user_id);
      const refreshToken = AuthService.generateRefreshToken(user.user_id);

      // Remove password_hash from response
      const { password_hash, ...userResponse } = user;

      const response: ApiResponse = {
        success: true,
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          user: {
            user_id: userResponse.user_id,
            name: userResponse.name,
            email: userResponse.email,
            phone: userResponse.phone,
            role: userResponse.role,
          },
        },
        message: "Login successful",
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Refresh token endpoint
router.post(
  "/refresh",
  [
    body("refresh_token").notEmpty().withMessage("Refresh token required"),
  ],
  validate([]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.body;

      // Verify refresh token
      const decoded = AuthService.verifyRefreshToken(refresh_token);

      // Generate new access token
      const accessToken = await AuthService.generateToken(decoded.user_id);

      const response: ApiResponse = {
        success: true,
        data: {
          access_token: accessToken,
        },
        message: "Token refreshed successfully",
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Verify token endpoint
router.post(
  "/verify",
  [
    body("token").notEmpty().withMessage("Token required"),
  ],
  validate([]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      const payload = AuthService.verifyToken(token);

      const response: ApiResponse = {
        success: true,
        data: {
          valid: true,
          user_id: payload.user_id,
          role: payload.role,
        },
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        data: {
          valid: false,
        },
        error: error instanceof Error ? error.message : "Invalid token",
      };
      res.status(401).json(response);
    }
  }
);

export default router;

