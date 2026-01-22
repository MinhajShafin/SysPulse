import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAlert extends Document {
  type: "CPU" | "RAM" | "DISK" | "NETWORK";
  value: number;
  threshold: number;
  message: string;
  severity: "warning" | "critical";
  acknowledged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ["CPU", "RAM", "DISK", "NETWORK"],
      required: true,
      index: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    threshold: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    severity: {
      type: String,
      enum: ["warning", "critical"],
      required: true,
      default: "warning",
    },
    acknowledged: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "alerts",
  },
);

// Compound index for efficient queries
AlertSchema.index({ type: 1, createdAt: -1 });
AlertSchema.index({ severity: 1, acknowledged: 1 });

// TTL index to auto-delete old acknowledged alerts after 30 days
AlertSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60,
    partialFilterExpression: { acknowledged: true },
  },
);

// Static method to get unacknowledged alerts
AlertSchema.statics.getActiveAlerts = function () {
  return this.find({ acknowledged: false }).sort({ createdAt: -1 });
};

// Static method to get alerts by type
AlertSchema.statics.getByType = function (type: string) {
  return this.find({ type }).sort({ createdAt: -1 }).limit(100);
};

// Instance method to acknowledge alert
AlertSchema.methods.acknowledge = function () {
  this.acknowledged = true;
  return this.save();
};

// Prevent model recompilation in development
const Alert: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>("Alert", AlertSchema);

export default Alert;
