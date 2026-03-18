package com.gh.wedding.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class RsvpCreateRequest(
    @field:NotBlank(message = "성함을 입력해주세요.")
    @field:Size(max = 60, message = "성함은 60자 이내로 입력해주세요.")
    val name: String,
    @field:NotBlank(message = "비밀번호를 입력해주세요.")
    @field:Size(min = 4, max = 30, message = "비밀번호는 4자 이상 30자 이하로 입력해주세요.")
    val password: String,
    val attending: Boolean,
    val side: String = "groom",
    val partyCount: Int? = null,
    @field:Size(max = 40, message = "연락처는 40자 이내로 입력해주세요.")
    val contact: String? = null,
    val meal: Boolean? = null,
    val bus: Boolean? = null,
    @field:Size(max = 300, message = "메모는 300자 이내로 작성해주세요.")
    val note: String? = null,
)

data class RsvpUpdateRequest(
    @field:NotBlank(message = "비밀번호를 입력해주세요.")
    @field:Size(min = 4, max = 30, message = "비밀번호는 4자 이상 30자 이하로 입력해주세요.")
    val password: String,
    @field:NotBlank(message = "성함을 입력해주세요.")
    @field:Size(max = 60, message = "성함은 60자 이내로 입력해주세요.")
    val name: String,
    val attending: Boolean,
    val side: String = "groom",
    val partyCount: Int? = null,
    @field:Size(max = 40, message = "연락처는 40자 이내로 입력해주세요.")
    val contact: String? = null,
    val meal: Boolean? = null,
    val bus: Boolean? = null,
    @field:Size(max = 300, message = "메모는 300자 이내로 작성해주세요.")
    val note: String? = null,
)

data class RsvpSummaryResponse(
    val id: Long,
    val invitationId: Long,
    val invitationTitle: String,
    val name: String,
    val side: String,
    val attending: Boolean,
    val partyCount: Int?,
    val contact: String?,
    val meal: Boolean?,
    val bus: Boolean?,
    val note: String?,
    val createdAt: String,
)

data class RsvpDeleteRequest(
    @field:NotBlank(message = "비밀번호를 입력해주세요.")
    @field:Size(min = 4, max = 30, message = "비밀번호는 4자 이상 30자 이하로 입력해주세요.")
    val password: String,
)
