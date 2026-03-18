package com.gh.wedding.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthenticationFilter(
    private val jwtTokenProvider: JwtTokenProvider,
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val token = resolveTokenFromCookie(request.cookies)
        val currentAuth = SecurityContextHolder.getContext().authentication
        if (token != null && jwtTokenProvider.isValid(token) && (currentAuth == null || currentAuth.principal !is AuthUser)) {
            val user = jwtTokenProvider.parseUser(token)
            val authentication = UsernamePasswordAuthenticationToken(
                user,
                token,
                listOf(SimpleGrantedAuthority("ROLE_USER")),
            ).apply {
                details = WebAuthenticationDetailsSource().buildDetails(request)
            }
            SecurityContextHolder.getContext().authentication = authentication
        }

        filterChain.doFilter(request, response)
    }

    private fun resolveTokenFromCookie(cookies: Array<Cookie>?): String? {
        return cookies
            ?.firstOrNull { it.name == JwtTokenProvider.ACCESS_TOKEN_COOKIE_NAME }
            ?.value
            ?.takeIf { it.isNotBlank() }
    }
}
