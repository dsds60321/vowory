package com.gh.wedding.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class GuestbookCreateRequest(
    @field:NotBlank(message = "이름을 입력해주세요.")
    @field:Size(max = 60, message = "이름은 60자 이내로 입력해주세요.")
    val name: String,
    @field:NotBlank(message = "비밀번호를 입력해주세요.")
    @field:Size(min = 4, max = 30, message = "비밀번호는 4자 이상 30자 이하로 입력해주세요.")
    val password: String,
    @field:NotBlank(message = "내용을 입력해주세요.")
    @field:Size(max = 1000, message = "내용은 1000자 이내로 작성해주세요.")
    val content: String,
)

data class GuestbookUpdateRequest(
    @field:NotBlank(message = "비밀번호를 입력해주세요.")
    @field:Size(min = 4, max = 30, message = "비밀번호는 4자 이상 30자 이하로 입력해주세요.")
    val password: String,
    @field:NotBlank(message = "이름을 입력해주세요.")
    @field:Size(max = 60, message = "이름은 60자 이내로 입력해주세요.")
    val name: String,
    @field:NotBlank(message = "내용을 입력해주세요.")
    @field:Size(max = 1000, message = "내용은 1000자 이내로 작성해주세요.")
    val content: String,
)

data class GuestbookDeleteRequest(
    @field:NotBlank(message = "비밀번호를 입력해주세요.")
    @field:Size(min = 4, max = 30, message = "비밀번호는 4자 이상 30자 이하로 입력해주세요.")
    val password: String,
)


data class GuestbookResponse(
    val id: Long,
    val name: String,
    val content: String,
    val createdAt: String,
)

data class MyGuestbookResponse(
    val id: Long,
    val invitationId: Long,
    val invitationTitle: String,
    val name: String,
    val content: String,
    val createdAt: String,
)
