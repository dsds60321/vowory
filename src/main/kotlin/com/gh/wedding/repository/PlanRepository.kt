package com.gh.wedding.repository

import com.gh.wedding.domain.Plan
import org.springframework.data.jpa.repository.JpaRepository

interface PlanRepository : JpaRepository<Plan, Long> {
    fun findFirstByIsActiveTrueOrderByIdAsc(): Plan?
    fun findByCodeAndIsActiveTrue(code: String): Plan?
}
