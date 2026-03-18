package com.gh.wedding.dto

import com.gh.wedding.domain.UserRole
import java.time.LocalDateTime

data class AdminUserSummaryResponse(
    val userId: String,
    val name: String?,
    val email: String?,
    val role: UserRole,
    val isActive: Boolean,
    val createdAt: LocalDateTime?,
)

data class AdminUserInvitationSummaryResponse(
    val invitationId: Long,
    val slug: String?,
    val createdAt: LocalDateTime?,
    val isPublished: Boolean,
    val publishedAt: LocalDateTime?,
    val watermarkEnabledSnapshot: Boolean?,
)
