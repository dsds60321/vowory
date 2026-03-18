package com.gh.wedding.controller

import com.gh.wedding.common.requireAuthUser
import com.gh.wedding.dto.GuestbookCreateRequest
import com.gh.wedding.dto.GuestbookResponse
import com.gh.wedding.dto.GuestbookUpdateRequest
import com.gh.wedding.dto.InvitationEditorResponse
import com.gh.wedding.dto.DashboardSummaryResponse
import com.gh.wedding.dto.InvitationPublishRequest
import com.gh.wedding.dto.InvitationPublishResponse
import com.gh.wedding.dto.InvitationSaveRequest
import com.gh.wedding.dto.MyGuestbookResponse
import com.gh.wedding.dto.MyInvitationResponse
import com.gh.wedding.dto.RsvpSummaryResponse
import com.gh.wedding.dto.RsvpCreateRequest
import com.gh.wedding.dto.SlugCheckResponse
import com.gh.wedding.service.InvitationService
import org.springframework.http.MediaType
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid

@RestController
@RequestMapping("/api/invitations")
class InvitationOwnerController(
    private val invitationService: InvitationService,
) {

    @PostMapping
    fun create(
        authentication: Authentication?,
    ): InvitationEditorResponse {
        val user = authentication.requireAuthUser()
        return invitationService.createInvitation(user.userId)
    }

    @GetMapping("/{id}")
    fun getById(
        authentication: Authentication?,
        @PathVariable id: Long,
    ): InvitationEditorResponse {
        val user = authentication.requireAuthUser()
        return invitationService.getInvitationEditor(id, user.userId)
    }

    @PutMapping("/{id}")
    fun update(
        authentication: Authentication?,
        @PathVariable id: Long,
        @RequestBody request: InvitationSaveRequest,
    ): InvitationEditorResponse {
        val user = authentication.requireAuthUser()
        return invitationService.updateDraft(id, user.userId, request)
    }

    @DeleteMapping("/{id}")
    fun delete(
        authentication: Authentication?,
        @PathVariable id: Long,
    ): Map<String, String> {
        val user = authentication.requireAuthUser()
        invitationService.softDeleteInvitation(id, user.userId)
        return mapOf("message" to "초대장이 삭제되었습니다.")
    }

    @PostMapping("/{id}/assets", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun uploadAssets(
        authentication: Authentication?,
        @PathVariable id: Long,
        @RequestPart(required = false) mainImageFile: MultipartFile?,
        @RequestPart(required = false) paperInvitationFile: MultipartFile?,
        @RequestPart(required = false) seoImageFile: MultipartFile?,
        @RequestPart(required = false) openingImageFile: MultipartFile?,
        @RequestPart(required = false) backgroundMusicFile: MultipartFile?,
        @RequestPart(required = false) galleryFiles: List<MultipartFile>?,
    ): InvitationEditorResponse {
        val user = authentication.requireAuthUser()
        return invitationService.uploadAssets(
            id = id,
            userId = user.userId,
            mainImageFile = mainImageFile,
            paperInvitationFile = paperInvitationFile,
            seoImageFile = seoImageFile,
            openingImageFile = openingImageFile,
            backgroundMusicFile = backgroundMusicFile,
            galleryFiles = galleryFiles,
        )
    }

    @GetMapping("/slug-check")
    fun checkSlug(
        @RequestParam slug: String,
        @RequestParam(required = false) invitationId: Long?,
    ): SlugCheckResponse {
        return invitationService.checkSlugAvailability(slug, invitationId)
    }

    @PostMapping("/{id}/publish")
    fun publish(
        authentication: Authentication?,
        @PathVariable id: Long,
        @RequestBody(required = false) request: InvitationPublishRequest?,
    ): InvitationPublishResponse {
        val user = authentication.requireAuthUser()
        return invitationService.publish(id, user.userId, request ?: InvitationPublishRequest())
    }

    @PostMapping("/{id}/unpublish")
    fun unpublish(
        authentication: Authentication?,
        @PathVariable id: Long,
    ): InvitationEditorResponse {
        val user = authentication.requireAuthUser()
        return invitationService.unpublish(id, user.userId)
    }

    @GetMapping("/me")
    fun myInvitations(authentication: Authentication?): List<MyInvitationResponse> {
        val user = authentication.requireAuthUser()
        return invitationService.getMyInvitations(user.userId)
    }

    @GetMapping("/me/dashboard")
    fun myDashboard(authentication: Authentication?): DashboardSummaryResponse {
        val user = authentication.requireAuthUser()
        return invitationService.getMyDashboard(user.userId)
    }

    @GetMapping("/me/guestbooks")
    fun myGuestbooks(authentication: Authentication?): List<MyGuestbookResponse> {
        val user = authentication.requireAuthUser()
        return invitationService.getMyGuestbooks(user.userId)
    }

    @DeleteMapping("/me/guestbooks/{guestbookId}")
    fun deleteMyGuestbook(
        authentication: Authentication?,
        @PathVariable guestbookId: Long,
    ): Map<String, String> {
        val user = authentication.requireAuthUser()
        invitationService.deleteMyGuestbook(guestbookId, user.userId)
        return mapOf("message" to "방명록이 삭제되었습니다.")
    }

    @PutMapping("/me/guestbooks/{guestbookId}")
    fun updateMyGuestbook(
        authentication: Authentication?,
        @PathVariable guestbookId: Long,
        @Valid @RequestBody request: GuestbookUpdateRequest,
    ): MyGuestbookResponse {
        val user = authentication.requireAuthUser()
        return invitationService.updateMyGuestbook(guestbookId, user.userId, request)
    }

    @GetMapping("/{id}/rsvps")
    fun invitationRsvps(
        authentication: Authentication?,
        @PathVariable id: Long,
    ): List<RsvpSummaryResponse> {
        val user = authentication.requireAuthUser()
        return invitationService.getRsvpsByInvitation(id, user.userId)
    }

    @PostMapping("/{id}/rsvps")
    fun addInvitationRsvp(
        authentication: Authentication?,
        @PathVariable id: Long,
        @Valid @RequestBody request: RsvpCreateRequest,
        httpServletRequest: HttpServletRequest,
    ): Map<String, String> {
        val user = authentication.requireAuthUser()
        invitationService.addRsvpForOwner(id, user.userId, request, httpServletRequest.remoteAddr)
        return mapOf("message" to "RSVP가 등록되었습니다.")
    }

    @GetMapping("/{id}/guestbook")
    fun invitationGuestbook(
        authentication: Authentication?,
        @PathVariable id: Long,
    ): List<GuestbookResponse> {
        val user = authentication.requireAuthUser()
        return invitationService.getGuestbookEntriesForOwner(id, user.userId)
    }

    @PostMapping("/{id}/guestbook")
    fun addInvitationGuestbook(
        authentication: Authentication?,
        @PathVariable id: Long,
        @Valid @RequestBody request: GuestbookCreateRequest,
    ): GuestbookResponse {
        val user = authentication.requireAuthUser()
        return invitationService.addGuestbookEntryForOwner(id, user.userId, request)
    }

    @GetMapping("/{id}/rsvps.csv", produces = ["text/csv"])
    fun invitationRsvpsCsv(
        authentication: Authentication?,
        @PathVariable id: Long,
    ): String {
        val user = authentication.requireAuthUser()
        val rows = invitationService.getRsvpsByInvitation(id, user.userId)

        val header = "Name,Side,Attending,PartyCount,Note,Date"
        val body = rows.joinToString("\n") {
            listOf(
                escapeCsv(it.name),
                escapeCsv(if (it.side == "bride") "Bride" else "Groom"),
                if (it.attending) "Yes" else "No",
                it.partyCount?.toString() ?: "",
                escapeCsv(it.note),
                escapeCsv(it.createdAt),
            ).joinToString(",")
        }

        return "\uFEFF$header\n$body"
    }

    @GetMapping("/me/rsvps.csv", produces = ["text/csv"])
    fun myRsvpsCsv(authentication: Authentication?): String {
        val user = authentication.requireAuthUser()
        val rows = invitationService.getMyRsvps(user.userId)

        val header = "Invitation,Name,Side,Attending,PartyCount,Note,Date"
        val body = rows.joinToString("\n") {
            listOf(
                escapeCsv(it.invitationTitle),
                escapeCsv(it.name),
                escapeCsv(if (it.side == "bride") "Bride" else "Groom"),
                if (it.attending) "Yes" else "No",
                it.partyCount?.toString() ?: "",
                escapeCsv(it.note),
                escapeCsv(it.createdAt),
            ).joinToString(",")
        }

        return "\uFEFF$header\n$body"
    }

    private fun escapeCsv(value: String?): String {
        val safeValue = value ?: ""
        return "\"${safeValue.replace("\"", "\"\"")}\""
    }
}
