CREATE DATABASE IF NOT EXISTS shareloop_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE shareloop_db;

CREATE TABLE IF NOT EXISTS Users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  college_email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  department VARCHAR(120) NOT NULL,
  college_year VARCHAR(40) NOT NULL,
  phone VARCHAR(32) NULL,
  profile_image_url VARCHAR(500) NULL,
  role ENUM('student','admin') NOT NULL DEFAULT 'student',
  account_status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_college_email (college_email),
  KEY idx_users_status (account_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Categories (
  category_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(80) NOT NULL,
  description VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_categories_name (category_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Listings (
  listing_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  listing_type ENUM('sale','borrow','free') NOT NULL,
  price DECIMAL(10,2) NULL,
  borrow_duration VARCHAR(80) NULL,
  item_condition ENUM('Like New','Good','Fair','Well Used') NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('available','reserved','unavailable','removed') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (listing_id),
  CONSTRAINT fk_listings_seller FOREIGN KEY (seller_id) REFERENCES Users(user_id),
  CONSTRAINT fk_listings_category FOREIGN KEY (category_id) REFERENCES Categories(category_id),
  CONSTRAINT chk_listings_price CHECK (
    (listing_type='sale' AND price IS NOT NULL AND price >= 0) OR
    (listing_type IN ('borrow','free') AND price IS NULL)
  ),
  CONSTRAINT chk_listings_borrow_duration CHECK (
    (listing_type='borrow' AND borrow_duration IS NOT NULL) OR
    (listing_type IN ('sale','free') AND borrow_duration IS NULL)
  ),
  CONSTRAINT chk_listings_quantity CHECK (quantity >= 0),
  KEY idx_listings_category (category_id),
  KEY idx_listings_status (status),
  KEY idx_listings_created (created_at),
  KEY idx_listings_seller (seller_id),
  KEY idx_listings_type_condition (listing_type,item_condition)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ListingImages (
  image_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (image_id),
  CONSTRAINT fk_listing_images_listing FOREIGN KEY (listing_id) REFERENCES Listings(listing_id) ON DELETE CASCADE,
  KEY idx_listing_images_listing (listing_id,is_primary)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Favorites (
  user_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id,listing_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_listing FOREIGN KEY (listing_id) REFERENCES Listings(listing_id) ON DELETE CASCADE,
  KEY idx_favorites_listing (listing_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Orders (
  order_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  buyer_id BIGINT UNSIGNED NOT NULL,
  seller_id BIGINT UNSIGNED NOT NULL,
  transaction_type ENUM('purchase','borrow') NOT NULL,
  status ENUM('pending','accepted','rejected','cancelled','completed','overdue') NOT NULL DEFAULT 'pending',
  order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expected_return_date DATE NULL,
  actual_return_date DATE NULL,
  buyer_note VARCHAR(1000) NULL,
  completed_at TIMESTAMP NULL,
  PRIMARY KEY (order_id),
  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES Users(user_id),
  CONSTRAINT fk_orders_seller FOREIGN KEY (seller_id) REFERENCES Users(user_id),
  CONSTRAINT chk_orders_not_self CHECK (buyer_id <> seller_id),
  CONSTRAINT chk_orders_return_dates CHECK (
    (transaction_type='borrow' AND expected_return_date IS NOT NULL) OR
    (transaction_type='purchase' AND expected_return_date IS NULL AND actual_return_date IS NULL)
  ),
  KEY idx_orders_buyer (buyer_id),
  KEY idx_orders_seller (seller_id),
  KEY idx_orders_status (status),
  KEY idx_orders_date (order_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS OrderItems (
  order_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (order_item_id),
  UNIQUE KEY uq_order_items_order_listing (order_id,listing_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES Orders(order_id),
  CONSTRAINT fk_order_items_listing FOREIGN KEY (listing_id) REFERENCES Listings(listing_id),
  CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
  CONSTRAINT chk_order_items_price CHECK (unit_price >= 0),
  KEY idx_order_items_listing (listing_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Payments (
  payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash','UPI','other') NOT NULL,
  payment_status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  transaction_reference VARCHAR(190) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  PRIMARY KEY (payment_id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES Orders(order_id),
  CONSTRAINT chk_payments_amount CHECK (amount >= 0),
  KEY idx_payments_status (payment_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Reviews (
  review_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  reviewer_id BIGINT UNSIGNED NOT NULL,
  reviewee_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment VARCHAR(2000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (review_id),
  UNIQUE KEY uq_reviews_order_reviewer (order_id,reviewer_id),
  CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES Orders(order_id),
  CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES Users(user_id),
  CONSTRAINT fk_reviews_reviewee FOREIGN KEY (reviewee_id) REFERENCES Users(user_id),
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_reviews_different_users CHECK (reviewer_id <> reviewee_id),
  KEY idx_reviews_reviewee (reviewee_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Reports (
  report_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NULL,
  reported_user_id BIGINT UNSIGNED NULL,
  reason VARCHAR(120) NOT NULL,
  details VARCHAR(2000) NULL,
  status ENUM('open','reviewing','resolved','dismissed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  PRIMARY KEY (report_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES Users(user_id),
  CONSTRAINT fk_reports_listing FOREIGN KEY (listing_id) REFERENCES Listings(listing_id),
  CONSTRAINT fk_reports_user FOREIGN KEY (reported_user_id) REFERENCES Users(user_id),
  CONSTRAINT chk_reports_one_target CHECK ((listing_id IS NULL) <> (reported_user_id IS NULL)),
  KEY idx_reports_status (status),
  KEY idx_reports_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Notifications (
  notification_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  message VARCHAR(500) NOT NULL,
  notification_type VARCHAR(60) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_order FOREIGN KEY (order_id) REFERENCES Orders(order_id),
  KEY idx_notifications_user (user_id,created_at),
  KEY idx_notifications_read (user_id,is_read)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS HandoverRecords (
  handover_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  handover_type ENUM('collection','return') NOT NULL,
  confirmed_by BIGINT UNSIGNED NOT NULL,
  confirmation_status ENUM('pending','confirmed') NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMP NULL,
  notes VARCHAR(1000) NULL,
  PRIMARY KEY (handover_id),
  CONSTRAINT fk_handovers_order FOREIGN KEY (order_id) REFERENCES Orders(order_id),
  CONSTRAINT fk_handovers_user FOREIGN KEY (confirmed_by) REFERENCES Users(user_id),
  KEY idx_handovers_order (order_id)
) ENGINE=InnoDB;
