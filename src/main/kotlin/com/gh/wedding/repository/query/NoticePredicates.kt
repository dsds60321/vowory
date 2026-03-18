package com.gh.wedding.repository.query

import com.gh.wedding.domain.NoticeStatus
import com.gh.wedding.domain.QNotice
import com.querydsl.core.types.dsl.BooleanExpression
import java.time.LocalDateTime

object NoticePredicates {
    fun currentVisible(now: LocalDateTime, notice: QNotice): BooleanExpression {
        return notice.status.eq(NoticeStatus.PUBLISHED)
            .and(notice.startAt.loe(now))
            .and(notice.endAt.isNull.or(notice.endAt.goe(now)))
    }

    fun currentBannerVisible(now: LocalDateTime, notice: QNotice): BooleanExpression {
        return currentVisible(now, notice).and(notice.isBanner.isTrue)
    }
}
