import AuditLog from "../models/AuditLog.js";

export function audit(actor, action, resourceType, resourceId, details = "") {
  return AuditLog.create({ actor: actor?._id || actor || null, action, resourceType, resourceId: resourceId?.toString() || "", details });
}
