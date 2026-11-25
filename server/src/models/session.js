import { DataTypes, Model } from "sequelize";
export class Session extends Model {}
export function initSession(sequelize) {
  Session.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "user_id",
      },
      tokenHash: {
        type: DataTypes.CHAR(64),
        allowNull: false,
        unique: true,
        field: "token_hash",
      },
      csrfTokenHash: {
        type: DataTypes.CHAR(64),
        allowNull: false,
        field: "csrf_token_hash",
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "expires_at",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      sequelize,
      modelName: "Session",
      tableName: "sessions",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    },
  );
  return Session;
}
