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
import java.time.LocalDateTime

@Entity
@Table(
    name = "company_profile",
    indexes = [
        Index(name = "idx_company_profile_code", columnList = "code", unique = true),
    ],
)
class CompanyProfile(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false, unique = true, length = 64)
    var code: String = "default",

    @Column(nullable = false, length = 120)
    var name: String = "Wedding Letter",

    @Column(nullable = false, length = 40)
    var appThemeKey: String = "gh",

    @Column(nullable = false, length = 20)
    var invitationThemeBackgroundColor: String = "#fdf8f5",

    @Column(nullable = false, length = 20)
    var invitationThemeTextColor: String = "#4a2c2a",

    @Column(nullable = false, length = 20)
    var invitationThemeAccentColor: String = "#803b2a",

    @Column(nullable = false, length = 40)
    var invitationThemePattern: String = "none",

    @Column(nullable = false, length = 40)
    var invitationThemeEffectType: String = "none",

    @Column(nullable = false, length = 160)
    var invitationThemeFontFamily: String = "'Noto Sans KR', sans-serif",

    @Column(nullable = false)
    var invitationThemeFontSize: Int = 16,

    @Column(nullable = false)
    var invitationThemeScrollReveal: Boolean = false,

    @Column(nullable = false)
    var createdAt: LocalDateTime? = null,

    @Column(nullable = false)
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
