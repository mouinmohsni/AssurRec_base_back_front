import { DataTypes, Model } from "sequelize";
export class Paiement extends Model {}
export function initPaiement(sequelize) {
  Paiement.init(
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
      caseId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "case_id",
      },
      amountMilli: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "amount_milli",
      },
      paidAt: { type: DataTypes.DATEONLY, allowNull: false, field: "paid_at" },
      method: { type: DataTypes.STRING(20), allowNull: false },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "valide",
      },
      recordedBy: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "recorded_by",
      },
      reversalReason: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "reversal_reason",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      sequelize,
      modelName: "Paiement",
      tableName: "payments",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    },
  );
  return Paiement;
}
