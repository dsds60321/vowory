package com.gh.wedding.security

import com.gh.wedding.config.OAuth2Properties
import com.gh.wedding.domain.UserAccount
import com.gh.wedding.domain.UserRole
import com.gh.wedding.repository.UserAccountRepository
import com.gh.wedding.service.AdminAuthorizationService
import com.gh.wedding.service.mail.MailNotificationService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.security.web.authentication.AuthenticationFailureHandler
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.stereotype.Component

@Component
class OAuth2LoginSuccessHandler(
    private val jwtTokenProvider: JwtTokenProvider,
    private val oauth2Properties: OAuth2Properties,
    private val accessTokenCookieService: AccessTokenCookieService,
    private val userAccountRepository: UserAccountRepository,
    private val adminAuthorizationService: AdminAuthorizationService,
    private val mailNotificationService: MailNotificationService,
) : AuthenticationSuccessHandler {

    override fun onAuthenticationSuccess(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication,
    ) {
        val oauthToken = authentication as OAuth2AuthenticationToken
        val provider = oauthToken.authorizedClientRegistrationId
        val oauthUser = oauthToken.principal
        val user = extractUser(provider, oauthUser)
        val upsertResult = upsertUserAccount(user)
        if (upsertResult.isNewUser) {
            mailNotificationService.sendNewSignupAlert(
                userId = user.userId,
                provider = user.provider,
                email = user.email,
                name = user.name,
                createdAt = upsertResult.createdAt,
            )
        }
        val accessToken = jwtTokenProvider.createAccessToken(user)

        accessTokenCookieService.addAccessTokenCookie(
            request = request,
            response = response,
            token = accessToken,
            maxAgeSeconds = jwtTokenProvider.tokenValiditySeconds(),
        )
        response.sendRedirect(oauth2Properties.successRedirectUri)
    }

    private fun extractUser(provider: String, oauthUser: OAuth2User): AuthUser {
        val attributes = oauthUser.attributes

        return when (provider) {
            "google" -> {
                val sub = (attributes["sub"] as? String) ?: (attributes["email"] as? String) ?: "google-unknown"
                AuthUser(
                    userId = "google:$sub",
                    name = attributes["name"] as? String,
                    email = attributes["email"] as? String,
                    provider = provider,
                )
            }

            "kakao" -> {
                val id = attributes["id"]?.toString() ?: "kakao-unknown"
                val properties = attributes["properties"] as? Map<*, *>
                val account = attributes["kakao_account"] as? Map<*, *>

                AuthUser(
                    userId = "kakao:$id",
                    name = properties?.get("nickname") as? String,
                    email = account?.get("email") as? String,
                    provider = provider,
                )
            }

            else -> {
                val fallbackId = oauthUser.name.ifBlank { "unknown" }
                AuthUser(
                    userId = "$provider:$fallbackId",
                    name = attributes["name"] as? String,
                    email = attributes["email"] as? String,
                    provider = provider,
                )
            }
        }
    }

    private fun upsertUserAccount(user: AuthUser): UserAccountUpsertResult {
        val shouldBeAdmin = adminAuthorizationService.isAdmin(user.userId)
        val existingAccount = userAccountRepository.findById(user.userId).orElse(null)
        val isNewUser = existingAccount == null
        val account = existingAccount ?: UserAccount(
            id = user.userId,
            role = if (shouldBeAdmin) UserRole.ADMIN else UserRole.USER,
            isActive = true,
        )

        account.name = user.name
        account.email = user.email
        account.provider = user.provider
        if (shouldBeAdmin) {
            account.role = UserRole.ADMIN
        }
        account.isActive = true

        val saved = userAccountRepository.save(account)
        return UserAccountUpsertResult(
            isNewUser = isNewUser,
            createdAt = saved.createdAt,
        )
    }

    private data class UserAccountUpsertResult(
        val isNewUser: Boolean,
        val createdAt: java.time.LocalDateTime?,
    )
}

@Component
class OAuth2LoginFailureHandler(
    private val oauth2Properties: OAuth2Properties,
) : AuthenticationFailureHandler {
    override fun onAuthenticationFailure(
        request: HttpServletRequest,
        response: HttpServletResponse,
        exception: org.springframework.security.core.AuthenticationException,
    ) {
        response.sendRedirect("${oauth2Properties.successRedirectUri.trimEnd('/')}/login?error=oauth2")
    }
}
