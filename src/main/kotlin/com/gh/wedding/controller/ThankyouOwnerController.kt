package com.gh.wedding.controller

import com.gh.wedding.common.requireAuthUser
import com.gh.wedding.dto.MyThankyouResponse
import com.gh.wedding.dto.SlugCheckResponse
import com.gh.wedding.dto.ThankyouEditorResponse
import com.gh.wedding.dto.ThankyouPublishRequest
import com.gh.wedding.dto.ThankyouPublishResponse
import com.gh.wedding.dto.ThankyouSaveRequest
import com.gh.wedding.service.ThankyouService
import org.springframework.http.MediaType
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/thankyou-cards")
class ThankyouOwnerController(
    private val thankyouService: ThankyouService,
) {

    @PostMapping
    fun create(authentication: Authentication?): ThankyouEditorResponse {
        val user = authentication.requireAuthUser()
        return thankyouService.createThankyou(user.userId)
    }

    @GetMapping("/{id}")
    fun getById(
        authentication: Authentication?,
        @PathVariable id: Long,
    ): ThankyouEditorResponse {
        val user = authentication.requireAuthUser()
        return thankyouService.getThankyouEditor(id, user.userId)
    }

    @PutMapping("/{id}")
    fun update(
        authentication: Authentication?,
        @PathVariable id: Long,
        @RequestBody request: ThankyouSaveRequest,
    ): ThankyouEditorResponse {
        val user = authentication.requireAuthUser()
        return thankyouService.updateDraft(id, user.userId, request)
    }

    @DeleteMapping("/{id}")
    fun delete(
        authentication: Authentication?,
        @PathVariable id: Long,
    ): Map<String, String> {
        val user = authentication.requireAuthUser()
        thankyouService.softDeleteDraft(id, user.userId)
        return mapOf("message" to "감사장이 삭제되었습니다.")
    }

    @PostMapping("/{id}/assets", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun uploadAssets(
        authentication: Authentication?,
        @PathVariable id: Long,
        @RequestPart(required = false) mainImageFile: MultipartFile?,
        @RequestPart(required = false) endingImageFile: MultipartFile?,
        @RequestPart(required = false) ogImageFile: MultipartFile?,
    ): ThankyouEditorResponse {
        val user = authentication.requireAuthUser()
        return thankyouService.uploadAssets(
            id = id,
            userId = user.userId,
            mainImageFile = mainImageFile,
            endingImageFile = endingImageFile,
            ogImageFile = ogImageFile,
        )
    }

    @GetMapping("/slug-check")
    fun checkSlug(
        @RequestParam slug: String,
        @RequestParam(required = false) thankyouId: Long?,
    ): SlugCheckResponse {
        return thankyouService.checkSlugAvailability(slug, thankyouId)
    }

    @PostMapping("/{id}/publish")
    fun publish(
        authentication: Authentication?,
        @PathVariable id: Long,
        @RequestBody(required = false) request: ThankyouPublishRequest?,
    ): ThankyouPublishResponse {
        val user = authentication.requireAuthUser()
        return thankyouService.publish(id, user.userId, request ?: ThankyouPublishRequest())
    }

    @PostMapping("/{id}/unpublish")
    fun unpublish(
        authentication: Authentication?,
        @PathVariable id: Long,
    ): ThankyouEditorResponse {
        val user = authentication.requireAuthUser()
        return thankyouService.unpublish(id, user.userId)
    }

    @GetMapping("/me")
    fun myThankyouCards(authentication: Authentication?): List<MyThankyouResponse> {
        val user = authentication.requireAuthUser()
        return thankyouService.getMyThankyouCards(user.userId)
    }
}
