package com.gh.wedding.controller

import com.gh.wedding.dto.NoticeDetailResponse
import com.gh.wedding.dto.NoticeSummaryResponse
import com.gh.wedding.dto.PagedResponse
import com.gh.wedding.service.NoticeService
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/public/notices")
class PublicNoticeController(
    private val noticeService: NoticeService,
) {
    @GetMapping
    fun getVisibleNotices(
        @PageableDefault(size = 20) pageable: Pageable,
    ): PagedResponse<NoticeSummaryResponse> {
        return noticeService.getCurrentNotices(pageable)
    }

    @GetMapping("/banner")
    fun getVisibleBannerNotices(): List<NoticeSummaryResponse> {
        return noticeService.getCurrentBannerNotices()
    }

    @GetMapping("/{id}")
    fun getVisibleNoticeDetail(@PathVariable id: Long): NoticeDetailResponse {
        return noticeService.getCurrentNotice(id)
    }
}
