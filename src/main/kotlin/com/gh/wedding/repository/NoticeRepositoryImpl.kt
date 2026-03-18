package com.gh.wedding.repository

import com.gh.wedding.domain.Notice
import com.gh.wedding.domain.NoticeStatus
import com.gh.wedding.domain.QNotice
import com.gh.wedding.repository.query.NoticePredicates
import com.querydsl.core.BooleanBuilder
import com.querydsl.core.types.OrderSpecifier
import com.querydsl.jpa.impl.JPAQueryFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

@Repository
class NoticeRepositoryImpl(
    private val queryFactory: JPAQueryFactory,
) : NoticeQueryRepository {
    private val notice = QNotice("notice")

    override fun findCurrentVisible(pageable: Pageable): Page<Notice> {
        val now = LocalDateTime.now()
        val predicate = NoticePredicates.currentVisible(now, notice)

        val rows = queryFactory
            .selectFrom(notice)
            .where(predicate)
            .orderBy(*resolveOrderSpecifiers(pageable, notice.startAt.desc(), notice.id.desc()))
            .offset(pageable.offset)
            .limit(pageable.pageSize.toLong())
            .fetch()

        val total = queryFactory
            .select(notice.count())
            .from(notice)
            .where(predicate)
            .fetchOne() ?: 0L

        return PageImpl(rows, pageable, total)
    }

    override fun findCurrentVisibleById(id: Long): Notice? {
        val now = LocalDateTime.now()
        return queryFactory
            .selectFrom(notice)
            .where(
                notice.id.eq(id)
                    .and(NoticePredicates.currentVisible(now, notice)),
            )
            .fetchOne()
    }

    override fun findCurrentVisibleBanners(): List<Notice> {
        val now = LocalDateTime.now()
        return queryFactory
            .selectFrom(notice)
            .where(NoticePredicates.currentBannerVisible(now, notice))
            .orderBy(notice.startAt.desc(), notice.id.desc())
            .fetch()
    }

    override fun findAdminPage(
        keyword: String?,
        status: NoticeStatus?,
        isBanner: Boolean?,
        pageable: Pageable,
    ): Page<Notice> {
        val builder = BooleanBuilder()

        if (!keyword.isNullOrBlank()) {
            val normalized = keyword.trim()
            builder.and(
                notice.title.containsIgnoreCase(normalized)
                    .or(notice.content.containsIgnoreCase(normalized)),
            )
        }

        if (status != null) {
            builder.and(notice.status.eq(status))
        }

        if (isBanner != null) {
            builder.and(notice.isBanner.eq(isBanner))
        }

        val rows = queryFactory
            .selectFrom(notice)
            .where(builder)
            .orderBy(*resolveOrderSpecifiers(pageable, notice.createdAt.desc(), notice.id.desc()))
            .offset(pageable.offset)
            .limit(pageable.pageSize.toLong())
            .fetch()

        val total = queryFactory
            .select(notice.count())
            .from(notice)
            .where(builder)
            .fetchOne() ?: 0L

        return PageImpl(rows, pageable, total)
    }

    private fun resolveOrderSpecifiers(pageable: Pageable, vararg fallback: OrderSpecifier<*>): Array<OrderSpecifier<*>> {
        if (!pageable.sort.isSorted) {
            return fallback.toList().toTypedArray()
        }

        val mapped = pageable.sort.mapNotNull { sort ->
            mapSort(sort)
        }.toList()

        if (mapped.isEmpty()) {
            return fallback.toList().toTypedArray()
        }

        return mapped.toTypedArray()
    }

    private fun mapSort(sort: Sort.Order): OrderSpecifier<*>? {
        val asc = sort.isAscending
        return when (sort.property) {
            "id" -> if (asc) notice.id.asc() else notice.id.desc()
            "title" -> if (asc) notice.title.asc() else notice.title.desc()
            "status" -> if (asc) notice.status.asc() else notice.status.desc()
            "startAt", "start_at" -> if (asc) notice.startAt.asc() else notice.startAt.desc()
            "endAt", "end_at" -> if (asc) notice.endAt.asc() else notice.endAt.desc()
            "createdAt", "created_at" -> if (asc) notice.createdAt.asc() else notice.createdAt.desc()
            "updatedAt", "updated_at" -> if (asc) notice.updatedAt.asc() else notice.updatedAt.desc()
            "isBanner", "is_banner" -> if (asc) notice.isBanner.asc() else notice.isBanner.desc()
            else -> null
        }
    }
}
