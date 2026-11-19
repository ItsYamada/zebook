-- ZeBook schema for MySQL 8 (InnoDB, utf8mb4). Safe to run more than once.

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per login or guest visit. Enables real logout + guest tracking.
CREATE TABLE IF NOT EXISTS sessions (
  id         CHAR(36) PRIMARY KEY,
  user_id    INT NULL,
  is_guest   TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS books (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(300) NOT NULL,
  author      VARCHAR(200) NOT NULL,
  genre       VARCHAR(80)  NOT NULL,
  description TEXT NULL,
  language    VARCHAR(30) DEFAULT 'English',
  `year`      INT NULL,
  cover_url   TEXT NULL,
  file_url    TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_books_title_author (title, author),
  KEY idx_books_genre (genre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_library (
  user_id     INT NOT NULL,
  book_id     INT NOT NULL,
  is_favorite TINYINT(1) NOT NULL DEFAULT 0,
  added_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, book_id),
  CONSTRAINT fk_lib_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lib_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS downloads (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NULL,
  session_id CHAR(36) NOT NULL,
  book_id    INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_downloads_user (user_id),
  KEY idx_downloads_session (session_id),
  CONSTRAINT fk_dl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dl_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_dl_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Phase 2/3: AI actions that wait for the user's confirmation
CREATE TABLE IF NOT EXISTS pending_actions (
  id         CHAR(36) PRIMARY KEY,
  user_id    INT NOT NULL,
  action     VARCHAR(50) NOT NULL,
  payload    JSON NOT NULL,
  status     VARCHAR(12) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cached full text of books opened in the reader (so reading works even if the online source is down)
CREATE TABLE IF NOT EXISTS book_texts (
  book_id    INT PRIMARY KEY,
  content    LONGTEXT NOT NULL,
  fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bt_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
