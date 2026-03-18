package com.gh.wedding.config

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.slf4j.LoggerFactory
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Configuration
import software.amazon.awssdk.services.s3.S3Client
import java.net.URI
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

@Configuration
class StorageConfig {
    private val log = LoggerFactory.getLogger(javaClass)
    @Bean
    @ConditionalOnProperty(prefix = "app.storage", name = ["type"], havingValue = "s3")
    fun s3Client(storageProperties: StorageProperties): S3Client {
        val credentialsProvider = resolveCredentialsProvider(storageProperties)
        val endpoint = storageProperties.s3.endpoint.trim().trimEnd('/').takeIf { it.isNotBlank() }
        val region = storageProperties.s3.region.trim().ifBlank { "ap-northeast-2" }
        val bucket = storageProperties.s3.bucket.trim()
        val builder = S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(credentialsProvider)

        log.info("S3 client init: bucket={}, region={}, endpoint={}", bucket.ifBlank { "(blank)" }, region, endpoint ?: "(default)")

        if (endpoint != null) {
            val endpointUri = runCatching { URI.create(endpoint) }
                .getOrElse { throw IllegalStateException("Invalid app.storage.s3.endpoint: $endpoint", it) }

            // R2/호환 스토리지 대응: path-style + chunked encoding 비활성화
            builder.endpointOverride(endpointUri)
            builder.serviceConfiguration(
                S3Configuration.builder()
                    .pathStyleAccessEnabled(true)
                    .chunkedEncodingEnabled(false)
                    .build(),
            )
        }

        return builder.build()
    }

    private fun resolveCredentialsProvider(storageProperties: StorageProperties): AwsCredentialsProvider {
        val profileName = System.getenv("AWS_PROFILE")?.trim()?.takeIf { it.isNotBlank() } ?: "default"

        // 우선순위: app.storage.s3.* > AWS 환경변수 > ~/.aws/credentials > ~/.aws/config > AWS 기본 체인
        resolveCredentialsProviderFromStorageProperties(storageProperties)?.let { return it }
        resolveCredentialsProviderFromEnvironment()?.let { return it }
        resolveCredentialsProviderFromAwsCredentials(profileName)?.let { return it }
        resolveCredentialsProviderFromAwsConfig(profileName)?.let { return it }
        log.info("AWS credentials loaded from DefaultCredentialsProvider chain")
        return DefaultCredentialsProvider.create()
    }

    private fun resolveCredentialsProviderFromStorageProperties(storageProperties: StorageProperties): AwsCredentialsProvider? {
        val accessKeyId = storageProperties.s3.accessKeyId.trim()
        val secretAccessKey = storageProperties.s3.secretAccessKey.trim()
        val sessionToken = storageProperties.s3.sessionToken.trim()

        if (accessKeyId.isBlank() || secretAccessKey.isBlank()) {
            return null
        }

        return toStaticCredentialsProvider(
            accessKeyId = accessKeyId,
            secretAccessKey = secretAccessKey,
            sessionToken = sessionToken.takeIf { it.isNotBlank() },
            source = "app.storage.s3.*",
        )
    }

    private fun resolveCredentialsProviderFromEnvironment(): AwsCredentialsProvider? {
        val accessKeyId = System.getenv("AWS_ACCESS_KEY_ID")?.trim().orEmpty()
        val secretAccessKey = System.getenv("AWS_SECRET_ACCESS_KEY")?.trim().orEmpty()
        val sessionToken = System.getenv("AWS_SESSION_TOKEN")?.trim()

        if (accessKeyId.isBlank() || secretAccessKey.isBlank()) {
            return null
        }

        return toStaticCredentialsProvider(
            accessKeyId = accessKeyId,
            secretAccessKey = secretAccessKey,
            sessionToken = sessionToken?.takeIf { it.isNotBlank() },
            source = "AWS_* environment variables",
        )
    }

    private fun resolveCredentialsProviderFromAwsCredentials(profileName: String): AwsCredentialsProvider? {
        val home = System.getProperty("user.home") ?: return null
        val credentialsPath = Paths.get(home, ".aws", "credentials")
        if (!Files.exists(credentialsPath)) return null

        val sectionValues = readProfileSection(credentialsPath, setOf(profileName)) ?: return null
        return toStaticCredentialsProvider(sectionValues, "~/.aws/credentials", profileName)
    }

    private fun resolveCredentialsProviderFromAwsConfig(profileName: String): AwsCredentialsProvider? {
        val home = System.getProperty("user.home") ?: return null
        val configPath = Paths.get(home, ".aws", "config")
        if (!Files.exists(configPath)) return null

        val sectionValues = readProfileSection(configPath, setOf(profileName, "profile $profileName")) ?: return null
        return toStaticCredentialsProvider(sectionValues, "~/.aws/config", profileName)
    }

    private fun toStaticCredentialsProvider(
        sectionValues: Map<String, String>,
        source: String,
        profileName: String,
    ): AwsCredentialsProvider? {
        val accessKeyId = sectionValues["aws_access_key_id"]?.trim()
        val secretAccessKey = sectionValues["aws_secret_access_key"]?.trim()
        if (accessKeyId.isNullOrBlank() || secretAccessKey.isNullOrBlank()) {
            return null
        }

        val sessionToken = sectionValues["aws_session_token"]?.trim()
        return toStaticCredentialsProvider(
            accessKeyId = accessKeyId,
            secretAccessKey = secretAccessKey,
            sessionToken = sessionToken?.takeIf { it.isNotBlank() },
            source = "$source profile=$profileName",
        )
    }

    private fun toStaticCredentialsProvider(
        accessKeyId: String,
        secretAccessKey: String,
        sessionToken: String?,
        source: String,
    ): AwsCredentialsProvider {
        val credentials = if (sessionToken.isNullOrBlank()) {
            AwsBasicCredentials.create(accessKeyId, secretAccessKey)
        } else {
            AwsSessionCredentials.create(accessKeyId, secretAccessKey, sessionToken)
        }

        log.info("AWS credentials loaded from {}", source)
        return StaticCredentialsProvider.create(credentials)
    }

    private fun readProfileSection(path: Path, targetSections: Set<String>): Map<String, String>? {
        var currentSection: String? = null
        val values = linkedMapOf<String, String>()

        Files.readAllLines(path).forEach { rawLine ->
            val line = rawLine.trim()
            if (line.isBlank() || line.startsWith("#") || line.startsWith(";")) return@forEach

            if (line.startsWith("[") && line.endsWith("]")) {
                currentSection = line.substring(1, line.length - 1).trim()
                return@forEach
            }

            if (currentSection !in targetSections) return@forEach

            val delimiterIndex = line.indexOf('=')
            if (delimiterIndex <= 0) return@forEach

            val key = line.substring(0, delimiterIndex).trim().lowercase()
            val value = line.substring(delimiterIndex + 1).trim()
            if (key.isNotBlank() && value.isNotBlank()) {
                values[key] = value
            }
        }

        return values.takeIf { it.isNotEmpty() }
    }
}
