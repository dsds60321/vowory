package com.gh.wedding.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(
    name = "app_user",
    indexes = [
        Index(name = "idx_app_user_email", columnList = "email"),
        Index(name = "idx_app_user_name", columnList = "name"),
    ],
)
class UserAccount(
    @Id
    @Column(length = 191)
    var id: String = "",

    @Column(length = 120)
    var name: String? = null,

    @Column(length = 191)
    var email: String? = null,

    @Column(length = 40)
    var provider: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var role: UserRole = UserRole.USER,

    var isActive: Boolean = true,

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
