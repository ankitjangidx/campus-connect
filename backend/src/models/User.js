const { DataTypes } = require("sequelize");

function defineUser(sequelize) {
  return sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      userIdentifier: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
        field: "user_identifier"
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash"
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "",
        field: "first_name"
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "",
        field: "last_name"
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      dob: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      gender: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: ""
      },
      phoneNumber: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: "",
        field: "phone_number"
      },
      alternatePhone: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: "",
        field: "alternate_phone"
      },
      course: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: ""
      },
      branch: {
        type: DataTypes.STRING(120),
        allowNull: false,
        defaultValue: ""
      },
      admissionYear: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "admission_year"
      },
      examPrep: {
        type: DataTypes.ENUM("yes", "no"),
        allowNull: false,
        defaultValue: "no",
        field: "exam_prep"
      },
      examType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "",
        field: "exam_type"
      },
      otherExam: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "",
        field: "other_exam"
      },
      internships: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      projects: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      workExperiences: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        field: "work_experiences"
      },
      skills: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      }
    },
    {
      tableName: "users",
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
}

module.exports = defineUser;
