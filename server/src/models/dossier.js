import { DataTypes, Model } from "sequelize";
export class Dossier extends Model {}
export function initDossier(sequelize) {
  Dossier.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      reference: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      installmentId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "installment_id",
      },
      agentId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "agent_id",
      },
      status: { type: DataTypes.STRING(30), allowNull: false },
      priority: { type: DataTypes.STRING(20), allowNull: false },
      openedAt: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "opened_at",
      },
      promiseDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "promise_date",
      },
      notes: { type: DataTypes.TEXT, allowNull: false },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      sequelize,
      modelName: "Dossier",
      tableName: "recovery_cases",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    },
  );
  return Dossier;
}
