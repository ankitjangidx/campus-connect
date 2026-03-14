const { DataTypes } = require("sequelize");

function defineMessage(sequelize) {
  return sequelize.define(
    "Message",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      senderId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "sender_id"
      },
      recipientId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "recipient_id"
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "read_at"
      }
    },
    {
      tableName: "messages",
      createdAt: "created_at",
      updatedAt: false
    }
  );
}

module.exports = defineMessage;
