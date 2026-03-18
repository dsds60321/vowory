package com.gh.wedding.service

import com.gh.wedding.domain.FileAsset
import com.gh.wedding.domain.FileAssetOwnerType
import com.gh.wedding.domain.FileAssetStatus
import com.gh.wedding.repository.FileAssetRepository
import com.gh.wedding.service.storage.StorageService
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Transactional
class FileAssetService(
    private val fileAssetRepository: FileAssetRepository,
    private val storageService: StorageService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun registerUploadedFile(
        ownerType: FileAssetOwnerType,
        ownerId: Long,
        userId: String?,
        storagePath: String,
        publicUrl: String,
    ) {
        if (storagePath.isBlank() || publicUrl.isBlank()) return

        fileAssetRepository.save(
            FileAsset(
                ownerType = ownerType,
                ownerId = ownerId,
                userId = userId,
                storagePath = storagePath.trim(),
                publicUrl = publicUrl.trim(),
                status = FileAssetStatus.ACTIVE,
            ),
        )
    }

    @Transactional(readOnly = true)
    fun isOwnedActiveAssetUrl(userId: String, publicUrl: String): Boolean {
        val normalizedUserId = userId.trim()
        val normalizedPublicUrl = publicUrl.trim()
        if (normalizedUserId.isBlank() || normalizedPublicUrl.isBlank()) return false

        return fileAssetRepository.existsByUserIdAndPublicUrlAndStatus(
            userId = normalizedUserId,
            publicUrl = normalizedPublicUrl,
            status = FileAssetStatus.ACTIVE,
        )
    }

    fun scheduleDeletion(ownerType: FileAssetOwnerType, ownerId: Long) {
        val now = LocalDateTime.now()
        val purgeAfter = now.plusDays(FILE_RETENTION_DAYS)
        val assets = fileAssetRepository.findByOwnerTypeAndOwnerIdAndStatusIn(
            ownerType = ownerType,
            ownerId = ownerId,
            statuses = listOf(FileAssetStatus.ACTIVE, FileAssetStatus.DELETE_FAILED),
        )

        assets.forEach { asset ->
            asset.status = FileAssetStatus.DELETE_PENDING
            asset.deleteRequestedAt = now
            asset.purgeAfter = purgeAfter
            asset.lastError = null
            asset.deletedAt = null
        }
    }

    fun purgeExpiredAssets(batchSize: Int = DEFAULT_BATCH_SIZE): Int {
        val safeBatchSize = batchSize.coerceIn(1, MAX_BATCH_SIZE)
        val now = LocalDateTime.now()
        val candidates = fileAssetRepository.findByStatusInAndPurgeAfterLessThanEqualOrderByPurgeAfterAscCreatedAtAsc(
            statuses = listOf(FileAssetStatus.DELETE_PENDING, FileAssetStatus.DELETE_FAILED),
            purgeAfter = now,
            pageable = PageRequest.of(0, safeBatchSize),
        )

        if (candidates.isEmpty()) return 0

        candidates.forEach { asset ->
            runCatching {
                storageService.delete(asset.storagePath)
            }.onSuccess {
                asset.status = FileAssetStatus.DELETED
                asset.deletedAt = now
                asset.lastError = null
            }.onFailure { throwable ->
                asset.status = FileAssetStatus.DELETE_FAILED
                asset.lastError = throwable.message?.take(MAX_ERROR_LENGTH) ?: "unknown storage delete error"
                log.warn(
                    "Failed to delete file asset id={} ownerType={} ownerId={} path={}",
                    asset.id,
                    asset.ownerType,
                    asset.ownerId,
                    asset.storagePath,
                    throwable,
                )
            }
        }

        return candidates.size
    }

    companion object {
        private const val FILE_RETENTION_DAYS = 7L
        private const val DEFAULT_BATCH_SIZE = 50
        private const val MAX_BATCH_SIZE = 500
        private const val MAX_ERROR_LENGTH = 2000
    }
}
