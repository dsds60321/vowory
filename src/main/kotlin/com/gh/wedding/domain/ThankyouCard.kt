package com.gh.wedding.domain

import jakarta.persistence.Column
import jakarta.persistence.Convert
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
    name = "thankyou_card",
    indexes = [
        Index(name = "idx_thankyou_card_slug", columnList = "slug", unique = true),
        Index(name = "idx_thankyou_card_user_created", columnList = "user_id,created_at"),
    ],
)
class ThankyouCard(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(unique = true)
    var slug: String? = null,

    @Column(nullable = false)
    var ownerToken: String = "",

    @Column(name = "user_id")
    var userId: String? = null,

    @Column(name = "theme_id", nullable = false, length = 64)
    var themeId: String = "classic-thankyou",

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: ThankyouStatus = ThankyouStatus.DRAFT,

    @Convert(converter = ThankyouContentConverter::class)
    @Column(columnDefinition = "TEXT")
    var content: ThankyouContent = ThankyouContent(),

    @Column(name = "published_at")
    var publishedAt: LocalDateTime? = null,

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
