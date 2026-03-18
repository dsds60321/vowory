package com.gh.wedding.repository

import com.gh.wedding.domain.ThankyouCard
import org.springframework.data.jpa.repository.JpaRepository

interface ThankyouCardRepository : JpaRepository<ThankyouCard, Long> {
    fun findBySlug(slug: String): ThankyouCard?
    fun existsBySlug(slug: String): Boolean
    fun existsBySlugAndIdNot(slug: String, id: Long): Boolean
    fun findByIdAndUserId(id: Long, userId: String): ThankyouCard?
    fun findByUserIdOrderByCreatedAtDesc(userId: String): List<ThankyouCard>
}
