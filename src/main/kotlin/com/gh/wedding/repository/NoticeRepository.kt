package com.gh.wedding.repository

import com.gh.wedding.domain.Notice
import org.springframework.data.jpa.repository.JpaRepository

interface NoticeRepository : JpaRepository<Notice, Long>, NoticeQueryRepository
