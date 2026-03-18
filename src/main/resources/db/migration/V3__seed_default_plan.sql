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
VALUES (
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
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    price = VALUES(price),
    currency = VALUES(currency),
    invitation_create_limit = VALUES(invitation_create_limit),
    invitation_edit_limit = VALUES(invitation_edit_limit),
    invitation_publish_limit = VALUES(invitation_publish_limit),
    watermark_enabled = VALUES(watermark_enabled),
    is_active = TRUE,
    updated_at = NOW(6);
