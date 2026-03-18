package com.gh.wedding.controller

import com.gh.wedding.domain.UserRole
import com.gh.wedding.dto.AdminUserInvitationSummaryResponse
import com.gh.wedding.dto.AdminUserSummaryResponse
import com.gh.wedding.dto.PagedResponse
import com.gh.wedding.service.AdminAuthorizationService
import com.gh.wedding.service.AdminUserService
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/admin/users")
class AdminUserController(
    private val adminAuthorizationService: AdminAuthorizationService,
    private val adminUserService: AdminUserService,
) {
    @GetMapping
    fun getUsers(
        authentication: Authentication?,
        @RequestParam(required = false) keyword: String?,
        @RequestParam(required = false) role: UserRole?,
        @RequestParam(required = false) isActive: Boolean?,
        @PageableDefault(size = 20) pageable: Pageable,
    ): PagedResponse<AdminUserSummaryResponse> {
        adminAuthorizationService.requireAdmin(authentication)
        return adminUserService.getUsers(keyword, role, isActive, pageable)
    }

    @GetMapping("/{userId}/invitations")
    fun getUserInvitations(
        authentication: Authentication?,
        @PathVariable userId: String,
        @PageableDefault(size = 20) pageable: Pageable,
    ): PagedResponse<AdminUserInvitationSummaryResponse> {
        adminAuthorizationService.requireAdmin(authentication)
        return adminUserService.getUserInvitations(userId, pageable)
    }
}
