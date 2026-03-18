package com.gh.wedding.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(
    name = "file_asset",
    indexes = [
        Index(name = "idx_file_asset_owner_status", columnList = "owner_type,owner_id,status"),
        Index(name = "idx_file_asset_status_purge_after", columnList = "status,purge_after"),
    ],
)
class FileAsset(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "owner_type", nullable = false, length = 20)
    var ownerType: FileAssetOwnerType,

    @Column(name = "owner_id", nullable = false)
    var ownerId: Long,

    @Column(name = "user_id")
    var userId: String? = null,

    @Column(name = "storage_path", nullable = false, length = 1024)
    var storagePath: String,

    @Column(name = "public_url", nullable = false, length = 2048)
    var publicUrl: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: FileAssetStatus = FileAssetStatus.ACTIVE,

    @Column(name = "delete_requested_at")
    var deleteRequestedAt: LocalDateTime? = null,

    @Column(name = "purge_after")
    var purgeAfter: LocalDateTime? = null,

    @Column(name = "deleted_at")
    var deletedAt: LocalDateTime? = null,

    @Column(name = "last_error", length = 2000)
    var lastError: String? = null,

    @Column(name = "created_at")
    var createdAt: LocalDateTime? = null,

    @Column(name = "updated_at")
    var updatedAt: LocalDateTime? = null,
) {
    @PrePersist
    fun onCreate() {
        val now = LocalDateTime.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun onUpdate() {
        updatedAt = LocalDateTime.now()
    }
}
