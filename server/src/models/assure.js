import { DataTypes, Model } from "sequelize";
export class Assure extends Model {}
export function initAssure(sequelize) {
  Assure.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      reference: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(160), allowNull: false },
      email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
      phone: { type: DataTypes.STRING(40), allowNull: false },
      address: { type: DataTypes.STRING(255), allowNull: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      sequelize,
      modelName: "Assure",
      tableName: "insureds",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    },
  );
  return Assure;
}
