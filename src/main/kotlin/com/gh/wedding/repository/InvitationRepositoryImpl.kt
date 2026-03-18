package com.gh.wedding.repository

import com.gh.wedding.domain.QInvitation
import com.gh.wedding.domain.QInvitationPublication
import com.querydsl.core.types.Projections
import com.querydsl.jpa.impl.JPAQueryFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Repository

@Repository
class InvitationRepositoryImpl(
    private val queryFactory: JPAQueryFactory,
) : InvitationAdminQueryRepository {
    private val invitation = QInvitation("invitation")
    private val invitationPublication = QInvitationPublication("invitationPublication")

    override fun findAdminInvitationsByUserId(userId: String, pageable: Pageable): Page<AdminUserInvitationSummaryRow> {
        val rows = queryFactory
            .select(
                Projections.constructor(
                    AdminUserInvitationSummaryRow::class.java,
                    invitation.id,
                    invitation.slug,
                    invitation.createdAt,
                    invitationPublication.id.isNotNull,
                    invitationPublication.publishedAt,
                    invitationPublication.watermarkEnabled,
                ),
            )
            .from(invitation)
            .leftJoin(invitation.publishedVersion, invitationPublication)
            .where(invitation.userId.eq(userId))
            .orderBy(invitation.createdAt.desc(), invitation.id.desc())
            .offset(pageable.offset)
            .limit(pageable.pageSize.toLong())
            .fetch()

        val total = queryFactory
            .select(invitation.count())
            .from(invitation)
            .where(invitation.userId.eq(userId))
            .fetchOne() ?: 0L

        return PageImpl(rows, pageable, total)
    }
}
