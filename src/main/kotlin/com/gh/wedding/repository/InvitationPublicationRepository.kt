package com.gh.wedding.repository

import com.gh.wedding.domain.Invitation
import com.gh.wedding.domain.InvitationPublication
import org.springframework.data.jpa.repository.JpaRepository

interface InvitationPublicationRepository : JpaRepository<InvitationPublication, Long> {
    fun findTopByInvitationOrderByVersionDesc(invitation: Invitation): InvitationPublication?
}
