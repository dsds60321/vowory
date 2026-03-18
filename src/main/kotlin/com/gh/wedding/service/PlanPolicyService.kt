package com.gh.wedding.service

import com.gh.wedding.common.WeddingErrorCode
import com.gh.wedding.common.WeddingException
import com.gh.wedding.domain.Plan
import com.gh.wedding.domain.UserAccount
import com.gh.wedding.domain.UserRole
import com.gh.wedding.domain.UserSubscriptionStatus
import com.gh.wedding.domain.UserUsage
import com.gh.wedding.repository.PlanRepository
import com.gh.wedding.repository.UserAccountRepository
import com.gh.wedding.repository.UserSubscriptionRepository
import com.gh.wedding.repository.UserUsageRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.time.YearMonth
import java.time.format.DateTimeFormatter

@Service
@Transactional
class PlanPolicyService(
    private val planRepository: PlanRepository,
    private val userSubscriptionRepository: UserSubscriptionRepository,
    private val userUsageRepository: UserUsageRepository,
    private val userAccountRepository: UserAccountRepository,
    private val adminAuthorizationService: AdminAuthorizationService,
) {
    private val periodFormatter = DateTimeFormatter.ofPattern("yyyyMM")

    @Transactional(readOnly = true)
    fun getActivePlan(userId: String): Plan {
        val now = LocalDateTime.now()
        val activeSubscriptionPlan = userSubscriptionRepository
            .findActiveSubscriptions(userId, UserSubscriptionStatus.ACTIVE, now)
            .firstOrNull()
            ?.plan

        if (activeSubscriptionPlan != null && activeSubscriptionPlan.isActive) {
            return activeSubscriptionPlan
        }

        return planRepository.findByCodeAndIsActiveTrue("FREE")
            ?: planRepository.findFirstByIsActiveTrueOrderByIdAsc()
            ?: throw WeddingException(WeddingErrorCode.SERVER_ERROR, "활성 플랜을 찾을 수 없습니다.")
    }

    fun currentPeriod(): String {
        return YearMonth.now().format(periodFormatter)
    }

    fun getOrCreateUsage(userId: String, period: String): UserUsage {
        userUsageRepository.findByUserIdAndPeriodForUpdate(userId, period)?.let { return it }

        ensureUserAccountExists(userId)

        return try {
            userUsageRepository.saveAndFlush(
                UserUsage(
                    userId = userId,
                    period = period,
                    createdCount = 0,
                    editCount = 0,
                    publishCount = 0,
                ),
            )
        } catch (_: DataIntegrityViolationException) {
            userUsageRepository.findByUserIdAndPeriodForUpdate(userId, period)
                ?: throw WeddingException(WeddingErrorCode.SERVER_ERROR, "사용량 정보를 생성할 수 없습니다.")
        }
    }

    fun checkCreateLimit(userId: String) {
        if (isLimitExempt(userId)) return
        val plan = getActivePlan(userId)
        val usage = getOrCreateUsage(userId, currentPeriod())
        checkLimit(
            limit = plan.invitationCreateLimit,
            current = usage.createdCount,
            actionLabel = "청첩장 등록",
        )
    }

    fun checkEditLimit(userId: String) {
        if (isLimitExempt(userId)) return
        val plan = getActivePlan(userId)
        val usage = getOrCreateUsage(userId, currentPeriod())
        checkLimit(
            limit = plan.invitationEditLimit,
            current = usage.editCount,
            actionLabel = "청첩장 수정",
        )
    }

    fun checkPublishLimit(userId: String) {
        if (isLimitExempt(userId)) return
        val plan = getActivePlan(userId)
        val usage = getOrCreateUsage(userId, currentPeriod())
        checkLimit(
            limit = plan.invitationPublishLimit,
            current = usage.publishCount,
            actionLabel = "청첩장 발행",
        )
    }

    fun incrementCreateCount(userId: String) {
        if (isLimitExempt(userId)) return
        val usage = getOrCreateUsage(userId, currentPeriod())
        usage.createdCount += 1
    }

    fun incrementEditCount(userId: String) {
        if (isLimitExempt(userId)) return
        val usage = getOrCreateUsage(userId, currentPeriod())
        usage.editCount += 1
    }

    fun incrementPublishCount(userId: String) {
        if (isLimitExempt(userId)) return
        val usage = getOrCreateUsage(userId, currentPeriod())
        usage.publishCount += 1
    }

    private fun checkLimit(limit: Int, current: Int, actionLabel: String) {
        if (limit > 0 && current >= limit) {
            throw WeddingException(
                WeddingErrorCode.INVALID_INPUT,
                "$actionLabel 제한을 초과했습니다. 현재 플랜의 월 최대 허용량은 ${limit}회입니다.",
            )
        }
    }

    private fun ensureUserAccountExists(userId: String) {
        if (userAccountRepository.existsById(userId)) {
            return
        }

        userAccountRepository.save(
            UserAccount(
                id = userId,
                role = UserRole.USER,
                isActive = true,
            ),
        )
    }

    private fun isLimitExempt(userId: String): Boolean {
        return adminAuthorizationService.isAdmin(userId)
    }
}
