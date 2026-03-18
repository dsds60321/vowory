package com.gh.wedding.service

import com.gh.wedding.common.WeddingErrorCode
import com.gh.wedding.common.WeddingException
import com.gh.wedding.config.UploadPolicyProperties
import com.gh.wedding.config.StorageProperties
import com.gh.wedding.service.storage.StorageService
import net.coobird.thumbnailator.Thumbnails
import org.springframework.stereotype.Service
import org.springframework.util.StringUtils
import org.springframework.web.multipart.MultipartFile
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

data class StoredFileResult(
    val publicUrl: String,
    val storagePath: String,
    val contentType: String,
    val sizeBytes: Long,
)

@Service
class FileService(
    private val storageService: StorageService,
    private val storageProperties: StorageProperties,
    private val uploadPolicyProperties: UploadPolicyProperties,
) {
    fun upload(file: MultipartFile?, userId: String?, invitationId: String?): String? {
        return uploadImage(file, userId, invitationId, "common")
    }

    fun uploadImage(file: MultipartFile?, userId: String?, invitationId: String?, slot: String): String? {
        return uploadImageResult(file, userId, invitationId, slot)?.publicUrl
    }

    fun uploadImageResult(file: MultipartFile?, userId: String?, invitationId: String?, slot: String): StoredFileResult? {
        if (file == null || file.isEmpty) return null
        validateFileSize(file, uploadPolicyProperties.imageMaxBytes, "이미지")
        validateAllowedContentType(file.contentType, uploadPolicyProperties.allowedImageContentTypes, "이미지")

        val relativePath = buildRelativePath(
            userId = userId,
            invitationId = invitationId,
            category = "images/${sanitizeSegment(slot, "common")}",
            extension = "jpg",
        )

        val compressedBytes = file.inputStream.use { input ->
            compressImage(input)
        }
        val publicUrl = storageService.store(relativePath, compressedBytes, "image/jpeg")
        return StoredFileResult(
            publicUrl = publicUrl,
            storagePath = relativePath,
            contentType = "image/jpeg",
            sizeBytes = compressedBytes.size.toLong(),
        )
    }

    fun uploadRaw(
        file: MultipartFile?,
        userId: String?,
        invitationId: String?,
        category: String = "files",
        requiredContentTypePrefix: String? = null,
    ): String? {
        return uploadRawResult(file, userId, invitationId, category, requiredContentTypePrefix)?.publicUrl
    }

    fun uploadRawResult(
        file: MultipartFile?,
        userId: String?,
        invitationId: String?,
        category: String = "files",
        requiredContentTypePrefix: String? = null,
    ): StoredFileResult? {
        if (file == null || file.isEmpty) return null
        requiredContentTypePrefix?.let {
            if (it.equals("audio/", ignoreCase = true)) {
                validateFileSize(file, uploadPolicyProperties.audioMaxBytes, "오디오")
                validateAllowedContentType(file.contentType, uploadPolicyProperties.allowedAudioContentTypes, "오디오")
            } else {
                validateContentTypePrefix(file.contentType, it)
            }
        }

        val extension = resolveExtension(file.originalFilename, file.contentType)
        val relativePath = buildRelativePath(
            userId = userId,
            invitationId = invitationId,
            category = category,
            extension = extension,
        )

        val contentType = file.contentType ?: "application/octet-stream"
        val bytes = file.bytes
        val publicUrl = storageService.store(relativePath, bytes, contentType)
        return StoredFileResult(
            publicUrl = publicUrl,
            storagePath = relativePath,
            contentType = contentType,
            sizeBytes = bytes.size.toLong(),
        )
    }

    fun processUrl(url: String?): String? {
        if (!StringUtils.hasText(url)) return url

        val resolved = url!!.trim()
        if (resolved.isBlank()) return null

        // 기존 데이터 호환: 이미 저장된 URL(uploads/S3/CloudFront)은 그대로 유지
        return resolved
    }

    private fun compressImage(input: InputStream): ByteArray {
        val output = ByteArrayOutputStream()
        Thumbnails.of(input)
            .size(1920, 1920)
            .outputFormat("jpg")
            .outputQuality(0.84)
            .toOutputStream(output)
        return output.toByteArray()
    }

    private fun buildRelativePath(userId: String?, invitationId: String?, category: String, extension: String): String {
        val pathPrefix = sanitizeOptionalSegment(storageProperties.pathPrefix)
        val safeUserId = sanitizeSegment(userId, "anonymous")
        val safeInvitationId = sanitizeSegment(invitationId, "common")
        val safeCategory = sanitizePath(category)
        val timestampFolder = LocalDateTime.now().format(PATH_TIMESTAMP_FORMATTER)

        val segments = mutableListOf<String>()
        if (!pathPrefix.isNullOrBlank()) {
            segments.add(pathPrefix)
        }
        segments.addAll(
            listOf(
                "users",
                safeUserId,
                "invitations",
                safeInvitationId,
                safeCategory,
                timestampFolder,
                "${UUID.randomUUID()}.$extension",
            ),
        )
        return segments.joinToString("/")
    }

    private fun sanitizePath(rawPath: String): String {
        val normalized = rawPath
            .replace("\\", "/")
            .split("/")
            .filter { it.isNotBlank() }
            .map { sanitizeSegment(it, "common") }

        return if (normalized.isEmpty()) "files" else normalized.joinToString("/")
    }

    private fun sanitizeSegment(raw: String?, fallback: String): String {
        val normalized = raw
            ?.trim()
            ?.lowercase()
            ?.replace(Regex("[^a-z0-9._-]"), "-")
            ?.replace(Regex("-+"), "-")
            ?.trim('-')
            ?.take(64)

        return if (normalized.isNullOrBlank()) fallback else normalized
    }

    private fun sanitizeOptionalSegment(raw: String?): String? {
        val normalized = raw
            ?.trim()
            ?.lowercase()
            ?.replace(Regex("[^a-z0-9._-]"), "-")
            ?.replace(Regex("-+"), "-")
            ?.trim('-')
            ?.take(64)
        return normalized?.takeIf { it.isNotBlank() }
    }

    private fun resolveExtension(originalFilename: String?, contentType: String?): String {
        val fromFilename = extractExtension(originalFilename)
        if (fromFilename != null) return fromFilename

        val fromMime = when (contentType?.lowercase()) {
            "audio/mpeg" -> "mp3"
            "audio/mp4" -> "m4a"
            "audio/wav", "audio/x-wav" -> "wav"
            "audio/ogg" -> "ogg"
            else -> null
        }

        return fromMime ?: "bin"
    }

    private fun extractExtension(originalFilename: String?): String? {
        if (originalFilename.isNullOrBlank()) return null
        val candidate = originalFilename.substringAfterLast('.', "").lowercase()
        if (candidate.isBlank()) return null
        if (!candidate.matches(Regex("^[a-z0-9]{1,8}$"))) return null
        return candidate
    }

    private fun validateContentTypePrefix(contentType: String?, expectedPrefix: String) {
        if (contentType.isNullOrBlank() || !contentType.lowercase().startsWith(expectedPrefix.lowercase())) {
            throw WeddingException(WeddingErrorCode.FILE_UPLOAD_ERROR, "올바른 파일 형식이 아닙니다. ($expectedPrefix)")
        }
    }

    private fun validateAllowedContentType(contentType: String?, allowed: List<String>, label: String) {
        if (contentType.isNullOrBlank()) {
            throw WeddingException(WeddingErrorCode.FILE_UPLOAD_ERROR, "$label 파일의 Content-Type이 비어 있습니다.")
        }

        val normalized = contentType.lowercase()
        val allowedNormalized = allowed.map { it.lowercase() }
        if (!allowedNormalized.contains(normalized)) {
            throw WeddingException(
                WeddingErrorCode.FILE_UPLOAD_ERROR,
                "$label 파일 형식이 허용되지 않습니다. 허용 형식: ${allowed.joinToString(", ")}",
            )
        }
    }

    private fun validateFileSize(file: MultipartFile, maxBytes: Long, label: String) {
        if (file.size > maxBytes) {
            val maxMb = (maxBytes / (1024.0 * 1024.0))
            throw WeddingException(
                WeddingErrorCode.FILE_UPLOAD_ERROR,
                "$label 파일 크기가 제한을 초과했습니다. 최대 %.1fMB".format(maxMb),
            )
        }
    }

    companion object {
        private val PATH_TIMESTAMP_FORMATTER: DateTimeFormatter =
            DateTimeFormatter.ofPattern("yyyy_MM_dd_HH_mm_ss")
    }
}
