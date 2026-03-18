package com.gh.wedding.common

import com.gh.wedding.security.AuthUser
import org.springframework.security.core.Authentication

fun Authentication?.requireAuthUser(): AuthUser {
    val principal = this?.principal
    if (principal is AuthUser) {
        return principal
    }
    throw WeddingException(WeddingErrorCode.AUTH_REQUIRED)
}
