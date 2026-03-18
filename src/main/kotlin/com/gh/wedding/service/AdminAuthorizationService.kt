package com.gh.wedding.service

import com.gh.wedding.common.WeddingErrorCode
import com.gh.wedding.common.WeddingException
import com.gh.wedding.common.requireAuthUser
import com.gh.wedding.config.AdminProperties
import com.gh.wedding.domain.UserAccount
import com.gh.wedding.domain.UserRole
import com.gh.wedding.repository.UserAccountRepository
import com.gh.wedding.security.AuthUser
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class AdminAuthorizationService(
    private val adminProperties: AdminProperties,
    private val userAccountRepository: UserAccountRepository,
) {
    private fun configuredAdminIds(): Set<String> {
        return adminProperties.userIds
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .toSet()
    }

    fun resolveUserRole(userId: String?): UserRole? {
        if (userId.isNullOrBlank()) return null
        val account = userAccountRepository.findById(userId).orElse(null)
        if (account?.role == UserRole.ADMIN) {
            return UserRole.ADMIN
        }

        val adminIds = configuredAdminIds()
        if (!adminIds.contains(userId)) {
            return account?.role ?: UserRole.USER
        }

        if (account == null) {
            userAccountRepository.save(
                UserAccount(
                    id = userId,
                    role = UserRole.ADMIN,
                    isActive = true,
                ),
            )
        } else if (account.role != UserRole.ADMIN) {
            account.role = UserRole.ADMIN
        }

        return UserRole.ADMIN
    }

    fun isAdmin(userId: String?): Boolean {
        val role = resolveUserRole(userId) ?: return false
        return role == UserRole.ADMIN
    }

    fun requireAdmin(authentication: Authentication?): AuthUser {
        val authUser = authentication.requireAuthUser()
        if (!isAdmin(authUser.userId)) {
            throw WeddingException(WeddingErrorCode.SECURITY_VIOLATION, "관리자 권한이 필요합니다.")
        }
        return authUser
    }
}
