package com.gh.wedding.controller

import com.gh.wedding.dto.GuestbookCreateRequest
import com.gh.wedding.dto.GuestbookDeleteRequest
import com.gh.wedding.dto.GuestbookResponse
import com.gh.wedding.dto.PublicInvitationResponse
import com.gh.wedding.dto.RsvpCreateRequest
import com.gh.wedding.dto.RsvpDeleteRequest
import com.gh.wedding.dto.RsvpSummaryResponse
import com.gh.wedding.service.InvitationService
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/public/invitations")
class PublicInvitationController(
    private val invitationService: InvitationService,
) {

    @GetMapping("/{slugOrId}")
    fun getPublishedInvitation(@PathVariable slugOrId: String): PublicInvitationResponse {
        return invitationService.getPublishedInvitation(slugOrId)
    }

    @PostMapping("/{slug}/rsvps")
    fun submitRsvp(
        @PathVariable slug: String,
        @Valid @RequestBody request: RsvpCreateRequest,
        httpServletRequest: HttpServletRequest,
    ): Map<String, String> {
        invitationService.submitRsvp(slug, request, httpServletRequest.remoteAddr)
        return mapOf("message" to "RSVP가 등록되었습니다.")
    }

    @GetMapping("/{slug}/rsvps")
    fun getRsvps(@PathVariable slug: String): List<RsvpSummaryResponse> {
        return invitationService.getPublicRsvps(slug)
    }

    @DeleteMapping("/{slug}/rsvps/{rsvpId}")
    fun deleteRsvp(
        @PathVariable slug: String,
        @PathVariable rsvpId: Long,
        @Valid @RequestBody request: RsvpDeleteRequest,
    ): Map<String, String> {
        invitationService.deletePublicRsvp(slug, rsvpId, request)
        return mapOf("message" to "RSVP가 삭제되었습니다.")
    }

    @GetMapping("/{slug}/guestbook")
    fun getGuestbook(@PathVariable slug: String): List<GuestbookResponse> {
        return invitationService.getGuestbookEntries(slug)
    }

    @PostMapping("/{slug}/guestbook")
    fun addGuestbook(
        @PathVariable slug: String,
        @Valid @RequestBody request: GuestbookCreateRequest,
    ): Map<String, String> {
        invitationService.addGuestbookEntry(slug, request)
        return mapOf("message" to "방명록이 등록되었습니다.")
    }

    @DeleteMapping("/{slug}/guestbook/{guestbookId}")
    fun deleteGuestbook(
        @PathVariable slug: String,
        @PathVariable guestbookId: Long,
        @Valid @RequestBody request: GuestbookDeleteRequest,
    ): Map<String, String> {
        invitationService.deletePublicGuestbook(slug, guestbookId, request)
        return mapOf("message" to "방명록이 삭제되었습니다.")
    }

    @PostMapping("/{slug}/visit")
    fun trackVisit(@PathVariable slug: String): Map<String, String> {
        invitationService.recordInvitationVisit(slug)
        return mapOf("message" to "방문이 기록되었습니다.")
    }
}
