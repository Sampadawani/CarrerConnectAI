import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true, maxlength: 120 },
    resourceType: { type: String, maxlength: 80 },
    resourceId: { type: String, maxlength: 80 },
    details: { type: String, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
