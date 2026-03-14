const { DataTypes } = require("sequelize");

function defineQuestion(sequelize) {
  return sequelize.define(
    "Question",
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
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      category: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      resolved: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      resolvedCommentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "resolved_comment_id"
      }
    },
    {
      tableName: "questions",
      createdAt: "created_at",
      updatedAt: false
    }
  );
}

module.exports = defineQuestion;
