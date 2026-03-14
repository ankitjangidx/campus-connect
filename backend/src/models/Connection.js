const { DataTypes } = require("sequelize");

function defineConnection(sequelize) {
  return sequelize.define(
    "Connection",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      userOneId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "user_one_id"
      },
      userTwoId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "user_two_id"
      },
      status: {
        type: DataTypes.ENUM("pending", "accepted"),
        allowNull: false,
        defaultValue: "accepted"
      },
      requestedById: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "requested_by_id"
      },
      acceptedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "accepted_at"
      }
    },
    {
      tableName: "connections",
      createdAt: "created_at",
      updatedAt: false
    }
  );
}

module.exports = defineConnection;
