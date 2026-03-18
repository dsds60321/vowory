package com.gh.wedding.service

import com.gh.wedding.domain.CompanyProfile
import com.gh.wedding.repository.CompanyProfileRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class CompanyProfileService(
    private val companyProfileRepository: CompanyProfileRepository,
) {
    fun getDefaultProfile(): CompanyProfile? {
        return companyProfileRepository.findByCode(DEFAULT_COMPANY_CODE)
            ?: companyProfileRepository.findTopByOrderByIdAsc()
    }

    companion object {
        private const val DEFAULT_COMPANY_CODE = "default"
    }
}
