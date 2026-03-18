package com.gh.wedding.service

import com.gh.wedding.common.WeddingErrorCode
import com.gh.wedding.common.WeddingException
import com.gh.wedding.domain.Notice
import com.gh.wedding.domain.NoticeStatus
import com.gh.wedding.dto.AdminNoticeSummaryResponse
import com.gh.wedding.dto.NoticeDetailResponse
import com.gh.wedding.dto.NoticeSummaryResponse
import com.gh.wedding.dto.NoticeUpsertRequest
import com.gh.wedding.dto.PagedResponse
import com.gh.wedding.dto.toPagedResponse
import com.gh.wedding.repository.NoticeRepository
import com.gh.wedding.repository.UserAccountRepository
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class NoticeService(
    private val noticeRepository: NoticeRepository,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional(readOnly = true)
    fun getCurrentNotices(pageable: Pageable): PagedResponse<NoticeSummaryResponse> {
        return noticeRepository.findCurrentVisible(pageable)
            .map { it.toNoticeSummaryResponse() }
            .toPagedResponse()
    }

    @Transactional(readOnly = true)
    fun getCurrentNotice(id: Long): NoticeDetailResponse {
        val notice = noticeRepository.findCurrentVisibleById(id)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "노출 중인 공지사항을 찾을 수 없습니다.")
        return notice.toNoticeDetailResponse()
    }

    @Transactional(readOnly = true)
    fun getCurrentBannerNotices(): List<NoticeSummaryResponse> {
        return noticeRepository.findCurrentVisibleBanners().map { it.toNoticeSummaryResponse() }
    }

    @Transactional(readOnly = true)
    fun getAdminNotices(
        keyword: String?,
        status: NoticeStatus?,
        isBanner: Boolean?,
        pageable: Pageable,
    ): PagedResponse<AdminNoticeSummaryResponse> {
        return noticeRepository.findAdminPage(keyword, status, isBanner, pageable)
            .map { it.toAdminNoticeSummaryResponse() }
            .toPagedResponse()
    }

    @Transactional(readOnly = true)
    fun getAdminNotice(id: Long): NoticeDetailResponse {
        val notice = noticeRepository.findById(id).orElseThrow {
            WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "공지사항을 찾을 수 없습니다.")
        }
        return notice.toNoticeDetailResponse()
    }

    fun createNotice(request: NoticeUpsertRequest, actorUserId: String): NoticeDetailResponse {
        validateSchedule(request.startAt, request.endAt)

        val actor = userAccountRepository.findById(actorUserId).orElseThrow {
            WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "작성자 정보를 찾을 수 없습니다.")
        }

        val saved = noticeRepository.save(
            Notice(
                title = request.title.trim(),
                content = request.content.trim(),
                startAt = request.startAt,
                endAt = request.endAt,
                isBanner = request.isBanner,
                status = request.status,
                createdBy = actor,
                updatedBy = actor,
            ),
        )

        return saved.toNoticeDetailResponse()
    }

    fun updateNotice(id: Long, request: NoticeUpsertRequest, actorUserId: String): NoticeDetailResponse {
        validateSchedule(request.startAt, request.endAt)

        val notice = noticeRepository.findById(id).orElseThrow {
            WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "공지사항을 찾을 수 없습니다.")
        }

        val actor = userAccountRepository.findById(actorUserId).orElseThrow {
            WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "수정자 정보를 찾을 수 없습니다.")
        }

        notice.title = request.title.trim()
        notice.content = request.content.trim()
        notice.startAt = request.startAt
        notice.endAt = request.endAt
        notice.isBanner = request.isBanner
        notice.status = request.status
        notice.updatedBy = actor

        return notice.toNoticeDetailResponse()
    }

    fun updateNoticeStatus(id: Long, status: NoticeStatus, actorUserId: String): NoticeDetailResponse {
        val notice = noticeRepository.findById(id).orElseThrow {
            WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "공지사항을 찾을 수 없습니다.")
        }

        val actor = userAccountRepository.findById(actorUserId).orElseThrow {
            WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "수정자 정보를 찾을 수 없습니다.")
        }

        notice.status = status
        notice.updatedBy = actor

        return notice.toNoticeDetailResponse()
    }

    private fun validateSchedule(startAt: java.time.LocalDateTime, endAt: java.time.LocalDateTime?) {
        if (endAt != null && endAt.isBefore(startAt)) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "endAt은 startAt보다 빠를 수 없습니다.")
        }
    }

    private fun Notice.toNoticeSummaryResponse(): NoticeSummaryResponse {
        return NoticeSummaryResponse(
            id = id ?: 0L,
            title = title,
            startAt = startAt,
            endAt = endAt,
            isBanner = isBanner,
        )
    }

    private fun Notice.toNoticeDetailResponse(): NoticeDetailResponse {
        return NoticeDetailResponse(
            id = id ?: 0L,
            title = title,
            content = content,
            startAt = startAt,
            endAt = endAt,
            isBanner = isBanner,
            status = status,
            createdByUserId = createdBy?.id,
            updatedByUserId = updatedBy?.id,
            createdAt = createdAt,
            updatedAt = updatedAt,
        )
    }

    private fun Notice.toAdminNoticeSummaryResponse(): AdminNoticeSummaryResponse {
        return AdminNoticeSummaryResponse(
            id = id ?: 0L,
            title = title,
            status = status,
            isBanner = isBanner,
            startAt = startAt,
            endAt = endAt,
            createdAt = createdAt,
            updatedAt = updatedAt,
        )
    }
}
