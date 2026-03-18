package com.gh.wedding.repository

import com.gh.wedding.domain.UserRole
import com.gh.wedding.domain.UserAccount
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface UserAccountRepository : JpaRepository<UserAccount, String> {
    @Query(
        """
        select u
        from UserAccount u
        where (
            :keyword is null
            or :keyword = ''
            or lower(u.id) like lower(concat('%', :keyword, '%'))
            or lower(coalesce(u.email, '')) like lower(concat('%', :keyword, '%'))
            or lower(coalesce(u.name, '')) like lower(concat('%', :keyword, '%'))
        )
        and (:role is null or u.role = :role)
        and (:isActive is null or u.isActive = :isActive)
        """,
    )
    fun searchAdminUsers(
        @Param("keyword") keyword: String?,
        @Param("role") role: UserRole?,
        @Param("isActive") isActive: Boolean?,
        pageable: Pageable,
    ): Page<UserAccount>
}
