package com.gh.wedding.repository

import com.gh.wedding.domain.Invitation
import org.springframework.data.jpa.repository.JpaRepository

interface InvitationRepository : JpaRepository<Invitation, Long>, InvitationAdminQueryRepository {
    fun findBySlug(slug: String): Invitation?
    fun existsBySlug(slug: String): Boolean
    fun existsBySlugAndIdNot(slug: String, id: Long): Boolean
    fun findByIdAndUserId(id: Long, userId: String): Invitation?
    fun findByUserIdOrderByCreatedAtDesc(userId: String): List<Invitation>
}
