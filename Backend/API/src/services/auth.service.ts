import jwt from "jsonwebtoken";
import { UserModel } from "@/models/postgres/users.model";
import { UserRole } from "@/middleware/rbac";
import { AppError } from "@/middleware/error-handler";

export interface JWTPayload {
  user_id: string;
  email?: string;
  phone?: string;
  role: UserRole;
}

export class AuthService {
  /**
   * Generate JWT token for user
   */
  static async generateToken(userId: string): Promise<string> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError("JWT_SECRET not configured", 500);
    }

    const payload: JWTPayload = {
      user_id: user.user_id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role as UserRole,
    };

    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    return jwt.sign(payload, jwtSecret, { expiresIn });
  }

  /**
   * Verify JWT token and return payload
   */
  static verifyToken(token: string): JWTPayload {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError("JWT_SECRET not configured", 500);
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      throw new AppError("Invalid or expired token", 401);
    }
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string): string {
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtRefreshSecret) {
      throw new AppError("JWT_REFRESH_SECRET not configured", 500);
    }

    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

    return jwt.sign({ user_id: userId }, jwtRefreshSecret, { expiresIn });
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): { user_id: string } {
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtRefreshSecret) {
      throw new AppError("JWT_REFRESH_SECRET not configured", 500);
    }

    try {
      const decoded = jwt.verify(token, jwtRefreshSecret) as { user_id: string };
      return decoded;
    } catch (error) {
      throw new AppError("Invalid or expired refresh token", 401);
    }
  }
}

