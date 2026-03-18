package com.gh.wedding.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime

@Entity
@Table(
    name = "user_usage",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_user_usage_user_period", columnNames = ["user_id", "period"]),
    ],
    indexes = [
        Index(name = "idx_user_usage_period", columnList = "period"),
    ],
)
class UserUsage(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "user_id", nullable = false, length = 191)
    var userId: String = "",

    @Column(name = "period", nullable = false, length = 6)
    var period: String = "",

    @Column(name = "created_count", nullable = false)
    var createdCount: Int = 0,

    @Column(name = "edit_count", nullable = false)
    var editCount: Int = 0,

    @Column(name = "publish_count", nullable = false)
    var publishCount: Int = 0,

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
