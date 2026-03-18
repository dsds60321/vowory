package com.gh.wedding.service

import com.gh.wedding.domain.UserRole
import com.gh.wedding.dto.AdminUserInvitationSummaryResponse
import com.gh.wedding.dto.AdminUserSummaryResponse
import com.gh.wedding.dto.PagedResponse
import com.gh.wedding.dto.toPagedResponse
import com.gh.wedding.repository.InvitationRepository
import com.gh.wedding.repository.UserAccountRepository
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class AdminUserService(
    private val userAccountRepository: UserAccountRepository,
    private val invitationRepository: InvitationRepository,
) {
    fun getUsers(
        keyword: String?,
        role: UserRole?,
        isActive: Boolean?,
        pageable: Pageable,
    ): PagedResponse<AdminUserSummaryResponse> {
        val normalizedKeyword = keyword?.trim().takeUnless { it.isNullOrBlank() }
        val page = userAccountRepository.searchAdminUsers(normalizedKeyword, role, isActive, pageable)

        return page
            .map { user ->
                AdminUserSummaryResponse(
                    userId = user.id,
                    name = user.name,
                    email = user.email,
                    role = user.role,
                    isActive = user.isActive,
                    createdAt = user.createdAt,
                )
            }
            .toPagedResponse()
    }

    fun getUserInvitations(userId: String, pageable: Pageable): PagedResponse<AdminUserInvitationSummaryResponse> {
        return invitationRepository.findAdminInvitationsByUserId(userId, pageable)
            .map { row ->
                AdminUserInvitationSummaryResponse(
                    invitationId = row.invitationId,
                    slug = row.slug,
                    createdAt = row.createdAt,
                    isPublished = row.isPublished,
                    publishedAt = row.publishedAt,
                    watermarkEnabledSnapshot = row.watermarkEnabledSnapshot,
                )
            }
            .toPagedResponse()
    }
}
