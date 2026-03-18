package com.gh.wedding.common

import java.time.OffsetDateTime

data class ApiErrorResponse(
    val status: Int,
    val code: String,
    val message: String,
    val detailMessage: String?,
    val clientAction: String?,
    val timestamp: String = OffsetDateTime.now().toString(),
)

object ApiErrorResponses {
    fun of(
        errorCode: WeddingErrorCode,
        detailMessage: String? = null,
    ): ApiErrorResponse {
        val trimmedDetail = detailMessage?.trim()?.takeIf { it.isNotBlank() }
        val action = errorCode.clientAction.takeIf { it != ClientAction.NONE }?.name

        return ApiErrorResponse(
            status = errorCode.status.value(),
            code = errorCode.name,
            message = errorCode.message,
            detailMessage = trimmedDetail,
            clientAction = action,
        )
    }
}
