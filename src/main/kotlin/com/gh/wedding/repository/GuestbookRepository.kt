package com.gh.wedding.repository

import com.gh.wedding.domain.Guestbook
import org.springframework.data.jpa.repository.JpaRepository

interface GuestbookRepository : JpaRepository<Guestbook, Long> {
    fun findByInvitationIdOrderByCreatedAtDesc(invitationId: Long): List<Guestbook>
    fun findByInvitation_UserIdOrderByCreatedAtDesc(userId: String): List<Guestbook>
    fun findByIdAndInvitation_UserId(id: Long, userId: String): Guestbook?
    fun findByIdAndInvitationId(id: Long, invitationId: Long): Guestbook?
}
