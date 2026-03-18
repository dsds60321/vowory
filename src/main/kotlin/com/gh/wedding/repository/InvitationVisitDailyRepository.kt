package com.gh.wedding.repository

import com.gh.wedding.domain.Invitation
import com.gh.wedding.domain.InvitationVisitDaily
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.time.LocalDate

interface InvitationVisitDailyRepository : JpaRepository<InvitationVisitDaily, Long> {
    fun findByInvitationAndVisitDate(invitation: Invitation, visitDate: LocalDate): InvitationVisitDaily?
    fun findByInvitationInAndVisitDateBetween(invitations: List<Invitation>, startDate: LocalDate, endDate: LocalDate): List<InvitationVisitDaily>

    @Query("select coalesce(sum(v.visitCount), 0) from InvitationVisitDaily v where v.invitation in :invitations")
    fun sumVisitCountByInvitationIn(invitations: List<Invitation>): Long
}
