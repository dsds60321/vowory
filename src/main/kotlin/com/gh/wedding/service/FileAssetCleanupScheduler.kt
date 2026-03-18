package com.gh.wedding.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class FileAssetCleanupScheduler(
    private val fileAssetService: FileAssetService,
    @Value("\${app.storage.cleanup-enabled:true}")
    private val cleanupEnabled: Boolean,
    @Value("\${app.storage.cleanup-batch-size:50}")
    private val cleanupBatchSize: Int,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(cron = "\${app.storage.cleanup-cron:0 */30 * * * *}")
    fun purgeExpiredAssets() {
        if (!cleanupEnabled) return

        val deletedCount = fileAssetService.purgeExpiredAssets(cleanupBatchSize)
        if (deletedCount > 0) {
            log.info("File asset cleanup finished. deletedCount={}", deletedCount)
        }
    }
}
