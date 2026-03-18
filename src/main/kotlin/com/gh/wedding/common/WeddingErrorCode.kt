package com.gh.wedding.common

import org.springframework.http.HttpStatus

enum class ClientAction {
    NONE,
    CLEAR_SESSION_AND_REDIRECT_LOGIN,
}

enum class WeddingErrorCode(
    val status: HttpStatus,
    val message: String,
    val clientAction: ClientAction = ClientAction.NONE,
) {
    AUTH_REQUIRED(
        status = HttpStatus.UNAUTHORIZED,
        message = "로그인이 필요합니다.",
        clientAction = ClientAction.CLEAR_SESSION_AND_REDIRECT_LOGIN,
    ),
    SESSION_EXPIRED(
        status = HttpStatus.UNAUTHORIZED,
        message = "세션이 만료되었습니다. 다시 로그인해 주세요.",
        clientAction = ClientAction.CLEAR_SESSION_AND_REDIRECT_LOGIN,
    ),
    SECURITY_VIOLATION(
        status = HttpStatus.FORBIDDEN,
        message = "보안 정책 위반으로 요청이 거부되었습니다.",
    ),
    INVALID_INPUT(
        status = HttpStatus.BAD_REQUEST,
        message = "사용자 입력값이 올바르지 않습니다.",
    ),
    RESOURCE_NOT_FOUND(
        status = HttpStatus.NOT_FOUND,
        message = "요청한 리소스를 찾을 수 없습니다.",
    ),
    DUPLICATE_RESOURCE(
        status = HttpStatus.CONFLICT,
        message = "이미 사용 중인 리소스입니다.",
    ),
    FILE_UPLOAD_ERROR(
        status = HttpStatus.BAD_REQUEST,
        message = "파일 업로드 요청이 올바르지 않습니다.",
    ),
    SERVER_ERROR(
        status = HttpStatus.INTERNAL_SERVER_ERROR,
        message = "서버 처리 중 오류가 발생했습니다.",
    ),
}
