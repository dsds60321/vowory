package com.gh.wedding.dto

data class ThankyouMainRequest(
    val imageUrl: String? = null,
    val caption: String? = null,
)

data class ThankyouBasicInfoRequest(
    val title: String? = null,
    val senderType: String? = null,
    val groomName: String? = null,
    val brideName: String? = null,
    val groomParentName: String? = null,
    val brideParentName: String? = null,
    val recipientName: String? = null,
    val headingPrefixText: String? = null,
    val headingPrefixColor: String? = null,
    val headingPrefixFontSize: Int? = null,
    val headingTitleColor: String? = null,
    val headingTitleFontSize: Int? = null,
    val senderName: String? = null,
    val receiverName: String? = null,
    val eventDate: String? = null,
)

data class ThankyouEndingRequest(
    val imageUrl: String? = null,
    val caption: String? = null,
)

data class ThankyouDetailRequest(
    val bodyText: String? = null,
    val ending: ThankyouEndingRequest? = null,
)

data class ThankyouShareRequest(
    val slug: String? = null,
    val shareUrl: String? = null,
    val ogTitle: String? = null,
    val ogDescription: String? = null,
    val ogImageUrl: String? = null,
)

data class ThankyouSaveRequest(
    val themeId: String? = null,
    val main: ThankyouMainRequest? = null,
    val basicInfo: ThankyouBasicInfoRequest? = null,
    val greetingHtml: String? = null,
    val detail: ThankyouDetailRequest? = null,
    val share: ThankyouShareRequest? = null,
    val themeBackgroundColor: String? = null,
    val themeTextColor: String? = null,
    val themeAccentColor: String? = null,
    val themePattern: String? = null,
    val themeEffectType: String? = null,
    val themeFontFamily: String? = null,
    val themeFontSize: Int? = null,
    val themeScrollReveal: Boolean? = null,
)

data class ThankyouPublishRequest(
    val slug: String? = null,
)

data class ThankyouMainResponse(
    val imageUrl: String?,
    val caption: String?,
)

data class ThankyouBasicInfoResponse(
    val title: String,
    val senderType: String,
    val groomName: String?,
    val brideName: String?,
    val groomParentName: String?,
    val brideParentName: String?,
    val recipientName: String?,
    val headingPrefixText: String?,
    val headingPrefixColor: String?,
    val headingPrefixFontSize: Int?,
    val headingTitleColor: String?,
    val headingTitleFontSize: Int?,
    val senderName: String,
    val receiverName: String?,
    val eventDate: String?,
)

data class ThankyouEndingResponse(
    val imageUrl: String?,
    val caption: String?,
)

data class ThankyouDetailResponse(
    val bodyText: String?,
    val ending: ThankyouEndingResponse,
)

data class ThankyouShareResponse(
    val slug: String?,
    val shareUrl: String?,
    val ogTitle: String?,
    val ogDescription: String?,
    val ogImageUrl: String?,
)

data class ThankyouEditorResponse(
    val id: Long,
    val themeId: String,
    val status: String,
    val published: Boolean,
    val main: ThankyouMainResponse,
    val basicInfo: ThankyouBasicInfoResponse,
    val greetingHtml: String,
    val detail: ThankyouDetailResponse,
    val share: ThankyouShareResponse,
    val publishedAt: String?,
    val createdAt: String?,
    val updatedAt: String?,
    val themeBackgroundColor: String?,
    val themeTextColor: String?,
    val themeAccentColor: String?,
    val themePattern: String?,
    val themeEffectType: String?,
    val themeFontFamily: String?,
    val themeFontSize: Int?,
    val themeScrollReveal: Boolean,
)

data class ThankyouPublishResponse(
    val thankyouId: Long,
    val slug: String,
    val shareUrl: String,
)

data class PublicThankyouResponse(
    val id: String,
    val themeId: String,
    val main: ThankyouMainResponse,
    val basicInfo: ThankyouBasicInfoResponse,
    val greetingHtml: String,
    val detail: ThankyouDetailResponse,
    val share: ThankyouShareResponse,
    val themeBackgroundColor: String?,
    val themeTextColor: String?,
    val themeAccentColor: String?,
    val themePattern: String?,
    val themeEffectType: String?,
    val themeFontFamily: String?,
    val themeFontSize: Int?,
    val themeScrollReveal: Boolean,
)

data class MyThankyouResponse(
    val id: Long,
    val slug: String?,
    val published: Boolean,
    val title: String,
    val senderName: String,
    val mainImageUrl: String?,
    val updatedAt: String?,
)
