const { DataTypes } = require("sequelize");

function defineNotification(sequelize) {
  return sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "user_id"
      },
      actorId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "actor_id"
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      questionId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "question_id"
      },
      commentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "comment_id"
      },
      peerUserId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "peer_user_id"
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "read_at"
      }
    },
    {
      tableName: "notifications",
      createdAt: "created_at",
      updatedAt: false
    }
  );
}

module.exports = defineNotification;
