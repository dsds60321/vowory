package com.gh.wedding.repository

import com.gh.wedding.domain.Notice
import com.gh.wedding.domain.NoticeStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

interface NoticeQueryRepository {
    fun findCurrentVisible(pageable: Pageable): Page<Notice>
    fun findCurrentVisibleById(id: Long): Notice?
    fun findCurrentVisibleBanners(): List<Notice>
    fun findAdminPage(
        keyword: String?,
        status: NoticeStatus?,
        isBanner: Boolean?,
        pageable: Pageable,
    ): Page<Notice>
}
