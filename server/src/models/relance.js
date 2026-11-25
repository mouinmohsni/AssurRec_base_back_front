import { DataTypes, Model } from "sequelize";
export class Relance extends Model {}
export function initRelance(sequelize) {
  Relance.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      caseId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "case_id",
      },
      channel: { type: DataTypes.STRING(20), allowNull: false },
      subject: { type: DataTypes.STRING(200), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "brouillon",
      },
      scheduledDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "scheduled_date",
      },
      createdBy: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "created_by",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      sequelize,
      modelName: "Relance",
      tableName: "reminders",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    },
  );
  return Relance;
}
