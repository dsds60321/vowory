package com.gh.wedding.service.storage

import com.gh.wedding.config.StorageProperties
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectRequest

@Service
@ConditionalOnProperty(prefix = "app.storage", name = ["type"], havingValue = "s3")
class S3StorageService(
    private val s3Client: S3Client,
    private val storageProperties: StorageProperties,
) : StorageService {

    override fun store(relativePath: String, bytes: ByteArray, contentType: String): String {
        val bucket = storageProperties.s3.bucket.trim()
        if (bucket.isBlank()) {
            throw IllegalStateException("S3 bucket is required when app.storage.type=s3")
        }

        val normalized = normalize(relativePath)
        val key = resolveObjectKey(normalized)

        val request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(contentType)
            .build()

        s3Client.putObject(request, RequestBody.fromBytes(bytes))

        return resolvePublicUrl(bucket, key)
    }

    override fun delete(relativePath: String) {
        val bucket = storageProperties.s3.bucket.trim()
        if (bucket.isBlank()) {
            throw IllegalStateException("S3 bucket is required when app.storage.type=s3")
        }

        val normalized = normalize(relativePath)
        val key = resolveObjectKey(normalized)

        val request = DeleteObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build()
        s3Client.deleteObject(request)
    }

    private fun normalize(value: String): String {
        return value
            .replace("\\", "/")
            .split("/")
            .filter { it.isNotBlank() }
            .joinToString("/")
    }

    private fun resolveObjectKey(relativePath: String): String {
        val prefix = storageProperties.s3.prefix.trim().trim('/').takeIf { it.isNotBlank() } ?: return relativePath
        return if (relativePath == prefix || relativePath.startsWith("$prefix/")) relativePath else "$prefix/$relativePath"
    }

    private fun resolvePublicUrl(bucket: String, key: String): String {
        val publicBaseUrl = storageProperties.s3.publicBaseUrl.trim().trimEnd('/')
        if (publicBaseUrl.isNotBlank()) {
            return "$publicBaseUrl/$key"
        }

        val endpoint = storageProperties.s3.endpoint.trim().trimEnd('/')
        if (endpoint.isNotBlank()) {
            return "$endpoint/$bucket/$key"
        }

        return "https://$bucket.s3.${storageProperties.s3.region}.amazonaws.com/$key"
    }
}
