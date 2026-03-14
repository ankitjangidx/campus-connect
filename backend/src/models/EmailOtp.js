const { DataTypes } = require("sequelize");

function defineEmailOtp(sequelize) {
  return sequelize.define(
    "EmailOtp",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      purpose: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      otpHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "otp_hash"
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "expires_at"
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "used_at"
      }
    },
    {
      tableName: "email_otps",
      createdAt: "created_at",
      updatedAt: false
    }
  );
}

module.exports = defineEmailOtp;
