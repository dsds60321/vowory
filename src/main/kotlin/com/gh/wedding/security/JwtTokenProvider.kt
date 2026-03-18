package com.gh.wedding.security

import com.gh.wedding.config.JwtProperties
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import jakarta.annotation.PostConstruct
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.Date
import javax.crypto.SecretKey

@Component
class JwtTokenProvider(
    private val jwtProperties: JwtProperties,
) {
    companion object {
        const val ACCESS_TOKEN_COOKIE_NAME = "WL_ACCESS_TOKEN"
    }

    private lateinit var secretKey: SecretKey

    @PostConstruct
    fun init() {
        val keyBytes = jwtProperties.secret.toByteArray(StandardCharsets.UTF_8)
        require(keyBytes.size >= 32) { "APP_JWT_SECRET must be at least 32 bytes." }
        secretKey = Keys.hmacShaKeyFor(keyBytes)
    }

    fun createAccessToken(user: AuthUser): String {
        val now = Instant.now()
        val expiresAt = now.plusSeconds(jwtProperties.accessTokenValiditySeconds)

        return Jwts.builder()
            .subject(user.userId)
            .claim("name", user.name)
            .claim("email", user.email)
            .claim("provider", user.provider)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(secretKey)
            .compact()
    }

    fun parseUser(token: String): AuthUser {
        val claims = parseClaims(token)
        return AuthUser(
            userId = claims.subject,
            name = claims["name"] as? String,
            email = claims["email"] as? String,
            provider = claims["provider"] as? String ?: "unknown",
        )
    }

    fun isValid(token: String): Boolean = try {
        parseClaims(token)
        true
    } catch (_: Exception) {
        false
    }

    fun tokenValiditySeconds(): Long = jwtProperties.accessTokenValiditySeconds

    private fun parseClaims(token: String): Claims {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .payload
    }
}
