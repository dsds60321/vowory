ALTER TABLE rsvp
    ADD COLUMN IF NOT EXISTS contact VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS meal BOOLEAN NULL,
    ADD COLUMN IF NOT EXISTS bus BOOLEAN NULL;

ALTER TABLE rsvp
    MODIFY COLUMN party_count INT NULL,
    MODIFY COLUMN meal BOOLEAN NULL;

CREATE TABLE IF NOT EXISTS invitation_visit_daily (
    id BIGINT NOT NULL AUTO_INCREMENT,
    invitation_id BIGINT NOT NULL,
    visit_date DATE NOT NULL,
    visit_count BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_invitation_visit_daily_invitation FOREIGN KEY (invitation_id) REFERENCES invitation (id),
    UNIQUE KEY uk_invitation_visit_daily_invitation_date (invitation_id, visit_date),
    KEY idx_invitation_visit_daily_visit_date (visit_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
