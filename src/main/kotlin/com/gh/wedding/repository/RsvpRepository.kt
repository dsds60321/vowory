package com.gh.wedding.repository

import com.gh.wedding.domain.Invitation
import com.gh.wedding.domain.Rsvp
import org.springframework.data.jpa.repository.JpaRepository

interface RsvpRepository : JpaRepository<Rsvp, Long> {
    fun findByInvitationOrderByCreatedAtDesc(invitation: Invitation): List<Rsvp>
    fun findByInvitationIdOrderByCreatedAtDesc(invitationId: Long): List<Rsvp>
    fun findByInvitation_UserIdOrderByCreatedAtDesc(userId: String): List<Rsvp>
    fun findByIdAndInvitation_UserId(id: Long, userId: String): Rsvp?
    fun findByIdAndInvitationId(id: Long, invitationId: Long): Rsvp?
    fun countByInvitation(invitation: Invitation): Long
}
