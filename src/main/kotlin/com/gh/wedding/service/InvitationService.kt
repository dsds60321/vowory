package com.gh.wedding.service

import com.gh.wedding.common.WeddingErrorCode
import com.gh.wedding.common.WeddingException
import com.gh.wedding.config.WatermarkPolicyProperties
import com.gh.wedding.domain.Guestbook
import com.gh.wedding.domain.Invitation
import com.gh.wedding.domain.InvitationContent
import com.gh.wedding.domain.InvitationPublication
import com.gh.wedding.domain.InvitationStatus
import com.gh.wedding.domain.InvitationVisitDaily
import com.gh.wedding.domain.FileAssetOwnerType
import com.gh.wedding.domain.Rsvp
import com.gh.wedding.dto.DashboardSummaryResponse
import com.gh.wedding.dto.DashboardVisitPointResponse
import com.gh.wedding.dto.GuestbookCreateRequest
import com.gh.wedding.dto.GuestbookDeleteRequest
import com.gh.wedding.dto.GuestbookUpdateRequest
import com.gh.wedding.dto.MyGuestbookResponse
import com.gh.wedding.dto.GuestbookResponse
import com.gh.wedding.dto.InvitationEditorResponse
import com.gh.wedding.dto.InvitationPublishRequest
import com.gh.wedding.dto.InvitationPublishResponse
import com.gh.wedding.dto.InvitationSaveRequest
import com.gh.wedding.dto.MyInvitationResponse
import com.gh.wedding.dto.PublicInvitationResponse
import com.gh.wedding.dto.RsvpCreateRequest
import com.gh.wedding.dto.RsvpDeleteRequest
import com.gh.wedding.dto.RsvpSummaryResponse
import com.gh.wedding.dto.RsvpUpdateRequest
import com.gh.wedding.dto.SlugCheckResponse
import com.gh.wedding.repository.GuestbookRepository
import com.gh.wedding.repository.InvitationPublicationRepository
import com.gh.wedding.repository.InvitationRepository
import com.gh.wedding.repository.InvitationVisitDailyRepository
import com.gh.wedding.repository.RsvpRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID

