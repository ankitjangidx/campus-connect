const { DataTypes } = require("sequelize");

function defineQuestionComment(sequelize) {
  return sequelize.define(
    "QuestionComment",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      questionId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "question_id"
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "user_id"
      },
      parentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "parent_id"
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      editedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "edited_at"
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    },
    {
      tableName: "question_comments",
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
}

module.exports = defineQuestionComment;
