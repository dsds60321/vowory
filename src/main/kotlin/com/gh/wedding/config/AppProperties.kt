package com.gh.wedding.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.jwt")
data class JwtProperties(
    var secret: String = "change-this-secret-change-this-secret-change-this-secret",
    var accessTokenValiditySeconds: Long = 60L * 60L * 24L * 7L,
    var cookieDomain: String? = null,
)

@ConfigurationProperties(prefix = "app.oauth2")
data class OAuth2Properties(
    var successRedirectUri: String = "https://vowory.com/",
)

@ConfigurationProperties(prefix = "app.frontend")
data class FrontendProperties(
    var origin: String = "https://vowory.com",
)

@ConfigurationProperties(prefix = "app.admin")
data class AdminProperties(
    var userIds: List<String> = emptyList(),
)

@ConfigurationProperties(prefix = "app.watermark")
data class WatermarkPolicyProperties(
    var text: String = "Wedding Letter",
)

@ConfigurationProperties(prefix = "third-party.kakao")
data class KakaoProperties(
    var js: String = "",
)

@ConfigurationProperties(prefix = "app.storage")
data class StorageProperties(
    var type: String = "local",
    var pathPrefix: String = "wedding",
    var localBasePath: String = "uploads",
    var localPublicPrefix: String = "/uploads",
    var s3: S3StorageProperties = S3StorageProperties(),
)

@ConfigurationProperties(prefix = "app.upload")
data class UploadPolicyProperties(
    var imageMaxBytes: Long = 10L * 1024L * 1024L,
    var audioMaxBytes: Long = 20L * 1024L * 1024L,
    var allowedImageContentTypes: List<String> = listOf("image/jpeg", "image/png", "image/webp"),
    var allowedAudioContentTypes: List<String> = listOf(
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/mp4",
        "audio/x-m4a",
        "audio/ogg",
    ),
)

@ConfigurationProperties(prefix = "app.mail")
data class MailNotificationProperties(
    var enabled: Boolean = true,
    var errorTo: String = "",
    var from: String = "",
    var signupSubject: String = "[vowory] 신규 회원가입 알림",
    var errorSubject: String = "[vowory] API 오류 알림",
    var errorStackTraceLineLimit: Int = 12,
)

data class S3StorageProperties(
    var bucket: String = "",
    var region: String = "ap-northeast-2",
    var endpoint: String = "",
    var prefix: String = "",
    var publicBaseUrl: String = "",
    var accessKeyId: String = "",
    var secretAccessKey: String = "",
    var sessionToken: String = "",
)
