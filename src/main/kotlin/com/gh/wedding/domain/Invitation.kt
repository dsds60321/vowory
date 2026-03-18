package com.gh.wedding.domain

import jakarta.persistence.Column
import jakarta.persistence.Convert
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToOne
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(
    indexes = [
        Index(name = "idx_invitation_slug", columnList = "slug", unique = true),
        Index(name = "idx_invitation_user_created", columnList = "userId,createdAt"),
    ],
)
class Invitation(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(unique = true)
    var slug: String? = null,

    @Column(nullable = false)
    var ownerToken: String = "",

    var userId: String? = null,

    @Convert(converter = InvitationContentConverter::class)
    @Column(columnDefinition = "TEXT")
    var content: InvitationContent = InvitationContent(),

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "published_version_id")
    var publishedVersion: InvitationPublication? = null,

    var createdAt: LocalDateTime? = null,
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
