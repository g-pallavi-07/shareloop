CREATE TABLE IF NOT EXISTS EmailOTPs (
  email VARCHAR(190) NOT NULL,
  otp_code CHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (email),
  KEY idx_email_otps_expires (expires_at)
) ENGINE=InnoDB;
