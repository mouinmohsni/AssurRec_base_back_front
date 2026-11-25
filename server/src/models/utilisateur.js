import { DataTypes, Model } from "sequelize";
export class Utilisateur extends Model {}
export function initUtilisateur(sequelize) {
  Utilisateur.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(160), allowNull: false },
      email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash",
      },
      role: { type: DataTypes.STRING(20), allowNull: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      sequelize,
      modelName: "Utilisateur",
      tableName: "users",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
      defaultScope: { attributes: { exclude: ["passwordHash"] } },
      scopes: {
        withPassword: {
          attributes: [
            "id",
            "name",
            "email",
            "passwordHash",
            "role",
            "active",
            "createdAt",
          ],
        },
      },
    },
  );
  return Utilisateur;
}
