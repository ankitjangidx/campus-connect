const { Sequelize } = require("sequelize");
require("dotenv").config();


const sequelize = new Sequelize(
  process.env.DB_NAME || "campus_connect",
  process.env.DB_USER || "campus_user",
  process.env.DB_PASSWORD || "campus_password",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    dialect: "mysql",
    logging: false
  }
);

async function addColumnIfNotExists(tableName, columnName, definition) {
  const [results] = await sequelize.query(`
    SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'
  `);

  if (results.length === 0) {
    console.log(`Adding column ${columnName} to ${tableName}...`);
    await sequelize.query(`
      ALTER TABLE ${tableName}
      ADD COLUMN ${columnName} ${definition}
    `);
  }
}

async function testConnection() {
  await sequelize.authenticate();

  // Patch existing tables if they were created with old schema
  await addColumnIfNotExists("messages", "read_at", "DATETIME NULL");
  await addColumnIfNotExists("question_comments", "edited_at", "DATETIME NULL");
  await addColumnIfNotExists("question_comments", "deleted_at", "DATETIME NULL");

  // Notifications table
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      actor_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      question_id INT NULL,
      comment_id INT NULL,
      peer_user_id INT NULL,
      read_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_notifications_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      CONSTRAINT fk_notifications_comment FOREIGN KEY (comment_id) REFERENCES question_comments(id) ON DELETE CASCADE,
      CONSTRAINT fk_notifications_peer FOREIGN KEY (peer_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

module.exports = {
  sequelize,
  testConnection
};
