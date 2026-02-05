import { sql } from "@/config/database";
import { Order, CreateOrderDto, OrderItem } from "@/types";
import { v4 as uuidv4 } from "uuid";

export class OrderModel {
  static async findAll(filters?: { user_id?: string; restaurant_id?: string; order_status?: string }, pagination?: { page?: number; limit?: number }): Promise<{ orders: Order[]; total: number }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    const queryParams: any[] = [limit, offset];

    if (filters?.user_id) {
      whereConditions.push(`user_id = $${queryParams.length + 1}`);
      queryParams.push(filters.user_id);
    }

    if (filters?.restaurant_id) {
      whereConditions.push(`restaurant_id = $${queryParams.length + 1}`);
      queryParams.push(filters.restaurant_id);
    }

    if (filters?.order_status) {
      whereConditions.push(`order_status = $${queryParams.length + 1}`);
      queryParams.push(filters.order_status);
    }

    // Build query conditionally - Neon doesn't support sql.unsafe
    let countResult;
    let orders;

    if (whereConditions.length === 0) {
      countResult = await sql`
        SELECT COUNT(*) as total FROM orders
      `;
      orders = await sql`
        SELECT *
        FROM orders
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (whereConditions.length === 1 && filters?.user_id) {
      countResult = await sql`
        SELECT COUNT(*) as total FROM orders WHERE user_id = ${filters.user_id}
      `;
      orders = await sql`
        SELECT *
        FROM orders
        WHERE user_id = ${filters.user_id}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (whereConditions.length === 1 && filters?.restaurant_id) {
      countResult = await sql`
        SELECT COUNT(*) as total FROM orders WHERE restaurant_id = ${filters.restaurant_id}
      `;
      orders = await sql`
        SELECT *
        FROM orders
        WHERE restaurant_id = ${filters.restaurant_id}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (whereConditions.length === 1 && filters?.order_status) {
      countResult = await sql`
        SELECT COUNT(*) as total FROM orders WHERE order_status = ${filters.order_status}
      `;
      orders = await sql`
        SELECT *
        FROM orders
        WHERE order_status = ${filters.order_status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Multiple conditions - build query with all conditions
      if (filters?.user_id && filters?.restaurant_id) {
        countResult = await sql`
          SELECT COUNT(*) as total FROM orders 
          WHERE user_id = ${filters.user_id} AND restaurant_id = ${filters.restaurant_id}
        `;
        orders = await sql`
          SELECT *
          FROM orders
          WHERE user_id = ${filters.user_id} AND restaurant_id = ${filters.restaurant_id}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (filters?.user_id && filters?.order_status) {
        countResult = await sql`
          SELECT COUNT(*) as total FROM orders 
          WHERE user_id = ${filters.user_id} AND order_status = ${filters.order_status}
        `;
        orders = await sql`
          SELECT *
          FROM orders
          WHERE user_id = ${filters.user_id} AND order_status = ${filters.order_status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (filters?.restaurant_id && filters?.order_status) {
        countResult = await sql`
          SELECT COUNT(*) as total FROM orders 
          WHERE restaurant_id = ${filters.restaurant_id} AND order_status = ${filters.order_status}
        `;
        orders = await sql`
          SELECT *
          FROM orders
          WHERE restaurant_id = ${filters.restaurant_id} AND order_status = ${filters.order_status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        // All three conditions
        countResult = await sql`
          SELECT COUNT(*) as total FROM orders 
          WHERE user_id = ${filters?.user_id} AND restaurant_id = ${filters?.restaurant_id} AND order_status = ${filters?.order_status}
        `;
        orders = await sql`
          SELECT *
          FROM orders
          WHERE user_id = ${filters?.user_id} AND restaurant_id = ${filters?.restaurant_id} AND order_status = ${filters?.order_status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }
    }

    const total = parseInt(countResult[0]?.total || "0");

    return {
      orders: orders as Order[],
      total,
    };
  }

  static async findById(orderId: string): Promise<Order | null> {
    const result = await sql`
      SELECT *
      FROM orders
      WHERE order_id = ${orderId}
    `;
    return (result[0] as Order) || null;
  }

  static async create(data: CreateOrderDto): Promise<Order> {
    const orderId = uuidv4();
    const subtotal = 0; // Calculate from items
    const taxAmount = subtotal * 0.15; // 15% tax
    const deliveryFee = 100; // Default delivery fee
    const discountAmount = 0;
    const totalAmount = subtotal + taxAmount + deliveryFee - discountAmount;

    const result = await sql`
      INSERT INTO orders (
        order_id,
        user_id,
        restaurant_id,
        location_id,
        order_type,
        order_status,
        items,
        subtotal,
        tax_amount,
        delivery_fee,
        discount_amount,
        total_amount,
        currency,
        delivery_address,
        phone,
        special_instructions,
        voice_transcript,
        created_at,
        updated_at
      ) VALUES (
        ${orderId},
        ${data.user_id || null},
        ${data.restaurant_id},
        ${data.location_id},
        ${data.order_type},
        'pending',
        ${JSON.stringify(data.items)},
        ${subtotal},
        ${taxAmount},
        ${deliveryFee},
        ${discountAmount},
        ${totalAmount},
        'PKR',
        ${data.delivery_address || null},
        ${data.phone},
        ${data.special_instructions || null},
        ${data.voice_transcript || null},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    // Create order items
    for (const item of data.items) {
      await this.createOrderItem(orderId, item);
    }

    return result[0] as Order;
  }

  static async createOrderItem(orderId: string, itemData: any): Promise<OrderItem> {
    const orderItemId = uuidv4();
    // Get menu item price
    const menuItem = await sql`SELECT base_price FROM menu_items WHERE item_id = ${itemData.item_id}`;
    const unitPrice = menuItem[0]?.base_price || 0;
    const subtotal = unitPrice * itemData.quantity;

    const result = await sql`
      INSERT INTO order_items (
        order_item_id,
        order_id,
        menu_item_id,
        quantity,
        unit_price,
        variants_selected,
        special_instructions,
        subtotal,
        created_at,
        updated_at
      ) VALUES (
        ${orderItemId},
        ${orderId},
        ${itemData.item_id},
        ${itemData.quantity},
        ${unitPrice},
        ${JSON.stringify(itemData.variants || {})},
        ${itemData.special_instructions || null},
        ${subtotal},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return result[0] as OrderItem;
  }

  static async updateStatus(orderId: string, status: Order["order_status"]): Promise<Order | null> {
    const result = await sql`
      UPDATE orders
      SET order_status = ${status},
          updated_at = NOW(),
          completed_at = ${status === "delivered" || status === "cancelled" ? sql`NOW()` : sql`completed_at`}
      WHERE order_id = ${orderId}
      RETURNING *
    `;
    return (result[0] as Order) || null;
  }

  static async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const result = await sql`
      SELECT *
      FROM order_items
      WHERE order_id = ${orderId}
      ORDER BY created_at ASC
    `;
    return result as OrderItem[];
  }
}
