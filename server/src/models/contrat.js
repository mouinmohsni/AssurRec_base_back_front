import { DataTypes, Model } from "sequelize";
export class Contrat extends Model {}
export function initContrat(sequelize) {
  Contrat.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      reference: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      insuredId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "insured_id",
      },
      insuranceType: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: "insurance_type",
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "start_date",
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "end_date",
      },
      status: { type: DataTypes.STRING(20), allowNull: false },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      sequelize,
      modelName: "Contrat",
      tableName: "contracts",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    },
  );
  return Contrat;
}
