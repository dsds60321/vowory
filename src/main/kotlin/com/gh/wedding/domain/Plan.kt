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
import java.math.BigDecimal
import java.time.LocalDateTime

@Entity
@Table(
    name = "plan",
    indexes = [
        Index(name = "uk_plan_code", columnList = "code", unique = true),
    ],
)
class Plan(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "code", nullable = false, length = 64)
    var code: String = "",

    @Column(name = "name", nullable = false, length = 120)
    var name: String = "",

    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    var price: BigDecimal = BigDecimal.ZERO,

    @Column(name = "currency", nullable = false, length = 10)
    var currency: String = "KRW",

    @Column(name = "invitation_create_limit", nullable = false)
    var invitationCreateLimit: Int = 0,

    @Column(name = "invitation_edit_limit", nullable = false)
    var invitationEditLimit: Int = 0,

    @Column(name = "invitation_publish_limit", nullable = false)
    var invitationPublishLimit: Int = 0,

    @Column(name = "watermark_enabled", nullable = false)
    var watermarkEnabled: Boolean = false,

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

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
