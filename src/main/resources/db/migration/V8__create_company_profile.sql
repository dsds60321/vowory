CREATE TABLE IF NOT EXISTS company_profile (
    id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    app_theme_key VARCHAR(40) NOT NULL DEFAULT 'gh',
    invitation_theme_background_color VARCHAR(20) NOT NULL DEFAULT '#fdf8f5',
    invitation_theme_text_color VARCHAR(20) NOT NULL DEFAULT '#4a2c2a',
    invitation_theme_accent_color VARCHAR(20) NOT NULL DEFAULT '#803b2a',
    invitation_theme_pattern VARCHAR(40) NOT NULL DEFAULT 'none',
    invitation_theme_effect_type VARCHAR(40) NOT NULL DEFAULT 'none',
    invitation_theme_font_family VARCHAR(160) NOT NULL DEFAULT '''Noto Sans KR'', sans-serif',
    invitation_theme_font_size INT NOT NULL DEFAULT 16,
    invitation_theme_scroll_reveal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_company_profile_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO company_profile (
    code,
    name,
    app_theme_key,
    invitation_theme_background_color,
    invitation_theme_text_color,
    invitation_theme_accent_color,
    invitation_theme_pattern,
    invitation_theme_effect_type,
    invitation_theme_font_family,
    invitation_theme_font_size,
    invitation_theme_scroll_reveal,
    created_at,
    updated_at
)
SELECT
    'default',
    'Wedding Letter',
    'gh',
    '#fdf8f5',
    '#4a2c2a',
    '#803b2a',
    'none',
    'none',
    '''Noto Sans KR'', sans-serif',
    16,
    FALSE,
    NOW(6),
    NOW(6)
WHERE NOT EXISTS (
    SELECT 1
    FROM company_profile
    WHERE code = 'default'
);
