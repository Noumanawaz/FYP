import { Router } from "express";
import { MongoDBHelper } from "@/utils/mongodb-helper";
import { ApiResponse } from "@/types";
import { authenticate } from "@/middleware/auth";
import { requireAdmin } from "@/middleware/rbac";
import { Request, Response, NextFunction } from "express";

const router = Router();

// Get MongoDB database statistics (admin only)
router.get("/stats", authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await MongoDBHelper.getDatabaseStats();
    const response: ApiResponse = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get order history statistics
router.get("/order-history/stats", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.user_id;
    const restaurantId = req.query.restaurant_id as string | undefined;

    const stats = await MongoDBHelper.getOrderHistoryStats(userId, restaurantId);
    const response: ApiResponse = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get audit log summary (admin only)
router.get("/audit-logs", authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const summary = await MongoDBHelper.getAuditLogSummary(limit);
    const response: ApiResponse = {
      success: true,
      data: summary,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get system log summary (admin only)
router.get("/system-logs", authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const level = req.query.level as "info" | "warn" | "error" | "debug" | undefined;
    const summary = await MongoDBHelper.getSystemLogSummary(level);
    const response: ApiResponse = {
      success: true,
      data: summary,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;

