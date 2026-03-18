package com.gh.wedding.security

import com.fasterxml.jackson.databind.ObjectMapper
import com.gh.wedding.common.ApiErrorResponses
import com.gh.wedding.common.WeddingErrorCode
import com.gh.wedding.service.mail.MailNotificationService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.MediaType
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets

@Component
class ApiAccessDeniedHandler(
    private val objectMapper: ObjectMapper,
    private val mailNotificationService: MailNotificationService,
) : AccessDeniedHandler {
    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        accessDeniedException: AccessDeniedException,
    ) {
        val errorCode = WeddingErrorCode.SECURITY_VIOLATION
        mailNotificationService.sendErrorAlert(
            request = request,
            source = "ApiAccessDeniedHandler",
            errorCode = errorCode.name,
            status = errorCode.status.value(),
            message = errorCode.message,
            detailMessage = accessDeniedException.message,
            throwable = accessDeniedException,
        )

        response.status = errorCode.status.value()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.characterEncoding = StandardCharsets.UTF_8.name()
        objectMapper.writeValue(
            response.writer,
            ApiErrorResponses.of(errorCode, accessDeniedException.message),
        )
    }
}
