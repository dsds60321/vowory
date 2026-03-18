package com.gh.wedding.controller

import com.gh.wedding.dto.AuthMeResponse
import com.gh.wedding.security.AccessTokenCookieService
import com.gh.wedding.security.AuthUser
import com.gh.wedding.service.AdminAuthorizationService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val accessTokenCookieService: AccessTokenCookieService,
    private val adminAuthorizationService: AdminAuthorizationService,
) {

    @GetMapping("/me")
    fun me(authentication: Authentication?): AuthMeResponse {
        val principal = authentication?.principal
        if (principal !is AuthUser) {
            return AuthMeResponse(loggedIn = false)
        }

        return AuthMeResponse(
            loggedIn = true,
            userId = principal.userId,
            name = principal.name,
            email = principal.email,
            provider = principal.provider,
            role = adminAuthorizationService.resolveUserRole(principal.userId),
            isAdmin = adminAuthorizationService.isAdmin(principal.userId),
        )
    }

    @PostMapping("/logout")
    fun logout(
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): Map<String, String> {
        request.getSession(false)?.invalidate()
        SecurityContextHolder.clearContext()
        accessTokenCookieService.clearAccessTokenCookie(request, response)
        return mapOf("message" to "로그아웃되었습니다.")
    }
}
