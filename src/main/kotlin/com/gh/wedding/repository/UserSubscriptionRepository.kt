package com.gh.wedding.repository

import com.gh.wedding.domain.UserSubscription
import com.gh.wedding.domain.UserSubscriptionStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface UserSubscriptionRepository : JpaRepository<UserSubscription, Long> {
    @Query(
        """
        select us
        from UserSubscription us
        join fetch us.plan p
        where us.userId = :userId
          and us.status = :status
          and us.startedAt <= :now
          and (us.endedAt is null or us.endedAt >= :now)
        order by us.startedAt desc
        """,
    )
    fun findActiveSubscriptions(
        @Param("userId") userId: String,
        @Param("status") status: UserSubscriptionStatus,
        @Param("now") now: LocalDateTime,
    ): List<UserSubscription>
}
