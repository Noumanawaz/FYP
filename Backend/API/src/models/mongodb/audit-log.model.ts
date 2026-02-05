import mongoose, { Schema, Document } from "mongoose";
import { AuditLog } from "@/types";

export interface IAuditLog extends Document {
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  changes: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    entity_type: { type: String, required: true, index: true },
    entity_id: { type: String, required: true, index: true },
    user_id: { type: String, index: true },
    changes: { type: Schema.Types.Mixed, required: true },
    ip_address: { type: String },
    user_agent: { type: String },
    created_at: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    collection: "audit_logs",
  }
);

// Compound indexes for common queries
AuditLogSchema.index({ entity_type: 1, entity_id: 1 });
AuditLogSchema.index({ user_id: 1, created_at: -1 });
AuditLogSchema.index({ action: 1, created_at: -1 });

export const AuditLogModel = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
