package com.gh.wedding.repository

import com.gh.wedding.domain.CompanyProfile
import org.springframework.data.jpa.repository.JpaRepository

interface CompanyProfileRepository : JpaRepository<CompanyProfile, Long> {
    fun findByCode(code: String): CompanyProfile?
    fun findTopByOrderByIdAsc(): CompanyProfile?
}
