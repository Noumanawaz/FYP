import mongoose, { Schema, Document } from "mongoose";
import { OrderHistory, OrderStatusChange } from "@/types";

export interface IOrderHistory extends Document {
  order_id: string;
  user_id: string | null;
  restaurant_id: string;
  restaurant_name: string;
  order_data: any;
  status_changes: OrderStatusChange[];
  created_at: Date;
  updated_at: Date;
}

const OrderStatusChangeSchema = new Schema<OrderStatusChange>(
  {
    status: { type: String, required: true },
    changed_at: { type: Date, required: true, default: Date.now },
    changed_by: { type: String },
    notes: { type: String },
  },
  { _id: false }
);

const OrderHistorySchema = new Schema<IOrderHistory>(
  {
    order_id: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, index: true },
    restaurant_id: { type: String, required: true, index: true },
    restaurant_name: { type: String, required: true },
    order_data: { type: Schema.Types.Mixed, required: true },
    status_changes: { type: [OrderStatusChangeSchema], default: [] },
    created_at: { type: Date, default: Date.now, index: true },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "order_history",
  }
);

// Indexes for common queries
OrderHistorySchema.index({ user_id: 1, created_at: -1 });
OrderHistorySchema.index({ restaurant_id: 1, created_at: -1 });
OrderHistorySchema.index({ "order_data.order_status": 1 });

export const OrderHistoryModel = mongoose.model<IOrderHistory>("OrderHistory", OrderHistorySchema);
