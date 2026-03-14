const { DataTypes } = require("sequelize");

function defineMentorship(sequelize) {
  return sequelize.define(
    "Mentorship",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      mentorId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "mentor_id"
      },
      menteeName: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: "mentee_name"
      },
      focusArea: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: "focus_area"
      },
      startedAt: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "started_at"
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      sourceQuestionId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "source_question_id"
      },
      sourceCommentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: "source_comment_id"
      }
    },
    {
      tableName: "mentorships",
      createdAt: false,
      updatedAt: false
    }
  );
}

module.exports = defineMentorship;
