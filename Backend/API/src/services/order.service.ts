import { OrderModel } from "@/models/postgres/orders.model";
import { OrderHistoryModel } from "@/models/mongodb/order-history.model";
import { CreateOrderDto, Order, OrderStatusChange } from "@/types";
import { AppError } from "@/middleware/error-handler";
import { logger } from "@/config/logger";
import { isMongoDBConnected } from "@/config/database";

export class OrderService {
  static async createOrder(data: CreateOrderDto, userId?: string) {
    const orderData = { ...data, user_id: userId || null };
    const order = await OrderModel.create(orderData);

    // Save to MongoDB for history (if connected)
    if (isMongoDBConnected()) {
      try {
        const restaurant = await import("@/models/postgres/restaurants.model").then((m) => m.RestaurantModel.findById(data.restaurant_id));
        const restaurantName = restaurant?.name || "Unknown";

        await OrderHistoryModel.create({
          order_id: order.order_id,
          user_id: userId || null,
          restaurant_id: data.restaurant_id,
          restaurant_name: restaurantName,
          order_data: order,
          status_changes: [
            {
              status: "pending",
              changed_at: new Date(),
            },
          ],
        });
      } catch (error) {
        logger.error("Failed to save order history", error);
      }
    }

    return order;
  }

  static async getOrderById(orderId: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    return order;
  }

  static async getUserOrders(userId: string, pagination?: { page?: number; limit?: number }) {
    const result = await OrderModel.findAll({ user_id: userId }, pagination);
    return result;
  }

  static async updateOrderStatus(orderId: string, status: Order["order_status"], changedBy?: string) {
    const order = await OrderModel.updateStatus(orderId, status);
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    // Update MongoDB history (if connected)
    if (isMongoDBConnected()) {
      try {
        const history = await OrderHistoryModel.findOne({ order_id: orderId });
        if (history) {
          const statusChange: OrderStatusChange = {
            status,
            changed_at: new Date(),
            changed_by: changedBy,
          };
          history.status_changes.push(statusChange);
          history.order_data = order;
          await history.save();
        }
      } catch (error) {
        logger.error("Failed to update order history", error);
      }
    }

    return order;
  }

  static async getOrderHistory(userId: string, pagination?: { page?: number; limit?: number }) {
    if (!isMongoDBConnected()) {
      throw new AppError("MongoDB not available. Order history requires MongoDB connection.", 503);
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([OrderHistoryModel.find({ user_id: userId }).sort({ created_at: -1 }).skip(skip).limit(limit).lean(), OrderHistoryModel.countDocuments({ user_id: userId })]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getRestaurantOrderHistory(restaurantId: string, pagination?: { page?: number; limit?: number }) {
    if (!isMongoDBConnected()) {
      throw new AppError("MongoDB not available. Order history requires MongoDB connection.", 503);
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([OrderHistoryModel.find({ restaurant_id: restaurantId }).sort({ created_at: -1 }).skip(skip).limit(limit).lean(), OrderHistoryModel.countDocuments({ restaurant_id: restaurantId })]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getRestaurantOrderHistory(restaurantId: string, pagination?: { page?: number; limit?: number }) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([OrderHistoryModel.find({ restaurant_id: restaurantId }).sort({ created_at: -1 }).skip(skip).limit(limit).lean(), OrderHistoryModel.countDocuments({ restaurant_id: restaurantId })]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getOrderItems(orderId: string) {
    return await OrderModel.getOrderItems(orderId);
  }
}
