import { DataTypes, Model } from "sequelize";
export class AuditEvent extends Model {}
export function initAuditEvent(sequelize) {
  AuditEvent.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      actorId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "actor_id",
      },
      actorRole: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: "actor_role",
      },
      action: { type: DataTypes.STRING(100), allowNull: false },
      entityType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "entity_type",
      },
      entityId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "entity_id",
      },
      details: { type: DataTypes.TEXT, allowNull: false },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      sequelize,
      modelName: "AuditEvent",
      tableName: "audit_events",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    },
  );
  return AuditEvent;
}
