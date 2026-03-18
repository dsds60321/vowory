package com.gh.wedding.repository

import com.gh.wedding.domain.UserUsage
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.data.jpa.repository.JpaRepository

interface UserUsageRepository : JpaRepository<UserUsage, Long> {
    fun findByUserIdAndPeriod(userId: String, period: String): UserUsage?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        """
        select uu
        from UserUsage uu
        where uu.userId = :userId
          and uu.period = :period
        """,
    )
    fun findByUserIdAndPeriodForUpdate(
        @Param("userId") userId: String,
        @Param("period") period: String,
    ): UserUsage?
}
