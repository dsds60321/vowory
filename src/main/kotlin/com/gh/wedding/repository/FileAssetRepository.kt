package com.gh.wedding.repository

import com.gh.wedding.domain.FileAsset
import com.gh.wedding.domain.FileAssetOwnerType
import com.gh.wedding.domain.FileAssetStatus
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime

interface FileAssetRepository : JpaRepository<FileAsset, Long> {
    fun existsByUserIdAndPublicUrlAndStatus(
        userId: String,
        publicUrl: String,
        status: FileAssetStatus,
    ): Boolean

    fun findByOwnerTypeAndOwnerIdAndStatusIn(
        ownerType: FileAssetOwnerType,
        ownerId: Long,
        statuses: Collection<FileAssetStatus>,
    ): List<FileAsset>

    fun findByStatusInAndPurgeAfterLessThanEqualOrderByPurgeAfterAscCreatedAtAsc(
        statuses: Collection<FileAssetStatus>,
        purgeAfter: LocalDateTime,
        pageable: Pageable,
    ): List<FileAsset>
}
