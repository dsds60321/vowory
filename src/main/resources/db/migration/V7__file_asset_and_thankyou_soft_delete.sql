CREATE TABLE IF NOT EXISTS file_asset (
    id BIGINT NOT NULL AUTO_INCREMENT,
    owner_type VARCHAR(20) NOT NULL,
    owner_id BIGINT NOT NULL,
    user_id VARCHAR(191) NULL,
    storage_path VARCHAR(1024) NOT NULL,
    public_url VARCHAR(2048) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    delete_requested_at DATETIME(6) NULL,
    purge_after DATETIME(6) NULL,
    deleted_at DATETIME(6) NULL,
    last_error VARCHAR(2000) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_file_asset_owner_status (owner_type, owner_id, status),
    KEY idx_file_asset_status_purge_after (status, purge_after)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