@Service
@Transactional
class InvitationService(
    private val invitationRepository: InvitationRepository,
    private val publicationRepository: InvitationPublicationRepository,
    private val rsvpRepository: RsvpRepository,
    private val guestbookRepository: GuestbookRepository,
    private val invitationVisitDailyRepository: InvitationVisitDailyRepository,
    private val fileService: FileService,
    private val fileAssetService: FileAssetService,
    private val companyProfileService: CompanyProfileService,
    private val adminAuthorizationService: AdminAuthorizationService,
    private val planPolicyService: PlanPolicyService,
    private val watermarkPolicyProperties: WatermarkPolicyProperties,
    @Value("\${app.frontend.origin:https://vowory.com}")
    private val frontendOrigin: String,
) {
    private val slugRegex = Regex("^[a-z0-9]+(?:-[a-z0-9]+)*$")
    private val defaultBackgroundMusicUrls = setOf(
        "https://cdn.vowory.com/mp3/No_Sleep.mp3",
        "https://cdn.vowory.com/mp3/kornevmusic-epic.mp3",
        "https://cdn.vowory.com/mp3/purple-piano.mp3",
        // 기존 데이터 호환
        "/mp3/romantic.mp3",
        "/mp3/love-story.mp3",
        "/mp3/sweet.mp3",
        "/mp3/beyond.mp3",
    )

    fun createInvitation(userId: String): InvitationEditorResponse {
        planPolicyService.checkCreateLimit(userId)
        val content = InvitationContent(status = InvitationStatus.ACTIVE)
        applyCompanyThemeDefaults(content)

        val invitation = Invitation(
            ownerToken = "${UUID.randomUUID()}${UUID.randomUUID()}",
            userId = userId,
            content = content,
        )

        val saved = invitationRepository.save(invitation)
        planPolicyService.incrementCreateCount(userId)
        return toEditorResponse(saved)
    }

    @Transactional(readOnly = true)
    fun getInvitationForOwner(id: Long, userId: String): Invitation {
        val invitation = findInvitationForEditorAccess(id, userId)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "초대장을 찾을 수 없습니다.")
        if (isDeleted(invitation)) {
            throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "삭제된 초대장입니다.")
        }
        return invitation
    }

    @Transactional(readOnly = true)
    fun getInvitationEditor(id: Long, userId: String): InvitationEditorResponse {
        val invitation = getInvitationForOwner(id, userId)
        return toEditorResponse(invitation)
    }

    fun updateDraft(id: Long, userId: String, request: InvitationSaveRequest): InvitationEditorResponse {
        planPolicyService.checkEditLimit(userId)
        val invitation = getInvitationForOwner(id, userId)
        val content = invitation.content

        if (request.slug != null) {
            if (request.slug.isBlank()) {
                invitation.slug = null
                content.slug = null
            } else {
                val normalized = normalizeAndValidateSlug(request.slug)
                validateSlugAvailableOrThrow(normalized, invitation.id)
                invitation.slug = normalized
                content.slug = normalized
            }
        }

        request.groomName?.let { content.groomName = it }
        request.brideName?.let { content.brideName = it }
        request.date?.let { content.date = it }
        request.locationName?.let { content.locationName = it }
        request.address?.let { content.address = it }
        request.message?.let { content.message = it }
        request.mainImageUrl?.let { content.mainImageUrl = fileService.processUrl(it) }
        request.paperInvitationUrl?.let { content.paperInvitationUrl = fileService.processUrl(it) }
        request.imageUrls?.let { urls ->
            content.imageUrls = urls
                .mapNotNull { fileService.processUrl(it)?.trim() }
                .filter { it.isNotBlank() }
                .toMutableList()
        }

        request.groomContact?.let { content.groomContact = it }
        request.brideContact?.let { content.brideContact = it }
        request.accountNumber?.let { content.accountNumber = it }
        request.useSeparateAccounts?.let { content.useSeparateAccounts = it }
        request.groomAccountNumber?.let { content.groomAccountNumber = it }
        request.brideAccountNumber?.let { content.brideAccountNumber = it }
        request.groomRelation?.let { content.groomRelation = it }
        request.groomFatherName?.let { content.groomFatherName = it }
        request.groomFatherContact?.let { content.groomFatherContact = it }
        request.groomMotherName?.let { content.groomMotherName = it }
        request.groomMotherContact?.let { content.groomMotherContact = it }
        request.brideRelation?.let { content.brideRelation = it }
        request.brideFatherName?.let { content.brideFatherName = it }
        request.brideFatherContact?.let { content.brideFatherContact = it }
        request.brideMotherName?.let { content.brideMotherName = it }
        request.brideMotherContact?.let { content.brideMotherContact = it }
        request.bus?.let { content.bus = it }
        request.subway?.let { content.subway = it }
        request.car?.let { content.car = it }
        request.fontFamily?.let { content.fontFamily = it }
        request.fontColor?.let { content.fontColor = it }
        request.fontSize?.let { content.fontSize = it }
        request.heroMainFontFamily?.let { content.heroMainFontFamily = it }
        request.heroMainFontColor?.let { content.heroMainFontColor = it.trim() }
        request.heroMainFontSize?.let { content.heroMainFontSize = it.coerceIn(12, 42) }
        request.heroSubFontFamily?.let { content.heroSubFontFamily = it }
        request.heroSubFontColor?.let { content.heroSubFontColor = it.trim() }
        request.heroSubFontSize?.let { content.heroSubFontSize = it.coerceIn(10, 36) }
        request.useGuestbook?.let { content.useGuestbook = it }
        request.useRsvpModal?.let { content.useRsvpModal = it }
        request.rsvpAutoOpenOnLoad?.let { content.rsvpAutoOpenOnLoad = it }
        request.backgroundMusicUrl?.let { rawBackgroundMusicUrl ->
            val normalizedBackgroundMusicUrl = rawBackgroundMusicUrl.trim()
            if (normalizedBackgroundMusicUrl.isBlank()) {
                content.backgroundMusicUrl = null
            } else {
                if (content.backgroundMusicUrl == normalizedBackgroundMusicUrl) {
                    return@let
                }
                validateBackgroundMusicUrlOwnedByUserOrDefault(
                    userId = userId,
                    backgroundMusicUrl = normalizedBackgroundMusicUrl,
                )
                content.backgroundMusicUrl = normalizedBackgroundMusicUrl
            }
        }
        request.seoTitle?.let { content.seoTitle = it }
        request.seoDescription?.let { content.seoDescription = it }
        request.seoImageUrl?.let { content.seoImageUrl = fileService.processUrl(it) }
        request.galleryTitle?.let { content.galleryTitle = it }
        request.galleryType?.let { content.galleryType = it }
        request.themeBackgroundColor?.let { content.themeBackgroundColor = it.trim() }
        request.themeTextColor?.let { content.themeTextColor = it.trim() }
        request.themeAccentColor?.let { content.themeAccentColor = it.trim() }
        request.themePatternColor?.let { content.themePatternColor = it.trim() }
        request.themePattern?.let { content.themePattern = it.trim() }
        request.themeEffectType?.let { content.themeEffectType = it.trim() }
        request.themeFontFamily?.let { content.themeFontFamily = it }
        request.themeFontSize?.let { content.themeFontSize = it.coerceIn(12, 28) }
        request.themeScrollReveal?.let { content.themeScrollReveal = it }

        // 추가 필드 매핑
        request.heroDesignId?.let { content.heroDesignId = it }
        request.heroEffectType?.let { content.heroEffectType = it }
        request.heroEffectParticleCount?.let { content.heroEffectParticleCount = it.coerceIn(6, 120) }
        request.heroEffectSpeed?.let { content.heroEffectSpeed = it.coerceIn(40, 220) }
        request.heroEffectOpacity?.let { content.heroEffectOpacity = it.coerceIn(15, 100) }
        request.heroAccentFontFamily?.let { content.heroAccentFontFamily = it }
        request.messageFontFamily?.let { content.messageFontFamily = it }
        request.transportFontFamily?.let { content.transportFontFamily = it }
        request.rsvpTitle?.let { content.rsvpTitle = it }
        request.rsvpMessage?.let { content.rsvpMessage = it }
        request.rsvpButtonText?.let { content.rsvpButtonText = it }
        request.rsvpFontFamily?.let { content.rsvpFontFamily = it }
        request.detailContent?.let { content.detailContent = it }
        request.detailFontFamily?.let { content.detailFontFamily = it }
        request.locationTitle?.let { content.locationTitle = it }
        request.locationFloorHall?.let { content.locationFloorHall = it }
        request.locationContact?.let { content.locationContact = it }
        request.showMap?.let { content.showMap = it }
        request.lockMap?.let { content.lockMap = it }
        request.openingEnabled?.let { content.openingEnabled = it }
        request.openingAnimationType?.let { content.openingAnimationType = it.trim().ifBlank { null } }
        request.openingBackgroundType?.let { content.openingBackgroundType = it.trim().ifBlank { null } }
        request.openingBackgroundColor?.let { content.openingBackgroundColor = it.trim().ifBlank { null } }
        request.openingImageUrl?.let { content.openingImageUrl = fileService.processUrl(it) }
        request.openingTitle?.let { content.openingTitle = it }
        request.openingMessage?.let { content.openingMessage = it }
        request.openingFontFamily?.let { content.openingFontFamily = it }
        request.openingFontColor?.let { content.openingFontColor = it.trim().ifBlank { null } }
        request.openingTitleFontSize?.let { content.openingTitleFontSize = it.coerceIn(12, 72) }
        request.openingMessageFontSize?.let { content.openingMessageFontSize = it.coerceIn(10, 52) }

        invitation.content = content
        syncPublishedVersionContent(invitation)

        planPolicyService.incrementEditCount(userId)
        return toEditorResponse(invitation)
    }

    fun uploadAssets(
        id: Long,
        userId: String,
        mainImageFile: MultipartFile?,
        paperInvitationFile: MultipartFile?,
        seoImageFile: MultipartFile?,
        openingImageFile: MultipartFile?,
        backgroundMusicFile: MultipartFile?,
        galleryFiles: List<MultipartFile>?,
    ): InvitationEditorResponse {
        val invitation = getInvitationForOwner(id, userId)
        val content = invitation.content
        val invitationId = invitation.id?.toString()
            ?: throw WeddingException(WeddingErrorCode.SERVER_ERROR, "초대장 ID 오류")
        val ownerId = invitation.id ?: throw WeddingException(WeddingErrorCode.SERVER_ERROR, "초대장 ID 오류")

        if (mainImageFile != null && !mainImageFile.isEmpty) {
            val uploaded = fileService.uploadImageResult(mainImageFile, userId, invitationId, "main")
            if (uploaded != null) {
                content.mainImageUrl = uploaded.publicUrl
                fileAssetService.registerUploadedFile(
                    ownerType = FileAssetOwnerType.INVITATION,
                    ownerId = ownerId,
                    userId = userId,
                    storagePath = uploaded.storagePath,
                    publicUrl = uploaded.publicUrl,
                )
            }
        }

        if (paperInvitationFile != null && !paperInvitationFile.isEmpty) {
            val uploaded = fileService.uploadImageResult(paperInvitationFile, userId, invitationId, "paper")
            if (uploaded != null) {
                content.paperInvitationUrl = uploaded.publicUrl
                fileAssetService.registerUploadedFile(
                    ownerType = FileAssetOwnerType.INVITATION,
                    ownerId = ownerId,
                    userId = userId,
                    storagePath = uploaded.storagePath,
                    publicUrl = uploaded.publicUrl,
                )
            }
        }

        if (seoImageFile != null && !seoImageFile.isEmpty) {
            val uploaded = fileService.uploadImageResult(seoImageFile, userId, invitationId, "seo")
            if (uploaded != null) {
                content.seoImageUrl = uploaded.publicUrl
                fileAssetService.registerUploadedFile(
                    ownerType = FileAssetOwnerType.INVITATION,
                    ownerId = ownerId,
                    userId = userId,
                    storagePath = uploaded.storagePath,
                    publicUrl = uploaded.publicUrl,
                )
            }
        }

        if (openingImageFile != null && !openingImageFile.isEmpty) {
            val uploaded = fileService.uploadImageResult(openingImageFile, userId, invitationId, "opening")
            if (uploaded != null) {
                content.openingImageUrl = uploaded.publicUrl
                fileAssetService.registerUploadedFile(
                    ownerType = FileAssetOwnerType.INVITATION,
                    ownerId = ownerId,
                    userId = userId,
                    storagePath = uploaded.storagePath,
                    publicUrl = uploaded.publicUrl,
                )
            }
        }

        if (backgroundMusicFile != null && !backgroundMusicFile.isEmpty) {
            val uploaded = fileService.uploadRawResult(
                file = backgroundMusicFile,
                userId = userId,
                invitationId = invitationId,
                category = "audio/bgm",
                requiredContentTypePrefix = "audio/",
            )
            if (uploaded != null) {
                content.backgroundMusicUrl = uploaded.publicUrl
                fileAssetService.registerUploadedFile(
                    ownerType = FileAssetOwnerType.INVITATION,
                    ownerId = ownerId,
                    userId = userId,
                    storagePath = uploaded.storagePath,
                    publicUrl = uploaded.publicUrl,
                )
            }
        }

        if (!galleryFiles.isNullOrEmpty()) {
            val uploadedAssets = galleryFiles
                .filterNot { it.isEmpty }
                .mapNotNull { fileService.uploadImageResult(it, userId, invitationId, "gallery") }

            if (uploadedAssets.isNotEmpty()) {
                content.imageUrls = (content.imageUrls + uploadedAssets.map { it.publicUrl }).toMutableList()
                uploadedAssets.forEach { uploaded ->
                    fileAssetService.registerUploadedFile(
                        ownerType = FileAssetOwnerType.INVITATION,
                        ownerId = ownerId,
                        userId = userId,
                        storagePath = uploaded.storagePath,
                        publicUrl = uploaded.publicUrl,
                    )
                }
            }
        }

        invitation.content = content
        syncPublishedVersionContent(invitation)
        return toEditorResponse(invitation)
    }

    @Transactional(readOnly = true)
    fun checkSlugAvailability(rawSlug: String, invitationId: Long?): SlugCheckResponse {
        val normalized = normalizeAndValidateSlug(rawSlug)
        val available = invitationId?.let { !invitationRepository.existsBySlugAndIdNot(normalized, it) }
            ?: !invitationRepository.existsBySlug(normalized)
        return SlugCheckResponse(slug = normalized, available = available)
    }

    fun publish(id: Long, userId: String, request: InvitationPublishRequest): InvitationPublishResponse {
        planPolicyService.checkPublishLimit(userId)
        val invitation = getInvitationForOwner(id, userId)
        val activePlan = planPolicyService.getActivePlan(userId)

        val requestedSlug = request.slug?.takeIf { it.isNotBlank() }
        val finalSlug = when {
            requestedSlug != null -> {
                val normalized = normalizeAndValidateSlug(requestedSlug)
                validateSlugAvailableOrThrow(normalized, invitation.id)
                normalized
            }

            !invitation.slug.isNullOrBlank() -> {
                val normalized = normalizeAndValidateSlug(invitation.slug!!)
                validateSlugAvailableOrThrow(normalized, invitation.id)
                normalized
            }

            else -> generateUniqueSlug(invitation)
        }

        invitation.slug = finalSlug
        invitation.content.slug = finalSlug

        val publication = InvitationPublication(
            invitation = invitation,
            content = copyInvitationContent(invitation.content),
            version = (publicationRepository.findTopByInvitationOrderByVersionDesc(invitation)?.version ?: 0) + 1,
            watermarkEnabled = activePlan.watermarkEnabled,
            watermarkText = if (activePlan.watermarkEnabled) watermarkPolicyProperties.text else null,
        )

        publicationRepository.save(publication)
        invitation.publishedVersion = publication
        planPolicyService.incrementPublishCount(userId)

        val shareUrl = "${frontendOrigin.trimEnd('/')}/invitation/$finalSlug"
        return InvitationPublishResponse(
            invitationId = invitation.id ?: throw WeddingException(WeddingErrorCode.SERVER_ERROR, "ID 생성 실패"),
            slug = finalSlug,
            shareUrl = shareUrl,
        )
    }

    fun unpublish(id: Long, userId: String): InvitationEditorResponse {
        val invitation = getInvitationForOwner(id, userId)
        invitation.publishedVersion = null
        return toEditorResponse(invitation)
    }

    fun softDeleteInvitation(id: Long, userId: String) {
        val invitation = findInvitationForEditorAccess(id, userId)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "초대장을 찾을 수 없습니다.")

        if (isDeleted(invitation)) {
            return
        }

        if (invitation.publishedVersion != null) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "발행된 청첩장은 삭제할 수 없습니다.")
        }

        val content = invitation.content
        invitation.slug = null
        invitation.publishedVersion = null
        content.slug = null
        content.status = InvitationStatus.DELETED
        invitation.content = content
        fileAssetService.scheduleDeletion(FileAssetOwnerType.INVITATION, id)
    }

    private fun findInvitationForEditorAccess(id: Long, userId: String): Invitation? {
        if (adminAuthorizationService.isAdmin(userId)) {
            return invitationRepository.findById(id).orElse(null)
        }
        return invitationRepository.findByIdAndUserId(id, userId)
    }

    @Transactional(readOnly = true)
    fun getMyInvitations(userId: String): List<MyInvitationResponse> {
        return invitationRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .filterNot { isDeleted(it) }
            .map { invitation ->
                val content = invitation.content
                val title = listOfNotNull(content.groomName, content.brideName)
                    .joinToString(" & ")
                    .ifBlank { "제목 미입력 초대장" }

                MyInvitationResponse(
                    id = invitation.id ?: 0,
                    slug = invitation.slug,
                    published = invitation.publishedVersion != null,
                    title = title,
                    weddingDate = content.date,
                    mainImageUrl = content.mainImageUrl ?: content.imageUrls.firstOrNull(),
                    updatedAt = invitation.updatedAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                )
            }
    }

    @Transactional(readOnly = true)
    fun getMyRsvps(userId: String): List<RsvpSummaryResponse> {
        return rsvpRepository.findByInvitation_UserIdOrderByCreatedAtDesc(userId)
            .filter { rsvp -> rsvp.invitation?.let { !isDeleted(it) } ?: false }
            .map { toRsvpSummary(it) }
    }

    @Transactional(readOnly = true)
    fun getMyGuestbooks(userId: String): List<MyGuestbookResponse> {
        return guestbookRepository.findByInvitation_UserIdOrderByCreatedAtDesc(userId)
            .filter { guestbook -> guestbook.invitation?.let { !isDeleted(it) } ?: false }
            .map { guestbook ->
                val invitation = guestbook.invitation
                    ?: throw WeddingException(WeddingErrorCode.SERVER_ERROR, "초대장 정보 누락")

                MyGuestbookResponse(
                    id = guestbook.id ?: 0,
                    invitationId = invitation.id ?: 0,
                    invitationTitle = buildInvitationTitle(invitation),
                    name = guestbook.name,
                    content = guestbook.content,
                    createdAt = guestbook.createdAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) ?: "",
                )
            }
    }

    @Transactional(readOnly = true)
    fun getMyDashboard(userId: String): DashboardSummaryResponse {
        val invitations = invitationRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .filterNot { isDeleted(it) }
        val rsvps = rsvpRepository.findByInvitation_UserIdOrderByCreatedAtDesc(userId)
            .filter { row -> row.invitation?.let { !isDeleted(it) } ?: false }
        val guestbooks = guestbookRepository.findByInvitation_UserIdOrderByCreatedAtDesc(userId)
            .filter { row -> row.invitation?.let { !isDeleted(it) } ?: false }

        val today = LocalDate.now()
        val startDate = today.minusDays(6)
        val dateRange = (0L..6L).map { startDate.plusDays(it) }
        val trendMap = dateRange.associateWith { 0L }.toMutableMap()

        val totalVisitors = if (invitations.isEmpty()) {
            0L
        } else {
            val records = invitationVisitDailyRepository.findByInvitationInAndVisitDateBetween(invitations, startDate, today)
            records.forEach { record ->
                val date = record.visitDate
                trendMap[date] = (trendMap[date] ?: 0L) + record.visitCount
            }
            invitationVisitDailyRepository.sumVisitCountByInvitationIn(invitations)
        }

        val trend = dateRange.map { date ->
            DashboardVisitPointResponse(
                date = date.toString(),
                count = trendMap[date] ?: 0L,
            )
        }

        return DashboardSummaryResponse(
            totalVisitors = totalVisitors,
            totalRsvps = rsvps.size,
            totalGuestbooks = guestbooks.size,
            visitorTrend = trend,
            recentRsvps = rsvps.take(10).map { toRsvpSummary(it) },
            recentGuestbooks = guestbooks.take(5).map { row ->
                val invitation = row.invitation ?: throw WeddingException(WeddingErrorCode.SERVER_ERROR, "초대장 정보 누락")
                MyGuestbookResponse(
                    id = row.id ?: 0,
                    invitationId = invitation.id ?: 0,
                    invitationTitle = buildInvitationTitle(invitation),
                    name = row.name,
                    content = row.content,
                    createdAt = row.createdAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) ?: "",
                )
            },
        )
    }

    fun deleteMyGuestbook(guestbookId: Long, userId: String) {
        val guestbook = guestbookRepository.findByIdAndInvitation_UserId(guestbookId, userId)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "방명록을 찾을 수 없습니다.")

        val invitation = guestbook.invitation
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "초대장 정보를 찾을 수 없습니다.")
        if (isDeleted(invitation)) {
            throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "삭제된 초대장의 방명록입니다.")
        }

        guestbookRepository.delete(guestbook)
    }

    fun updateMyGuestbook(guestbookId: Long, userId: String, request: GuestbookUpdateRequest): MyGuestbookResponse {
        val guestbook = guestbookRepository.findByIdAndInvitation_UserId(guestbookId, userId)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "방명록을 찾을 수 없습니다.")

        val invitation = guestbook.invitation
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "초대장 정보를 찾을 수 없습니다.")
        if (isDeleted(invitation)) {
            throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "삭제된 초대장의 방명록입니다.")
        }

        validateEntryPassword(guestbook.password, request.password, "방명록")

        guestbook.name = request.name.trim()
        guestbook.content = request.content.trim()
        val saved = guestbookRepository.save(guestbook)

        return MyGuestbookResponse(
            id = saved.id ?: 0,
            invitationId = invitation.id ?: 0,
            invitationTitle = buildInvitationTitle(invitation),
            name = saved.name,
            content = saved.content,
            createdAt = saved.createdAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) ?: "",
        )
    }

    fun updateMyRsvp(rsvpId: Long, userId: String, request: RsvpUpdateRequest): RsvpSummaryResponse {
        val rsvp = rsvpRepository.findByIdAndInvitation_UserId(rsvpId, userId)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "RSVP를 찾을 수 없습니다.")
        val invitation = rsvp.invitation
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "초대장 정보를 찾을 수 없습니다.")
        if (isDeleted(invitation)) {
            throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "삭제된 초대장의 RSVP입니다.")
        }

        validateEntryPassword(rsvp.password, request.password, "RSVP")

        rsvp.name = request.name.trim()
        rsvp.attending = request.attending
        rsvp.side = normalizeRsvpSide(request.side)
        rsvp.partyCount = if (request.attending) request.partyCount?.takeIf { it > 0 } else null
        rsvp.contact = request.contact?.trim()?.takeIf { it.isNotBlank() }
        rsvp.meal = request.meal
        rsvp.bus = request.bus
        rsvp.note = request.note?.trim()?.takeIf { it.isNotBlank() }

        val saved = rsvpRepository.save(rsvp)
        return toRsvpSummary(saved)
    }

    @Transactional(readOnly = true)
    fun getRsvpsByInvitation(invitationId: Long, userId: String): List<RsvpSummaryResponse> {
        val invitation = getInvitationForOwner(invitationId, userId)
        return rsvpRepository.findByInvitationOrderByCreatedAtDesc(invitation)
            .map { toRsvpSummary(it) }
    }

    @Transactional(readOnly = true)
    fun getPublicRsvps(slug: String): List<RsvpSummaryResponse> {
        val invitation = findPublishedInvitationBySlug(slug)
        return rsvpRepository.findByInvitationIdOrderByCreatedAtDesc(invitation.id ?: 0)
            .map { toRsvpSummary(it) }
    }

    @Transactional(readOnly = true)
    fun getGuestbookEntriesForOwner(invitationId: Long, userId: String): List<GuestbookResponse> {
        val invitation = getInvitationForOwner(invitationId, userId)
        return guestbookRepository.findByInvitationIdOrderByCreatedAtDesc(invitation.id ?: 0)
            .map {
                GuestbookResponse(
                    id = it.id ?: 0,
                    name = it.name,
                    content = it.content,
                    createdAt = it.createdAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) ?: "",
                )
            }
    }

    fun addGuestbookEntryForOwner(invitationId: Long, userId: String, request: GuestbookCreateRequest): GuestbookResponse {
        val invitation = getInvitationForOwner(invitationId, userId)

        val saved = guestbookRepository.save(
            Guestbook(
                invitation = invitation,
                name = request.name,
                password = request.password,
                content = request.content,
            ),
        )

        return GuestbookResponse(
            id = saved.id ?: 0,
            name = saved.name,
            content = saved.content,
            createdAt = saved.createdAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) ?: "",
        )
    }

    fun deletePublicGuestbook(slug: String, guestbookId: Long, request: GuestbookDeleteRequest) {
        val invitation = findPublishedInvitationBySlug(slug)
        val guestbook = guestbookRepository.findByIdAndInvitationId(guestbookId, invitation.id ?: 0)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "방명록을 찾을 수 없습니다.")
        validateEntryPassword(guestbook.password, request.password, "방명록")
        guestbookRepository.delete(guestbook)
    }

    fun deletePublicRsvp(slug: String, rsvpId: Long, request: RsvpDeleteRequest) {
        val invitation = findPublishedInvitationBySlug(slug)
        val rsvp = rsvpRepository.findByIdAndInvitationId(rsvpId, invitation.id ?: 0)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "RSVP를 찾을 수 없습니다.")
        validateEntryPassword(rsvp.password, request.password, "RSVP")
        rsvpRepository.delete(rsvp)
    }

    @Transactional(readOnly = true)
    fun getPublishedInvitation(slugOrId: String): PublicInvitationResponse {
        val invitation = findPublishedInvitation(slugOrId)

        val publication = invitation.publishedVersion
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "아직 발행되지 않은 초대장입니다.")

        val content = publication.content
        val coverImage = content.seoImageUrl
            ?: content.mainImageUrl
            ?: content.imageUrls.firstOrNull()
            ?: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80"
        val mapImage = content.paperInvitationUrl
            ?: content.mainImageUrl
            ?: content.imageUrls.firstOrNull()
            ?: coverImage

        val weddingDate = content.date ?: "2026-05-23T12:30:00+09:00"
        val venueName = content.locationName ?: "예식장 정보 미입력"
        val venueAddress = content.address ?: "주소 정보 미입력"
        val messageLines = content.message
            ?.split("\n")
            ?.map { it.trim() }
            ?.filter { it.isNotBlank() }
            ?.ifEmpty { null }
            ?: listOf("함께할 그날을 기다리며, 소중한 분들을 정중히 초대합니다.")

        val groomName = content.groomName ?: "신랑"
        val brideName = content.brideName ?: "신부"

        return PublicInvitationResponse(
            id = (invitation.id ?: 0).toString(),
            slug = invitation.slug ?: slugOrId,
            groomName = groomName,
            brideName = brideName,
            weddingDateTime = weddingDate,
            venueName = venueName,
            venueAddress = venueAddress,
            coverImageUrl = coverImage,
            mainImageUrl = content.mainImageUrl,
            mapImageUrl = mapImage,
            imageUrls = content.imageUrls,
            messageLines = messageLines,
            seoTitle = content.seoTitle,
            seoDescription = content.seoDescription,
            seoImageUrl = content.seoImageUrl,
            galleryTitle = content.galleryTitle,
            galleryType = content.galleryType,
            themeBackgroundColor = content.themeBackgroundColor,
            themeTextColor = content.themeTextColor,
            themeAccentColor = content.themeAccentColor,
            themePatternColor = content.themePatternColor,
            themePattern = content.themePattern,
            themeEffectType = content.themeEffectType,
            themeFontFamily = content.themeFontFamily,
            themeFontSize = content.themeFontSize,
            themeScrollReveal = content.themeScrollReveal,
            // 추가 필드
            heroDesignId = content.heroDesignId,
            heroEffectType = content.heroEffectType,
            heroEffectParticleCount = content.heroEffectParticleCount,
            heroEffectSpeed = content.heroEffectSpeed,
            heroEffectOpacity = content.heroEffectOpacity,
            heroAccentFontFamily = content.heroAccentFontFamily,
            message = content.message,
            messageFontFamily = content.messageFontFamily,
            transportFontFamily = content.transportFontFamily,
            rsvpTitle = content.rsvpTitle,
            rsvpMessage = content.rsvpMessage,
            rsvpButtonText = content.rsvpButtonText,
            rsvpFontFamily = content.rsvpFontFamily,
            detailContent = content.detailContent,
            detailFontFamily = content.detailFontFamily,
            locationTitle = content.locationTitle,
            locationFloorHall = content.locationFloorHall,
            locationContact = content.locationContact,
            showMap = content.showMap,
            lockMap = content.lockMap,
            openingEnabled = content.openingEnabled,
            openingAnimationType = content.openingAnimationType,
            openingBackgroundType = content.openingBackgroundType,
            openingBackgroundColor = content.openingBackgroundColor,
            openingImageUrl = content.openingImageUrl,
            openingTitle = content.openingTitle,
            openingMessage = content.openingMessage,
            openingFontFamily = content.openingFontFamily,
            openingFontColor = content.openingFontColor,
            openingTitleFontSize = content.openingTitleFontSize,
            openingMessageFontSize = content.openingMessageFontSize,
            subway = content.subway,
            bus = content.bus,
            car = content.car,
            useGuestbook = content.useGuestbook,
            useRsvpModal = content.useRsvpModal,
            rsvpAutoOpenOnLoad = content.rsvpAutoOpenOnLoad,
            backgroundMusicUrl = content.backgroundMusicUrl,
            fontFamily = content.fontFamily,
            fontColor = content.fontColor,
            fontSize = content.fontSize,
            heroMainFontFamily = content.heroMainFontFamily,
            heroMainFontColor = content.heroMainFontColor,
            heroMainFontSize = content.heroMainFontSize,
            heroSubFontFamily = content.heroSubFontFamily,
            heroSubFontColor = content.heroSubFontColor,
            heroSubFontSize = content.heroSubFontSize,
            accountNumber = content.accountNumber,
            useSeparateAccounts = content.useSeparateAccounts,
            groomAccountNumber = content.groomAccountNumber,
            brideAccountNumber = content.brideAccountNumber,
            groomContact = content.groomContact,
            brideContact = content.brideContact,
            groomFatherName = content.groomFatherName,
            groomFatherContact = content.groomFatherContact,
            groomMotherName = content.groomMotherName,
            groomMotherContact = content.groomMotherContact,
            brideFatherName = content.brideFatherName,
            brideFatherContact = content.brideFatherContact,
            brideMotherName = content.brideMotherName,
            brideMotherContact = content.brideMotherContact,
        )
    }

    fun submitRsvp(slug: String, request: RsvpCreateRequest, ipAddress: String?) {
        val invitation = findPublishedInvitationBySlug(slug)

        val rsvp = Rsvp(
            invitation = invitation,
            name = request.name.trim(),
            password = request.password.trim(),
            attending = request.attending,
            side = normalizeRsvpSide(request.side),
            partyCount = if (request.attending) request.partyCount?.takeIf { it > 0 } else null,
            contact = request.contact?.trim()?.takeIf { it.isNotBlank() },
            meal = request.meal,
            bus = request.bus,
            note = request.note?.trim()?.takeIf { it.isNotBlank() },
            ipAddress = ipAddress,
        )

        rsvpRepository.save(rsvp)
    }

    fun addRsvpForOwner(invitationId: Long, userId: String, request: RsvpCreateRequest, ipAddress: String?) {
        val invitation = getInvitationForOwner(invitationId, userId)

        val rsvp = Rsvp(
            invitation = invitation,
            name = request.name.trim(),
            password = request.password.trim(),
            attending = request.attending,
            side = normalizeRsvpSide(request.side),
            partyCount = if (request.attending) request.partyCount?.takeIf { it > 0 } else null,
            contact = request.contact?.trim()?.takeIf { it.isNotBlank() },
            meal = request.meal,
            bus = request.bus,
            note = request.note?.trim()?.takeIf { it.isNotBlank() },
            ipAddress = ipAddress,
        )

        rsvpRepository.save(rsvp)
    }

    fun recordInvitationVisit(slug: String) {
        val invitation = findPublishedInvitationBySlug(slug)
        val today = LocalDate.now()
        val record = invitationVisitDailyRepository.findByInvitationAndVisitDate(invitation, today)
            ?: InvitationVisitDaily(
                invitation = invitation,
                visitDate = today,
                visitCount = 0,
            )
        record.visitCount += 1
        invitationVisitDailyRepository.save(record)
    }

    fun addGuestbookEntry(slug: String, request: GuestbookCreateRequest) {
        val invitation = findPublishedInvitationBySlug(slug)

        guestbookRepository.save(
            Guestbook(
                invitation = invitation,
                name = request.name,
                password = request.password,
                content = request.content,
            ),
        )
    }

    @Transactional(readOnly = true)
    fun getGuestbookEntries(slug: String): List<GuestbookResponse> {
        val invitation = findPublishedInvitationBySlug(slug)

        return guestbookRepository.findByInvitationIdOrderByCreatedAtDesc(invitation.id ?: 0)
            .map {
                GuestbookResponse(
                    id = it.id ?: 0,
                    name = it.name,
                    content = it.content,
                    createdAt = it.createdAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) ?: "",
                )
            }
    }

    private fun toEditorResponse(invitation: Invitation): InvitationEditorResponse {
        val content = invitation.content
        return InvitationEditorResponse(
            id = invitation.id ?: 0,
            slug = invitation.slug,
            published = invitation.publishedVersion != null,
            updatedAt = invitation.updatedAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            groomName = content.groomName,
            brideName = content.brideName,
            date = content.date,
            locationName = content.locationName,
            address = content.address,
            message = content.message,
            mainImageUrl = content.mainImageUrl,
            imageUrls = content.imageUrls,
            paperInvitationUrl = content.paperInvitationUrl,
            groomContact = content.groomContact,
            brideContact = content.brideContact,
            accountNumber = content.accountNumber,
            useSeparateAccounts = content.useSeparateAccounts,
            groomAccountNumber = content.groomAccountNumber,
            brideAccountNumber = content.brideAccountNumber,
            groomRelation = content.groomRelation,
            groomFatherName = content.groomFatherName,
            groomFatherContact = content.groomFatherContact,
            groomMotherName = content.groomMotherName,
            groomMotherContact = content.groomMotherContact,
            brideRelation = content.brideRelation,
            brideFatherName = content.brideFatherName,
            brideFatherContact = content.brideFatherContact,
            brideMotherName = content.brideMotherName,
            brideMotherContact = content.brideMotherContact,
            bus = content.bus,
            subway = content.subway,
            car = content.car,
            fontFamily = content.fontFamily,
            fontColor = content.fontColor,
            fontSize = content.fontSize,
            heroMainFontFamily = content.heroMainFontFamily,
            heroMainFontColor = content.heroMainFontColor,
            heroMainFontSize = content.heroMainFontSize,
            heroSubFontFamily = content.heroSubFontFamily,
            heroSubFontColor = content.heroSubFontColor,
            heroSubFontSize = content.heroSubFontSize,
            useGuestbook = content.useGuestbook,
            useRsvpModal = content.useRsvpModal,
            rsvpAutoOpenOnLoad = content.rsvpAutoOpenOnLoad,
            backgroundMusicUrl = content.backgroundMusicUrl,
            seoTitle = content.seoTitle,
            seoDescription = content.seoDescription,
            seoImageUrl = content.seoImageUrl,
            galleryTitle = content.galleryTitle,
            galleryType = content.galleryType,
            themeBackgroundColor = content.themeBackgroundColor,
            themeTextColor = content.themeTextColor,
            themeAccentColor = content.themeAccentColor,
            themePatternColor = content.themePatternColor,
            themePattern = content.themePattern,
            themeEffectType = content.themeEffectType,
            themeFontFamily = content.themeFontFamily,
            themeFontSize = content.themeFontSize,
            themeScrollReveal = content.themeScrollReveal,
            // 추가 필드
            heroDesignId = content.heroDesignId,
            heroEffectType = content.heroEffectType,
            heroEffectParticleCount = content.heroEffectParticleCount,
            heroEffectSpeed = content.heroEffectSpeed,
            heroEffectOpacity = content.heroEffectOpacity,
            heroAccentFontFamily = content.heroAccentFontFamily,
            messageFontFamily = content.messageFontFamily,
            transportFontFamily = content.transportFontFamily,
            rsvpTitle = content.rsvpTitle,
            rsvpMessage = content.rsvpMessage,
            rsvpButtonText = content.rsvpButtonText,
            rsvpFontFamily = content.rsvpFontFamily,
            detailContent = content.detailContent,
            detailFontFamily = content.detailFontFamily,
            locationTitle = content.locationTitle,
            locationFloorHall = content.locationFloorHall,
            locationContact = content.locationContact,
            showMap = content.showMap,
            lockMap = content.lockMap,
            openingEnabled = content.openingEnabled,
            openingAnimationType = content.openingAnimationType,
            openingBackgroundType = content.openingBackgroundType,
            openingBackgroundColor = content.openingBackgroundColor,
            openingImageUrl = content.openingImageUrl,
            openingTitle = content.openingTitle,
            openingMessage = content.openingMessage,
            openingFontFamily = content.openingFontFamily,
            openingFontColor = content.openingFontColor,
            openingTitleFontSize = content.openingTitleFontSize,
            openingMessageFontSize = content.openingMessageFontSize,
        )
    }

    private fun toRsvpSummary(rsvp: Rsvp): RsvpSummaryResponse {
        val invitation = rsvp.invitation
            ?: throw WeddingException(WeddingErrorCode.SERVER_ERROR, "초대장 정보 누락")

        return RsvpSummaryResponse(
            id = rsvp.id ?: 0,
            invitationId = invitation.id ?: 0,
            invitationTitle = buildInvitationTitle(invitation),
            name = rsvp.name,
            side = normalizeRsvpSide(rsvp.side),
            attending = rsvp.attending,
            partyCount = rsvp.partyCount,
            contact = rsvp.contact,
            meal = rsvp.meal,
            bus = rsvp.bus,
            note = rsvp.note,
            createdAt = rsvp.createdAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) ?: "",
        )
    }

    private fun buildInvitationTitle(invitation: Invitation): String {
        val content = invitation.content
        return listOfNotNull(content.groomName, content.brideName)
            .joinToString(" & ")
            .ifBlank { "제목 미입력 초대장" }
    }

    private fun validateEntryPassword(savedPassword: String?, rawPassword: String, label: String) {
        val expected = savedPassword?.trim() ?: ""
        val provided = rawPassword.trim()
        if (expected.isBlank()) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "$label 비밀번호가 설정되지 않아 수정할 수 없습니다.")
        }
        if (provided != expected) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "$label 비밀번호가 일치하지 않습니다.")
        }
    }

    private fun validateBackgroundMusicUrlOwnedByUserOrDefault(userId: String, backgroundMusicUrl: String) {
        if (defaultBackgroundMusicUrls.contains(backgroundMusicUrl)) return
        if (adminAuthorizationService.isAdmin(userId)) return

        val ownedByUser = fileAssetService.isOwnedActiveAssetUrl(
            userId = userId,
            publicUrl = backgroundMusicUrl,
        )
        if (!ownedByUser) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "배경음악은 기본 제공 음원 또는 본인 업로드 파일만 사용할 수 있습니다.")
        }
    }

    private fun normalizeRsvpSide(rawSide: String?): String {
        return when (rawSide?.trim()?.lowercase()) {
            "bride", "bride_side", "신부", "신부측" -> "bride"
            else -> "groom"
        }
    }

    private fun validateSlugAvailableOrThrow(slug: String, invitationId: Long?) {
        val duplicated = invitationId?.let { invitationRepository.existsBySlugAndIdNot(slug, it) }
            ?: invitationRepository.existsBySlug(slug)

        if (duplicated) {
            throw WeddingException(WeddingErrorCode.DUPLICATE_RESOURCE, "이미 사용 중인 slug 입니다.")
        }
    }

    private fun generateUniqueSlug(invitation: Invitation): String {
        val candidates = mutableListOf<String>()

        val nameBased = normalizeSlug(
            listOfNotNull(invitation.content.groomName, invitation.content.brideName)
                .joinToString("-")
                .ifBlank { "wedding" },
        )

        if (nameBased.isNotBlank() && slugRegex.matches(nameBased)) {
            candidates.add(nameBased)
            candidates.add("$nameBased-${UUID.randomUUID().toString().take(6)}")
        }

        candidates.add("wedding-${UUID.randomUUID().toString().take(8)}")

        return candidates.first { !invitationRepository.existsBySlug(it) }
    }

    private fun normalizeAndValidateSlug(rawSlug: String): String {
        val normalized = normalizeSlug(rawSlug)
        if (normalized.length !in 3..50) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "slug 길이는 3~50자여야 합니다.")
        }
        if (!slugRegex.matches(normalized)) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "slug 형식이 올바르지 않습니다. (소문자/숫자/-)")
        }
        return normalized
    }

    private fun normalizeSlug(rawSlug: String): String {
        return rawSlug
            .trim()
            .lowercase()
            .replace(Regex("[^a-z0-9\\s-]"), "")
            .replace(Regex("\\s+"), "-")
            .replace(Regex("-+"), "-")
            .trim('-')
    }

    private fun isDeleted(invitation: Invitation): Boolean {
        return invitation.content.status == InvitationStatus.DELETED
    }

    private fun syncPublishedVersionContent(invitation: Invitation) {
        val publication = invitation.publishedVersion ?: return
        publication.content = copyInvitationContent(invitation.content)
    }

    private fun applyCompanyThemeDefaults(content: InvitationContent) {
        val companyProfile = companyProfileService.getDefaultProfile() ?: return
        content.themeBackgroundColor = companyProfile.invitationThemeBackgroundColor.trim().ifBlank { content.themeBackgroundColor ?: "#fdf8f5" }
        content.themeTextColor = companyProfile.invitationThemeTextColor.trim().ifBlank { content.themeTextColor ?: "#4a2c2a" }
        content.themeAccentColor = companyProfile.invitationThemeAccentColor.trim().ifBlank { content.themeAccentColor ?: "#803b2a" }
        content.themePatternColor = content.themeAccentColor
        content.themePattern = companyProfile.invitationThemePattern.trim().ifBlank { content.themePattern ?: "none" }
        content.themeEffectType = companyProfile.invitationThemeEffectType.trim().ifBlank { content.themeEffectType ?: "none" }
        content.themeFontFamily = companyProfile.invitationThemeFontFamily.trim().ifBlank { content.themeFontFamily ?: "'Noto Sans KR', sans-serif" }
        content.themeFontSize = companyProfile.invitationThemeFontSize.coerceIn(12, 28)
        content.themeScrollReveal = companyProfile.invitationThemeScrollReveal
    }

    private fun copyInvitationContent(content: InvitationContent): InvitationContent {
        return content.copy(
            imageUrls = content.imageUrls.toMutableList(),
        )
    }

    private fun findPublishedInvitation(slugOrId: String): Invitation {
        val parsedId = slugOrId.toLongOrNull()
        if (parsedId != null) {
            val invitationById = invitationRepository.findById(parsedId).orElse(null)
            if (invitationById != null && !isDeleted(invitationById) && invitationById.publishedVersion != null) {
                return invitationById
            }
        }

        val invitationBySlug = invitationRepository.findBySlug(slugOrId)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "발행된 초대장을 찾을 수 없습니다.")

        if (isDeleted(invitationBySlug) || invitationBySlug.publishedVersion == null) {
            throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "발행된 초대장을 찾을 수 없습니다.")
        }

        return invitationBySlug
    }

    private fun findPublishedInvitationBySlug(slug: String): Invitation {
        val invitation = invitationRepository.findBySlug(slug)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "초대장을 찾을 수 없습니다.")

        if (isDeleted(invitation) || invitation.publishedVersion == null) {
            throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "발행된 초대장을 찾을 수 없습니다.")
        }

        return invitation
    }
}
