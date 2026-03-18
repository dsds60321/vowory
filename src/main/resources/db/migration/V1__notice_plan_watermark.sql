CREATE TABLE IF NOT EXISTS notice (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    start_at DATETIME(6) NOT NULL,
    end_at DATETIME(6) NULL,
    is_banner BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL,
    created_by VARCHAR(191) NOT NULL,
    updated_by VARCHAR(191) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_notice_status_start_end (status, start_at, end_at),
    KEY idx_notice_banner (is_banner, start_at),
    KEY idx_notice_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS plan (
    id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'KRW',
    invitation_create_limit INT NOT NULL DEFAULT 0,
    invitation_edit_limit INT NOT NULL DEFAULT 0,
    invitation_publish_limit INT NOT NULL DEFAULT 0,
    watermark_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_plan_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS user_subscription (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(191) NOT NULL,
    plan_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at DATETIME(6) NOT NULL,
    ended_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_user_subscription_plan FOREIGN KEY (plan_id) REFERENCES plan (id),
    KEY idx_user_subscription_user_status (user_id, status),
    KEY idx_user_subscription_started_at (started_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS user_usage (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(191) NOT NULL,
    period CHAR(6) NOT NULL,
    created_count INT NOT NULL DEFAULT 0,
    edit_count INT NOT NULL DEFAULT 0,
    publish_count INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_usage_user_period (user_id, period),
    KEY idx_user_usage_period (period)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

ALTER TABLE invitation_publication
    ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS watermark_text VARCHAR(255) NULL;

INSERT INTO plan (
    code,
    name,
    price,
    currency,
    invitation_create_limit,
    invitation_edit_limit,
    invitation_publish_limit,
    watermark_enabled,
    is_active,
    created_at,
    updated_at
)
SELECT
    'FREE',
    '무료 플랜',
    0,
    'KRW',
    30,
    200,
    30,
    TRUE,
    TRUE,
    NOW(6),
    NOW(6)
WHERE NOT EXISTS (
    SELECT 1
    FROM plan
    WHERE code = 'FREE'
);
