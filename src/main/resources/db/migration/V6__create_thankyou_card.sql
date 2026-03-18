CREATE TABLE IF NOT EXISTS thankyou_card (
    id BIGINT NOT NULL AUTO_INCREMENT,
    slug VARCHAR(255) NULL,
    owner_token VARCHAR(255) NOT NULL,
    user_id VARCHAR(191) NULL,
    theme_id VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    content TEXT NOT NULL,
    published_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_thankyou_card_slug (slug),
    KEY idx_thankyou_card_user_created (user_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
