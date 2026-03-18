package com.gh.wedding.repository

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import java.time.LocalDateTime

data class AdminUserInvitationSummaryRow(
    val invitationId: Long,
    val slug: String?,
    val createdAt: LocalDateTime?,
    val isPublished: Boolean,
    val publishedAt: LocalDateTime?,
    val watermarkEnabledSnapshot: Boolean?,
)

interface InvitationAdminQueryRepository {
    fun findAdminInvitationsByUserId(userId: String, pageable: Pageable): Page<AdminUserInvitationSummaryRow>
}
