package com.gh.wedding.controller

import com.gh.wedding.common.requireAuthUser
import com.gh.wedding.dto.RsvpUpdateRequest
import com.gh.wedding.dto.RsvpSummaryResponse
import com.gh.wedding.service.InvitationService
import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/rsvps")
class RsvpOwnerController(
    private val invitationService: InvitationService,
) {
    @GetMapping("/me")
    fun myRsvps(authentication: Authentication?): List<RsvpSummaryResponse> {
        val user = authentication.requireAuthUser()
        return invitationService.getMyRsvps(user.userId)
    }

    @PutMapping("/me/{rsvpId}")
    fun updateMyRsvp(
        authentication: Authentication?,
        @PathVariable rsvpId: Long,
        @Valid @RequestBody request: RsvpUpdateRequest,
    ): RsvpSummaryResponse {
        val user = authentication.requireAuthUser()
        return invitationService.updateMyRsvp(rsvpId, user.userId, request)
    }
}
