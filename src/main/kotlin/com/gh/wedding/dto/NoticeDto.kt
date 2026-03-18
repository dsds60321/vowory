package com.gh.wedding.dto

import com.gh.wedding.domain.NoticeStatus
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.LocalDateTime

data class NoticeSummaryResponse(
    val id: Long,
    val title: String,
    val startAt: LocalDateTime,
    val endAt: LocalDateTime?,
    val isBanner: Boolean,
)

data class NoticeDetailResponse(
    val id: Long,
    val title: String,
    val content: String,
    val startAt: LocalDateTime,
    val endAt: LocalDateTime?,
    val isBanner: Boolean,
    val status: NoticeStatus,
    val createdByUserId: String?,
    val updatedByUserId: String?,
    val createdAt: LocalDateTime?,
    val updatedAt: LocalDateTime?,
)

data class AdminNoticeSummaryResponse(
    val id: Long,
    val title: String,
    val status: NoticeStatus,
    val isBanner: Boolean,
    val startAt: LocalDateTime,
    val endAt: LocalDateTime?,
    val createdAt: LocalDateTime?,
    val updatedAt: LocalDateTime?,
)

data class NoticeUpsertRequest(
    @field:NotBlank(message = "title은 필수입니다.")
    val title: String,

    @field:NotBlank(message = "content는 필수입니다.")
    val content: String,

    @field:NotNull(message = "startAt은 필수입니다.")
    val startAt: LocalDateTime,

    val endAt: LocalDateTime? = null,
    val isBanner: Boolean = false,
    val status: NoticeStatus = NoticeStatus.DRAFT,
)

data class NoticeStatusPatchRequest(
    @field:NotNull(message = "status는 필수입니다.")
    val status: NoticeStatus,
)
