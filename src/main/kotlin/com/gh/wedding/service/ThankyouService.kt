package com.gh.wedding.service

import com.gh.wedding.common.WeddingErrorCode
import com.gh.wedding.common.WeddingException
import com.gh.wedding.domain.ThankyouCard
import com.gh.wedding.domain.ThankyouContent
import com.gh.wedding.domain.ThankyouStatus
import com.gh.wedding.domain.FileAssetOwnerType
import com.gh.wedding.dto.MyThankyouResponse
import com.gh.wedding.dto.PublicThankyouResponse
import com.gh.wedding.dto.SlugCheckResponse
import com.gh.wedding.dto.ThankyouBasicInfoResponse
import com.gh.wedding.dto.ThankyouDetailResponse
import com.gh.wedding.dto.ThankyouEditorResponse
import com.gh.wedding.dto.ThankyouEndingResponse
import com.gh.wedding.dto.ThankyouMainResponse
import com.gh.wedding.dto.ThankyouPublishRequest
import com.gh.wedding.dto.ThankyouPublishResponse
import com.gh.wedding.dto.ThankyouSaveRequest
import com.gh.wedding.dto.ThankyouShareResponse
import com.gh.wedding.repository.ThankyouCardRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

@Service
@Transactional
class ThankyouService(
    private val thankyouCardRepository: ThankyouCardRepository,
    private val fileService: FileService,
    private val fileAssetService: FileAssetService,
    @Value("\${app.frontend.origin:https://vowory.com}")
    private val frontendOrigin: String,
) {
    private val slugRegex = Regex("^[a-z0-9]+(?:-[a-z0-9]+)*$")

    fun createThankyou(userId: String): ThankyouEditorResponse {
        val thankyouCard = ThankyouCard(
            ownerToken = "${UUID.randomUUID()}${UUID.randomUUID()}",
            userId = userId,
            themeId = "classic-thankyou",
            status = ThankyouStatus.DRAFT,
            content = ThankyouContent(),
        )
        val saved = thankyouCardRepository.save(thankyouCard)
        return toEditorResponse(saved)
    }

    @Transactional(readOnly = true)
    fun getThankyouForOwner(id: Long, userId: String): ThankyouCard {
        val thankyouCard = thankyouCardRepository.findByIdAndUserId(id, userId)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "감사장을 찾을 수 없습니다.")
        if (isDeleted(thankyouCard)) {
            throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "감사장을 찾을 수 없습니다.")
        }
        return thankyouCard
    }

    @Transactional(readOnly = true)
    fun getThankyouEditor(id: Long, userId: String): ThankyouEditorResponse {
        val thankyouCard = getThankyouForOwner(id, userId)
        return toEditorResponse(thankyouCard)
    }

    fun updateDraft(id: Long, userId: String, request: ThankyouSaveRequest): ThankyouEditorResponse {
        val thankyouCard = getThankyouForOwner(id, userId)
        val content = thankyouCard.content

        request.themeId?.let { themeId ->
            val normalized = themeId.trim()
            if (normalized.isNotBlank()) {
                thankyouCard.themeId = normalized
            }
        }

        request.main?.let { main ->
            if (main.imageUrl != null) {
                content.mainImageUrl = fileService.processUrl(main.imageUrl)?.trim()?.takeIf { it.isNotBlank() }
            }
            if (main.caption != null) {
                content.mainCaption = main.caption.trim().takeIf { it.isNotBlank() }
            }
        }

        request.basicInfo?.let { basicInfo ->
            if (basicInfo.title != null) {
                content.title = basicInfo.title.trim().takeIf { it.isNotBlank() }
            }
            if (basicInfo.senderType != null) {
                content.senderType = normalizeSenderType(basicInfo.senderType)
            }
            if (basicInfo.groomName != null) {
                content.groomName = basicInfo.groomName.trim().takeIf { it.isNotBlank() }
            }
            if (basicInfo.brideName != null) {
                content.brideName = basicInfo.brideName.trim().takeIf { it.isNotBlank() }
            }
            if (basicInfo.groomParentName != null) {
                content.groomParentName = basicInfo.groomParentName.trim().takeIf { it.isNotBlank() }
            }
            if (basicInfo.brideParentName != null) {
                content.brideParentName = basicInfo.brideParentName.trim().takeIf { it.isNotBlank() }
            }
            if (basicInfo.recipientName != null) {
                content.recipientName = basicInfo.recipientName.trim().takeIf { it.isNotBlank() }
            }
            if (basicInfo.headingPrefixText != null) {
                content.headingPrefixText = basicInfo.headingPrefixText.trim().takeIf { it.isNotBlank() }
            }
            if (basicInfo.headingPrefixColor != null) {
                content.headingPrefixColor = basicInfo.headingPrefixColor.trim().takeIf { it.isNotBlank() }
            }
            if (basicInfo.headingPrefixFontSize != null) {
                content.headingPrefixFontSize = basicInfo.headingPrefixFontSize.coerceIn(16, 64)
            }
            if (basicInfo.headingTitleColor != null) {
                content.headingTitleColor = basicInfo.headingTitleColor.trim().takeIf { it.isNotBlank() }
            }
            if (basicInfo.headingTitleFontSize != null) {
                content.headingTitleFontSize = basicInfo.headingTitleFontSize.coerceIn(28, 96)
            }
            if (basicInfo.senderName != null) {
                content.senderName = basicInfo.senderName.trim().takeIf { it.isNotBlank() }
            }
            if (basicInfo.receiverName != null) {
                val normalizedReceiverName = basicInfo.receiverName.trim().takeIf { it.isNotBlank() }
                content.receiverName = normalizedReceiverName
                if (basicInfo.recipientName == null) {
                    content.recipientName = normalizedReceiverName
                }
            }
            if (basicInfo.eventDate != null) {
                content.eventDate = basicInfo.eventDate.trim().takeIf { it.isNotBlank() }
            }
        }

        if (content.recipientName.isNullOrBlank() && !content.receiverName.isNullOrBlank()) {
            content.recipientName = content.receiverName
        }
        if (content.receiverName.isNullOrBlank() && !content.recipientName.isNullOrBlank()) {
            content.receiverName = content.recipientName
        }
        buildSenderDisplay(content)?.let { content.senderName = it }

        request.greetingHtml?.let { greeting ->
            content.greetingHtml = greeting.trim().takeIf { it.isNotBlank() }
        }

        request.detail?.let { detail ->
            if (detail.bodyText != null) {
                content.detailBodyText = detail.bodyText.trim().takeIf { it.isNotBlank() }
            }
            detail.ending?.let { ending ->
                if (ending.imageUrl != null) {
                    content.endingImageUrl = fileService.processUrl(ending.imageUrl)?.trim()?.takeIf { it.isNotBlank() }
                }
                if (ending.caption != null) {
                    content.endingCaption = ending.caption.trim().takeIf { it.isNotBlank() }
                }
            }
        }

        request.share?.let { share ->
            if (share.slug != null) {
                val normalizedSlug = share.slug.trim()
                if (normalizedSlug.isBlank()) {
                    thankyouCard.slug = null
                } else {
                    val validatedSlug = normalizeAndValidateSlug(normalizedSlug)
                    validateSlugAvailableOrThrow(validatedSlug, thankyouCard.id)
                    thankyouCard.slug = validatedSlug
                }
            }
            if (share.ogTitle != null) {
                content.ogTitle = share.ogTitle.trim().takeIf { it.isNotBlank() }
            }
            if (share.ogDescription != null) {
                content.ogDescription = share.ogDescription.trim().takeIf { it.isNotBlank() }
            }
            if (share.ogImageUrl != null) {
                content.ogImageUrl = fileService.processUrl(share.ogImageUrl)?.trim()?.takeIf { it.isNotBlank() }
            }
        }

        request.themeBackgroundColor?.let { content.themeBackgroundColor = it.trim() }
        request.themeTextColor?.let { content.themeTextColor = it.trim() }
        request.themeAccentColor?.let { content.themeAccentColor = it.trim() }
        request.themePattern?.let { content.themePattern = it.trim() }
        request.themeEffectType?.let { content.themeEffectType = it.trim() }
        request.themeFontFamily?.let { content.themeFontFamily = it }
        request.themeFontSize?.let { content.themeFontSize = it.coerceIn(12, 28) }
        request.themeScrollReveal?.let { content.themeScrollReveal = it }

        thankyouCard.content = content
        return toEditorResponse(thankyouCard)
    }

    fun uploadAssets(
        id: Long,
        userId: String,
        mainImageFile: MultipartFile?,
        endingImageFile: MultipartFile?,
        ogImageFile: MultipartFile?,
    ): ThankyouEditorResponse {
        val thankyouCard = getThankyouForOwner(id, userId)
        val content = thankyouCard.content
        val thankyouId = thankyouCard.id?.toString()
            ?: throw WeddingException(WeddingErrorCode.SERVER_ERROR, "감사장 ID 오류")
        val ownerId = thankyouCard.id ?: throw WeddingException(WeddingErrorCode.SERVER_ERROR, "감사장 ID 오류")

        if (mainImageFile != null && !mainImageFile.isEmpty) {
            val uploaded = fileService.uploadImageResult(mainImageFile, userId, thankyouId, "thankyou-main")
            if (uploaded != null) {
                content.mainImageUrl = uploaded.publicUrl
                fileAssetService.registerUploadedFile(
                    ownerType = FileAssetOwnerType.THANKYOU,
                    ownerId = ownerId,
                    userId = userId,
                    storagePath = uploaded.storagePath,
                    publicUrl = uploaded.publicUrl,
                )
            }
        }

        if (endingImageFile != null && !endingImageFile.isEmpty) {
            val uploaded = fileService.uploadImageResult(endingImageFile, userId, thankyouId, "thankyou-ending")
            if (uploaded != null) {
                content.endingImageUrl = uploaded.publicUrl
                fileAssetService.registerUploadedFile(
                    ownerType = FileAssetOwnerType.THANKYOU,
                    ownerId = ownerId,
                    userId = userId,
                    storagePath = uploaded.storagePath,
                    publicUrl = uploaded.publicUrl,
                )
            }
        }

        if (ogImageFile != null && !ogImageFile.isEmpty) {
            val uploaded = fileService.uploadImageResult(ogImageFile, userId, thankyouId, "thankyou-og")
            if (uploaded != null) {
                content.ogImageUrl = uploaded.publicUrl
                fileAssetService.registerUploadedFile(
                    ownerType = FileAssetOwnerType.THANKYOU,
                    ownerId = ownerId,
                    userId = userId,
                    storagePath = uploaded.storagePath,
                    publicUrl = uploaded.publicUrl,
                )
            }
        }

        thankyouCard.content = content
        return toEditorResponse(thankyouCard)
    }

    fun publish(id: Long, userId: String, request: ThankyouPublishRequest): ThankyouPublishResponse {
        val thankyouCard = getThankyouForOwner(id, userId)
        val content = thankyouCard.content

        buildSenderDisplay(content)?.let { content.senderName = it }
        validatePublishRequiredFields(thankyouCard)

        val requestedSlug = request.slug?.takeIf { it.isNotBlank() }
        val finalSlug = when {
            requestedSlug != null -> {
                val normalized = normalizeAndValidateSlug(requestedSlug)
                validateSlugAvailableOrThrow(normalized, thankyouCard.id)
                normalized
            }

            !thankyouCard.slug.isNullOrBlank() -> {
                val normalized = normalizeAndValidateSlug(thankyouCard.slug!!)
                validateSlugAvailableOrThrow(normalized, thankyouCard.id)
                normalized
            }

            else -> generateUniqueSlug(thankyouCard)
        }

        thankyouCard.slug = finalSlug
        thankyouCard.status = ThankyouStatus.PUBLISHED
        thankyouCard.publishedAt = LocalDateTime.now()
        thankyouCard.content = content

        val shareUrl = buildShareUrl(finalSlug)
        return ThankyouPublishResponse(
            thankyouId = thankyouCard.id ?: throw WeddingException(WeddingErrorCode.SERVER_ERROR, "ID 생성 실패"),
            slug = finalSlug,
            shareUrl = shareUrl,
        )
    }

    fun unpublish(id: Long, userId: String): ThankyouEditorResponse {
        val thankyouCard = getThankyouForOwner(id, userId)
        thankyouCard.status = ThankyouStatus.DRAFT
        thankyouCard.publishedAt = null
        return toEditorResponse(thankyouCard)
    }

    fun softDeleteDraft(id: Long, userId: String) {
        val thankyouCard = getThankyouForOwner(id, userId)
        if (isDeleted(thankyouCard)) return
        if (thankyouCard.status == ThankyouStatus.PUBLISHED) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "발행된 감사장은 삭제할 수 없습니다.")
        }
        thankyouCard.slug = null
        thankyouCard.publishedAt = null
        thankyouCard.status = ThankyouStatus.DELETED
        fileAssetService.scheduleDeletion(FileAssetOwnerType.THANKYOU, id)
    }

    @Transactional(readOnly = true)
    fun checkSlugAvailability(rawSlug: String, thankyouId: Long?): SlugCheckResponse {
        val normalized = normalizeAndValidateSlug(rawSlug)
        val available = thankyouId?.let { !thankyouCardRepository.existsBySlugAndIdNot(normalized, it) }
            ?: !thankyouCardRepository.existsBySlug(normalized)
        return SlugCheckResponse(slug = normalized, available = available)
    }

    @Transactional(readOnly = true)
    fun getMyThankyouCards(userId: String): List<MyThankyouResponse> {
        return thankyouCardRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .filterNot { isDeleted(it) }
            .map { card ->
                val content = card.content
                MyThankyouResponse(
                    id = card.id ?: 0,
                    slug = card.slug,
                    published = card.status == ThankyouStatus.PUBLISHED,
                    title = content.title ?: "제목 미입력 감사장",
                    senderName = content.senderName ?: buildSenderDisplay(content) ?: "보내는 사람 미입력",
                    mainImageUrl = content.mainImageUrl,
                    updatedAt = card.updatedAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                )
            }
    }

    @Transactional(readOnly = true)
    fun getPublishedThankyou(slugOrId: String): PublicThankyouResponse {
        val thankyouCard = findPublishedThankyou(slugOrId)
        return toPublicResponse(thankyouCard)
    }

    private fun toEditorResponse(thankyouCard: ThankyouCard): ThankyouEditorResponse {
        val content = thankyouCard.content
        val slug = thankyouCard.slug

        return ThankyouEditorResponse(
            id = thankyouCard.id ?: 0,
            themeId = thankyouCard.themeId,
            status = thankyouCard.status.name.lowercase(),
            published = thankyouCard.status == ThankyouStatus.PUBLISHED,
            main = ThankyouMainResponse(
                imageUrl = content.mainImageUrl,
                caption = content.mainCaption,
            ),
            basicInfo = ThankyouBasicInfoResponse(
                title = content.title ?: "",
                senderType = normalizeSenderType(content.senderType),
                groomName = content.groomName,
                brideName = content.brideName,
                groomParentName = content.groomParentName,
                brideParentName = content.brideParentName,
                recipientName = content.recipientName ?: content.receiverName,
                headingPrefixText = content.headingPrefixText,
                headingPrefixColor = content.headingPrefixColor,
                headingPrefixFontSize = normalizeLegacyHeadingPrefixSize(content.headingPrefixFontSize),
                headingTitleColor = content.headingTitleColor,
                headingTitleFontSize = normalizeLegacyHeadingTitleSize(content.headingTitleFontSize),
                senderName = content.senderName ?: buildSenderDisplay(content) ?: "",
                receiverName = content.receiverName ?: content.recipientName,
                eventDate = content.eventDate,
            ),
            greetingHtml = content.greetingHtml ?: "",
            detail = ThankyouDetailResponse(
                bodyText = content.detailBodyText,
                ending = ThankyouEndingResponse(
                    imageUrl = content.endingImageUrl,
                    caption = content.endingCaption,
                ),
            ),
            share = ThankyouShareResponse(
                slug = slug,
                shareUrl = if (!slug.isNullOrBlank() && thankyouCard.status == ThankyouStatus.PUBLISHED) buildShareUrl(slug) else null,
                ogTitle = content.ogTitle,
                ogDescription = content.ogDescription,
                ogImageUrl = content.ogImageUrl,
            ),
            publishedAt = thankyouCard.publishedAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            createdAt = thankyouCard.createdAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            updatedAt = thankyouCard.updatedAt?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            themeBackgroundColor = content.themeBackgroundColor,
            themeTextColor = content.themeTextColor,
            themeAccentColor = content.themeAccentColor,
            themePattern = content.themePattern,
            themeEffectType = content.themeEffectType,
            themeFontFamily = content.themeFontFamily,
            themeFontSize = content.themeFontSize,
            themeScrollReveal = content.themeScrollReveal,
        )
    }

    private fun toPublicResponse(thankyouCard: ThankyouCard): PublicThankyouResponse {
        val content = thankyouCard.content
        val slug = thankyouCard.slug ?: ""

        return PublicThankyouResponse(
            id = (thankyouCard.id ?: 0).toString(),
            themeId = thankyouCard.themeId,
            main = ThankyouMainResponse(
                imageUrl = content.mainImageUrl,
                caption = content.mainCaption,
            ),
            basicInfo = ThankyouBasicInfoResponse(
                title = content.title ?: "감사장",
                senderType = normalizeSenderType(content.senderType),
                groomName = content.groomName,
                brideName = content.brideName,
                groomParentName = content.groomParentName,
                brideParentName = content.brideParentName,
                recipientName = content.recipientName ?: content.receiverName,
                headingPrefixText = content.headingPrefixText,
                headingPrefixColor = content.headingPrefixColor,
                headingPrefixFontSize = normalizeLegacyHeadingPrefixSize(content.headingPrefixFontSize),
                headingTitleColor = content.headingTitleColor,
                headingTitleFontSize = normalizeLegacyHeadingTitleSize(content.headingTitleFontSize),
                senderName = content.senderName ?: buildSenderDisplay(content) ?: "감사의 마음",
                receiverName = content.receiverName ?: content.recipientName,
                eventDate = content.eventDate,
            ),
            greetingHtml = content.greetingHtml ?: "",
            detail = ThankyouDetailResponse(
                bodyText = content.detailBodyText,
                ending = ThankyouEndingResponse(
                    imageUrl = content.endingImageUrl,
                    caption = content.endingCaption,
                ),
            ),
            share = ThankyouShareResponse(
                slug = slug,
                shareUrl = buildShareUrl(slug),
                ogTitle = content.ogTitle,
                ogDescription = content.ogDescription,
                ogImageUrl = content.ogImageUrl,
            ),
            themeBackgroundColor = content.themeBackgroundColor,
            themeTextColor = content.themeTextColor,
            themeAccentColor = content.themeAccentColor,
            themePattern = content.themePattern,
            themeEffectType = content.themeEffectType,
            themeFontFamily = content.themeFontFamily,
            themeFontSize = content.themeFontSize,
            themeScrollReveal = content.themeScrollReveal,
        )
    }

    private fun validatePublishRequiredFields(thankyouCard: ThankyouCard) {
        val content = thankyouCard.content
        if (thankyouCard.themeId.isBlank()) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "테마를 선택해 주세요.")
        }
        if (content.mainImageUrl.isNullOrBlank()) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "메인 이미지는 발행 시 필수입니다.")
        }
        if (isBlankHtml(content.greetingHtml)) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "감사 인사말은 발행 시 필수입니다.")
        }
        if (content.title.isNullOrBlank()) {
            throw WeddingException(WeddingErrorCode.INVALID_INPUT, "감사장 제목을 입력해 주세요.")
        }
        if (normalizeSenderType(content.senderType) == "parents") {
            val hasParentNames = !content.groomParentName.isNullOrBlank() && !content.brideParentName.isNullOrBlank()
            if (!hasParentNames && content.senderName.isNullOrBlank()) {
                throw WeddingException(WeddingErrorCode.INVALID_INPUT, "혼주 성함(신랑측/신부측)을 입력해 주세요.")
            }
        } else {
            val hasCoupleNames = !content.groomName.isNullOrBlank() && !content.brideName.isNullOrBlank()
            if (!hasCoupleNames && content.senderName.isNullOrBlank()) {
                throw WeddingException(WeddingErrorCode.INVALID_INPUT, "신랑/신부 이름을 입력해 주세요.")
            }
        }
    }

    private fun validateSlugAvailableOrThrow(slug: String, thankyouId: Long?) {
        val duplicated = thankyouId?.let { thankyouCardRepository.existsBySlugAndIdNot(slug, it) }
            ?: thankyouCardRepository.existsBySlug(slug)

        if (duplicated) {
            throw WeddingException(WeddingErrorCode.DUPLICATE_RESOURCE, "이미 사용 중인 slug 입니다.")
        }
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

    private fun generateUniqueSlug(thankyouCard: ThankyouCard): String {
        val content = thankyouCard.content
        val nameBasedSource = listOfNotNull(content.title, content.senderName ?: buildSenderDisplay(content))
            .joinToString("-")
            .ifBlank { "thankyou-card" }
        val nameBased = normalizeSlug(nameBasedSource)

        val candidates = mutableListOf<String>()
        if (nameBased.isNotBlank() && slugRegex.matches(nameBased)) {
            candidates.add(nameBased)
            candidates.add("$nameBased-${UUID.randomUUID().toString().take(6)}")
        }
        candidates.add("thanks-${UUID.randomUUID().toString().take(8)}")

        return candidates.first { !thankyouCardRepository.existsBySlug(it) }
    }

    private fun findPublishedThankyou(slugOrId: String): ThankyouCard {
        val parsedId = slugOrId.toLongOrNull()
        if (parsedId != null) {
            val byId = thankyouCardRepository.findById(parsedId).orElse(null)
            if (byId != null && byId.status == ThankyouStatus.PUBLISHED) {
                return byId
            }
        }

        val bySlug = thankyouCardRepository.findBySlug(slugOrId)
            ?: throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "발행된 감사장을 찾을 수 없습니다.")
        if (bySlug.status != ThankyouStatus.PUBLISHED) {
            throw WeddingException(WeddingErrorCode.RESOURCE_NOT_FOUND, "발행된 감사장을 찾을 수 없습니다.")
        }
        return bySlug
    }

    private fun buildShareUrl(slug: String): String {
        return "${frontendOrigin.trimEnd('/')}/thankyou/$slug"
    }

    private fun isDeleted(thankyouCard: ThankyouCard): Boolean {
        return thankyouCard.status == ThankyouStatus.DELETED
    }

    private fun isBlankHtml(rawHtml: String?): Boolean {
        if (rawHtml.isNullOrBlank()) return true
        val plainText = rawHtml
            .replace(Regex("<[^>]*>"), "")
            .replace("&nbsp;", " ")
            .trim()
        return plainText.isBlank()
    }

    private fun normalizeSenderType(rawType: String?): String {
        val normalized = rawType?.trim()?.lowercase()
        return if (normalized == "parents") "parents" else "couple"
    }

    private fun normalizeLegacyHeadingPrefixSize(value: Int?): Int {
        if (value == null) return 25
        if (value == 30) return 25
        return value.coerceIn(16, 64)
    }

    private fun normalizeLegacyHeadingTitleSize(value: Int?): Int {
        if (value == null) return 29
        if (value == 58) return 29
        return value.coerceIn(28, 96)
    }

    private fun buildSenderDisplay(content: ThankyouContent): String? {
        return if (normalizeSenderType(content.senderType) == "parents") {
            val groomParentName = content.groomParentName?.trim().orEmpty()
            val brideParentName = content.brideParentName?.trim().orEmpty()
            if (groomParentName.isNotBlank() && brideParentName.isNotBlank()) {
                "$groomParentName · $brideParentName 드림(혼주)"
            } else {
                content.senderName?.trim()?.takeIf { it.isNotBlank() }
            }
        } else {
            val groomName = content.groomName?.trim().orEmpty()
            val brideName = content.brideName?.trim().orEmpty()
            if (groomName.isNotBlank() && brideName.isNotBlank()) {
                "신랑 $groomName · 신부 $brideName 드림"
            } else {
                content.senderName?.trim()?.takeIf { it.isNotBlank() }
            }
        }
    }
}
