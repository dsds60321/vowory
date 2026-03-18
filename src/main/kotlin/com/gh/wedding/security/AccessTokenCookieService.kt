package com.gh.wedding.security

import com.gh.wedding.config.JwtProperties
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.ResponseCookie
import org.springframework.stereotype.Component
import java.time.Duration

@Component
class AccessTokenCookieService(
    private val jwtProperties: JwtProperties,
) {
    fun addAccessTokenCookie(
        request: HttpServletRequest,
        response: HttpServletResponse,
        token: String,
        maxAgeSeconds: Long,
    ) {
        val secure = isSecureRequest(request)

        val builder = ResponseCookie.from(JwtTokenProvider.ACCESS_TOKEN_COOKIE_NAME, token)
            .httpOnly(true)
            .secure(secure)
            .path("/")
            .sameSite("Lax")
            .maxAge(Duration.ofSeconds(maxAgeSeconds))

        val configuredDomain = jwtProperties.cookieDomain
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.removePrefix(".")

        if (!configuredDomain.isNullOrBlank()) {
            builder.domain(configuredDomain)
        }

        response.addHeader("Set-Cookie", builder.build().toString())
    }

    fun clearAccessTokenCookie(
        request: HttpServletRequest,
        response: HttpServletResponse,
    ) {
        val secureCandidates = linkedSetOf(isSecureRequest(request), true, false)
        val domainCandidates = linkedSetOf<String?>(null)

        val configuredDomain = jwtProperties.cookieDomain
            ?.trim()
            ?.takeIf { it.isNotEmpty() }

        if (!configuredDomain.isNullOrBlank()) {
            domainCandidates.add(configuredDomain.removePrefix("."))
            domainCandidates.add(configuredDomain)
        }

        request.serverName
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.let {
                domainCandidates.add(it)
                if (it.startsWith(".")) {
                    domainCandidates.add(it.removePrefix("."))
                } else {
                    domainCandidates.add(".$it")
                }
            }

        domainCandidates.forEach { domain ->
            secureCandidates.forEach { secure ->
                val builder = ResponseCookie.from(JwtTokenProvider.ACCESS_TOKEN_COOKIE_NAME, "")
                    .httpOnly(true)
                    .secure(secure)
                    .path("/")
                    .sameSite("Lax")
                    .maxAge(0)

                if (!domain.isNullOrBlank()) {
                    builder.domain(domain.removePrefix("."))
                }

                response.addHeader("Set-Cookie", builder.build().toString())
            }
        }

        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate")
        response.setHeader("Pragma", "no-cache")
        response.setDateHeader("Expires", 0)
    }

    private fun isSecureRequest(request: HttpServletRequest): Boolean {
        if (request.isSecure) return true

        val forwardedProto = request.getHeader("X-Forwarded-Proto")
            ?.lowercase()
            ?.split(',')
            ?.firstOrNull()
            ?.trim()
        if (forwardedProto == "https") return true

        val forwarded = request.getHeader("Forwarded")?.lowercase()
        if (forwarded != null && forwarded.contains("proto=https")) return true

        return false
    }
}
