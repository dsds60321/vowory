package com.gh.wedding.controller

import com.gh.wedding.domain.NoticeStatus
import com.gh.wedding.dto.AdminNoticeSummaryResponse
import com.gh.wedding.dto.NoticeDetailResponse
import com.gh.wedding.dto.NoticeStatusPatchRequest
import com.gh.wedding.dto.NoticeUpsertRequest
import com.gh.wedding.dto.PagedResponse
import com.gh.wedding.service.AdminAuthorizationService
import com.gh.wedding.service.NoticeService
import jakarta.validation.Valid
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/admin/notices")
class AdminNoticeController(
    private val adminAuthorizationService: AdminAuthorizationService,
    private val noticeService: NoticeService,
) {
    @GetMapping
    fun getNotices(
        authentication: Authentication?,
        @RequestParam(required = false) keyword: String?,
        @RequestParam(required = false) status: NoticeStatus?,
        @RequestParam(required = false) isBanner: Boolean?,
        @PageableDefault(size = 20) pageable: Pageable,
    ): PagedResponse<AdminNoticeSummaryResponse> {
        adminAuthorizationService.requireAdmin(authentication)
        return noticeService.getAdminNotices(keyword, status, isBanner, pageable)
    }

    @GetMapping("/{id}")
    fun getNotice(
        authentication: Authentication?,
        @PathVariable id: Long,
    ): NoticeDetailResponse {
        adminAuthorizationService.requireAdmin(authentication)
        return noticeService.getAdminNotice(id)
    }

    @PostMapping
    fun createNotice(
        authentication: Authentication?,
        @Valid @RequestBody request: NoticeUpsertRequest,
    ): NoticeDetailResponse {
        val actor = adminAuthorizationService.requireAdmin(authentication)
        return noticeService.createNotice(request, actor.userId)
    }

    @PutMapping("/{id}")
    fun updateNotice(
        authentication: Authentication?,
        @PathVariable id: Long,
        @Valid @RequestBody request: NoticeUpsertRequest,
    ): NoticeDetailResponse {
        val actor = adminAuthorizationService.requireAdmin(authentication)
        return noticeService.updateNotice(id, request, actor.userId)
    }

    @PatchMapping("/{id}/status")
    fun updateNoticeStatus(
        authentication: Authentication?,
        @PathVariable id: Long,
        @Valid @RequestBody request: NoticeStatusPatchRequest,
    ): NoticeDetailResponse {
        val actor = adminAuthorizationService.requireAdmin(authentication)
        return noticeService.updateNoticeStatus(id, request.status, actor.userId)
    }
}
