/**
 * MongoDB Helper Utilities
 * 
 * This file provides helper functions for MongoDB operations.
 * For MCP-based queries, use Cursor's MCP MongoDB server.
 */

import { isMongoDBConnected } from "@/config/database";
import { OrderHistoryModel } from "@/models/mongodb/order-history.model";
import { AuditLogModel } from "@/models/mongodb/audit-log.model";
import { SystemLogModel } from "@/models/mongodb/system-log.model";
import { logger } from "@/config/logger";

export class MongoDBHelper {
  /**
   * Check if MongoDB is available
   */
  static isAvailable(): boolean {
    return isMongoDBConnected();
  }

  /**
   * Get order history statistics
   */
  static async getOrderHistoryStats(userId?: string, restaurantId?: string) {
    if (!this.isAvailable()) {
      throw new Error("MongoDB not connected");
    }

    try {
      const match: any = {};
      if (userId) match.user_id = userId;
      if (restaurantId) match.restaurant_id = restaurantId;

      const stats = await OrderHistoryModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$order_data.order_status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$order_data.total_amount" },
          },
        },
      ]);

      const totalOrders = await OrderHistoryModel.countDocuments(match);
      const recentOrders = await OrderHistoryModel.find(match)
        .sort({ created_at: -1 })
        .limit(10)
        .lean();

      return {
        totalOrders,
        statusBreakdown: stats,
        recentOrders: recentOrders.length,
      };
    } catch (error) {
      logger.error("Error getting order history stats", error);
      throw error;
    }
  }

  /**
   * Get audit log summary
   */
  static async getAuditLogSummary(limit: number = 100) {
    if (!this.isAvailable()) {
      throw new Error("MongoDB not connected");
    }

    try {
      const logs = await AuditLogModel.find()
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      const actionCounts = await AuditLogModel.aggregate([
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return {
        recentLogs: logs,
        actionCounts,
      };
    } catch (error) {
      logger.error("Error getting audit log summary", error);
      throw error;
    }
  }

  /**
   * Get system log summary by level
   */
  static async getSystemLogSummary(level?: "info" | "warn" | "error" | "debug") {
    if (!this.isAvailable()) {
      throw new Error("MongoDB not connected");
    }

    try {
      const match: any = {};
      if (level) match.level = level;

      const logs = await SystemLogModel.find(match)
        .sort({ created_at: -1 })
        .limit(100)
        .lean();

      const levelCounts = await SystemLogModel.aggregate([
        {
          $group: {
            _id: "$level",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return {
        logs,
        levelCounts,
      };
    } catch (error) {
      logger.error("Error getting system log summary", error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats() {
    if (!this.isAvailable()) {
      return {
        connected: false,
        message: "MongoDB not connected",
      };
    }

    try {
      const [orderHistoryCount, auditLogCount, systemLogCount] = await Promise.all([
        OrderHistoryModel.countDocuments(),
        AuditLogModel.countDocuments(),
        SystemLogModel.countDocuments(),
      ]);

      return {
        connected: true,
        collections: {
          order_history: orderHistoryCount,
          audit_logs: auditLogCount,
          system_logs: systemLogCount,
        },
      };
    } catch (error) {
      logger.error("Error getting database stats", error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

