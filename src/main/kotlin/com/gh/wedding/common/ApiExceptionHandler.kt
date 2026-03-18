package com.gh.wedding.common

import com.gh.wedding.service.mail.MailNotificationService
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.http.ResponseEntity
import org.springframework.security.access.AccessDeniedException
import org.springframework.validation.BindException
import org.springframework.validation.BindingResult
import org.springframework.web.HttpMediaTypeNotSupportedException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.multipart.MaxUploadSizeExceededException
import org.springframework.web.multipart.MultipartException

@RestControllerAdvice
class ApiExceptionHandler(
    private val mailNotificationService: MailNotificationService,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(WeddingException::class)
    fun handleWeddingException(
        request: HttpServletRequest,
        ex: WeddingException,
    ): ResponseEntity<ApiErrorResponse> {
        notifyError(
            request = request,
            errorCode = ex.errorCode,
            detailMessage = ex.detailMessage,
            throwable = ex,
        )
        return ResponseEntity
            .status(ex.errorCode.status)
            .body(ApiErrorResponses.of(ex.errorCode, ex.detailMessage))
    }

    @ExceptionHandler(
        MethodArgumentNotValidException::class,
        BindException::class,
        ConstraintViolationException::class,
        MissingServletRequestParameterException::class,
        MethodArgumentTypeMismatchException::class,
        HttpMessageNotReadableException::class,
    )
    fun handleInvalidInput(
        request: HttpServletRequest,
        ex: Exception,
    ): ResponseEntity<ApiErrorResponse> {
        val detail = when (ex) {
            is MethodArgumentNotValidException -> extractValidationMessage(ex.bindingResult)
            is BindException -> extractValidationMessage(ex.bindingResult)
            is ConstraintViolationException -> ex.constraintViolations.joinToString("; ") { "${it.propertyPath}: ${it.message}" }
            is MissingServletRequestParameterException -> "${ex.parameterName} 파라미터가 필요합니다."
            is MethodArgumentTypeMismatchException -> "${ex.name} 값의 타입이 올바르지 않습니다."
            is HttpMessageNotReadableException -> "요청 본문(JSON) 형식이 올바르지 않습니다."
            else -> ex.message
        }
        notifyError(
            request = request,
            errorCode = WeddingErrorCode.INVALID_INPUT,
            detailMessage = detail,
            throwable = ex,
        )

        return ResponseEntity
            .status(WeddingErrorCode.INVALID_INPUT.status)
            .body(ApiErrorResponses.of(WeddingErrorCode.INVALID_INPUT, detail))
    }

    @ExceptionHandler(
        MaxUploadSizeExceededException::class,
        MultipartException::class,
        HttpMediaTypeNotSupportedException::class,
    )
    fun handleMultipartException(
        request: HttpServletRequest,
        ex: Exception,
    ): ResponseEntity<ApiErrorResponse> {
        val detail = when (ex) {
            is MaxUploadSizeExceededException -> "업로드 가능한 최대 용량을 초과했습니다."
            else -> ex.message
        }
        notifyError(
            request = request,
            errorCode = WeddingErrorCode.FILE_UPLOAD_ERROR,
            detailMessage = detail,
            throwable = ex,
        )

        return ResponseEntity
            .status(WeddingErrorCode.FILE_UPLOAD_ERROR.status)
            .body(ApiErrorResponses.of(WeddingErrorCode.FILE_UPLOAD_ERROR, detail))
    }

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(
        request: HttpServletRequest,
        ex: AccessDeniedException,
    ): ResponseEntity<ApiErrorResponse> {
        notifyError(
            request = request,
            errorCode = WeddingErrorCode.SECURITY_VIOLATION,
            detailMessage = ex.message,
            throwable = ex,
        )
        return ResponseEntity
            .status(WeddingErrorCode.SECURITY_VIOLATION.status)
            .body(ApiErrorResponses.of(WeddingErrorCode.SECURITY_VIOLATION, ex.message))
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun handleMethodNotSupported(
        request: HttpServletRequest,
        ex: HttpRequestMethodNotSupportedException,
    ): ResponseEntity<ApiErrorResponse> {
        notifyError(
            request = request,
            errorCode = WeddingErrorCode.INVALID_INPUT,
            detailMessage = ex.message,
            throwable = ex,
        )
        return ResponseEntity
            .status(WeddingErrorCode.INVALID_INPUT.status)
            .body(ApiErrorResponses.of(WeddingErrorCode.INVALID_INPUT, ex.message))
    }

    @ExceptionHandler(Exception::class)
    fun handleUnhandledException(
        request: HttpServletRequest,
        ex: Exception,
    ): ResponseEntity<ApiErrorResponse> {
        logger.error("Unhandled server exception", ex)
        notifyError(
            request = request,
            errorCode = WeddingErrorCode.SERVER_ERROR,
            detailMessage = ex.message,
            throwable = ex,
        )
        return ResponseEntity
            .status(WeddingErrorCode.SERVER_ERROR.status)
            .body(ApiErrorResponses.of(WeddingErrorCode.SERVER_ERROR, ex.message))
    }

    private fun extractValidationMessage(bindingResult: BindingResult): String {
        val fieldErrors = bindingResult.fieldErrors
            .takeIf { it.isNotEmpty() }
            ?.joinToString("; ") { "${it.field}: ${it.defaultMessage ?: "유효하지 않은 값"}" }

        if (!fieldErrors.isNullOrBlank()) {
            return fieldErrors
        }

        return bindingResult.allErrors
            .joinToString("; ") { it.defaultMessage ?: "요청값 검증 오류" }
            .ifBlank { "요청값 검증 오류" }
    }

    private fun notifyError(
        request: HttpServletRequest,
        errorCode: WeddingErrorCode,
        detailMessage: String?,
        throwable: Throwable?,
    ) {
        if (!request.requestURI.startsWith("/api/")) {
            return
        }
        mailNotificationService.sendErrorAlert(
            request = request,
            source = "ApiExceptionHandler",
            errorCode = errorCode.name,
            status = errorCode.status.value(),
            message = errorCode.message,
            detailMessage = detailMessage,
            throwable = throwable,
        )
    }
}
