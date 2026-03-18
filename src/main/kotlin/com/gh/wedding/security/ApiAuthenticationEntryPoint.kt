package com.gh.wedding.security

import com.fasterxml.jackson.databind.ObjectMapper
import com.gh.wedding.common.ApiErrorResponses
import com.gh.wedding.common.WeddingErrorCode
import com.gh.wedding.service.mail.MailNotificationService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.MediaType
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets

@Component
class ApiAuthenticationEntryPoint(
    private val objectMapper: ObjectMapper,
    private val accessTokenCookieService: AccessTokenCookieService,
    private val mailNotificationService: MailNotificationService,
) : AuthenticationEntryPoint {
    override fun commence(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authException: AuthenticationException?,
    ) {
        val hasTokenCookie = request.cookies
            ?.any { it.name == JwtTokenProvider.ACCESS_TOKEN_COOKIE_NAME && it.value.isNotBlank() }
            ?: false

        val errorCode = if (hasTokenCookie) {
            WeddingErrorCode.SESSION_EXPIRED
        } else {
            WeddingErrorCode.AUTH_REQUIRED
        }

        mailNotificationService.sendErrorAlert(
            request = request,
            source = "ApiAuthenticationEntryPoint",
            errorCode = errorCode.name,
            status = errorCode.status.value(),
            message = errorCode.message,
            detailMessage = authException?.message,
            throwable = authException,
        )

        accessTokenCookieService.clearAccessTokenCookie(request, response)
        response.status = errorCode.status.value()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.characterEncoding = StandardCharsets.UTF_8.name()
        objectMapper.writeValue(response.writer, ApiErrorResponses.of(errorCode))
    }
}
