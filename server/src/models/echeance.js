import { DataTypes, Model } from "sequelize";
export class Echeance extends Model {}
export function initEcheance(sequelize) {
  Echeance.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      reference: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      contractId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "contract_id",
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "due_date",
      },
      amountMilli: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "amount_milli",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      sequelize,
      modelName: "Echeance",
      tableName: "installments",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    },
  );
  return Echeance;
}
