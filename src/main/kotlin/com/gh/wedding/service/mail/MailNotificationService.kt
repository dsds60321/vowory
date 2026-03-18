package com.gh.wedding.service.mail

import com.gh.wedding.config.MailNotificationProperties
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.mail.MailProperties
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Service
class MailNotificationService(
    private val mailSender: JavaMailSender,
    private val mailProperties: MailProperties,
    private val mailNotificationProperties: MailNotificationProperties,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    fun sendErrorAlert(
        request: HttpServletRequest?,
        source: String,
        errorCode: String,
        status: Int,
        message: String?,
        detailMessage: String?,
        throwable: Throwable?,
    ) {
        if (!mailNotificationProperties.enabled) {
            return
        }

        val subjectPrefix = mailNotificationProperties.errorSubject.trim().ifBlank { "[Wedding] API 오류 알림" }
        val subject = "$subjectPrefix - $errorCode"
        val body = buildString {
            appendLine("발생시각: ${LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)}")
            appendLine("발생위치: $source")
            appendLine("HTTP 상태: $status")
            appendLine("오류코드: $errorCode")
            appendLine("오류메시지: ${message ?: ""}")
            appendLine("상세메시지: ${detailMessage ?: ""}")
            appendLine("요청메서드: ${request?.method ?: "N/A"}")
            appendLine("요청URI: ${request?.requestURI ?: "N/A"}")
            appendLine("쿼리스트링: ${request?.queryString ?: ""}")
            appendLine("클라이언트IP: ${extractClientIp(request)}")
            appendLine()
            appendLine("스택트레이스(상위 ${mailNotificationProperties.errorStackTraceLineLimit}줄)")
            appendLine(summarizeStackTrace(throwable))
        }
        send(subject, body)
    }

    fun sendNewSignupAlert(
        userId: String,
        provider: String?,
        email: String?,
        name: String?,
        createdAt: LocalDateTime?,
    ) {
        if (!mailNotificationProperties.enabled) {
            return
        }

        val subject = mailNotificationProperties.signupSubject.trim().ifBlank { "[Wedding] 신규 회원가입 알림" }
        val body = buildString {
            appendLine("발생시각: ${LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)}")
            appendLine("회원ID: $userId")
            appendLine("로그인 제공자: ${provider ?: ""}")
            appendLine("이름: ${name ?: ""}")
            appendLine("이메일: ${email ?: ""}")
            appendLine("계정 생성시각: ${createdAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) ?: ""}")
        }
        send(subject, body)
    }

    private fun send(subject: String, body: String) {
        val recipient = mailNotificationProperties.errorTo.trim()
        if (recipient.isBlank()) {
            logger.warn("메일 수신자(app.mail.error-to)가 비어 있어 메일을 발송하지 않습니다.")
            return
        }

        val fromAddress = resolveFromAddress()
        val message = SimpleMailMessage().apply {
            setTo(recipient)
            if (fromAddress.isNotBlank()) {
                setFrom(fromAddress)
            }
            setSubject(subject)
            setText(body)
        }

        runCatching { mailSender.send(message) }
            .onFailure { ex -> logger.error("메일 발송 실패: subject={}", subject, ex) }

        logger.info("메일 발송 성공  : {} ", subject)
    }

    private fun resolveFromAddress(): String {
        val configured = mailNotificationProperties.from.trim()
        if (configured.isNotBlank()) {
            return configured
        }
        return mailProperties.username?.trim().orEmpty()
    }

    private fun summarizeStackTrace(throwable: Throwable?): String {
        if (throwable == null) {
            return ""
        }

        val limit = mailNotificationProperties.errorStackTraceLineLimit.coerceAtLeast(1)
        return throwable.stackTrace
            .take(limit)
            .joinToString("\n") { "at ${it.className}.${it.methodName}(${it.fileName}:${it.lineNumber})" }
    }

    private fun extractClientIp(request: HttpServletRequest?): String {
        if (request == null) {
            return "N/A"
        }
        return request.getHeader("X-Forwarded-For")
            ?.split(",")
            ?.firstOrNull()
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: request.remoteAddr
    }
}
