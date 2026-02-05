import mongoose, { Schema, Document } from "mongoose";
import { SystemLog } from "@/types";

export interface ISystemLog extends Document {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  context?: Record<string, any>;
  stack?: string;
  created_at: Date;
}

const SystemLogSchema = new Schema<ISystemLog>(
  {
    level: { type: String, required: true, enum: ["info", "warn", "error", "debug"], index: true },
    message: { type: String, required: true },
    context: { type: Schema.Types.Mixed },
    stack: { type: String },
    created_at: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    collection: "system_logs",
  }
);

// Indexes for common queries
SystemLogSchema.index({ level: 1, created_at: -1 });
SystemLogSchema.index({ created_at: -1 });

export const SystemLogModel = mongoose.model<ISystemLog>("SystemLog", SystemLogSchema);
