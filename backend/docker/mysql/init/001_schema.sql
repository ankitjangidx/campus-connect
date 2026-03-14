USE campus_connect;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  user_identifier VARCHAR(60) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) DEFAULT '',
  last_name VARCHAR(100) DEFAULT '',
  bio TEXT,
  dob DATE NULL,
  gender VARCHAR(40) DEFAULT '',
  phone_number VARCHAR(40) DEFAULT '',
  alternate_phone VARCHAR(40) DEFAULT '',
  course VARCHAR(80) DEFAULT '',
  branch VARCHAR(120) DEFAULT '',
  admission_year INT NULL,
  exam_prep ENUM('yes', 'no') DEFAULT 'no',
  exam_type VARCHAR(100) DEFAULT '',
  other_exam VARCHAR(100) DEFAULT '',
  internships JSON NULL,
  projects JSON NULL,
  work_experiences JSON NULL,
  skills JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_one_id INT NOT NULL,
  user_two_id INT NOT NULL,
  status ENUM('pending', 'accepted') NOT NULL DEFAULT 'accepted',
  requested_by_id INT NOT NULL,
  accepted_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_connections_user_one FOREIGN KEY (user_one_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_connections_user_two FOREIGN KEY (user_two_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_connections_requested_by FOREIGN KEY (requested_by_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_connections_pair UNIQUE (user_one_id, user_two_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  body TEXT NOT NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  resolved TINYINT(1) DEFAULT 0,
  resolved_comment_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_questions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS question_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_id INT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  edited_at DATETIME NULL,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_question_comments_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_question_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_question_comments_parent FOREIGN KEY (parent_id) REFERENCES question_comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mentorships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mentor_id INT NOT NULL,
  mentee_name VARCHAR(120) NOT NULL,
  focus_area VARCHAR(120) NOT NULL,
  started_at DATE NOT NULL,
  notes TEXT,
  source_question_id INT NULL,
  source_comment_id INT NULL,
  CONSTRAINT fk_mentorships_user FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
);

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
);

ALTER TABLE questions
  ADD CONSTRAINT fk_questions_resolved_comment
  FOREIGN KEY (resolved_comment_id) REFERENCES question_comments(id) ON DELETE SET NULL;

ALTER TABLE mentorships
  ADD CONSTRAINT uq_mentorship_source_question UNIQUE (source_question_id);
