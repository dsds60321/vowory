package com.gh.wedding.domain

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import java.io.Serializable

@JsonIgnoreProperties(ignoreUnknown = true)
data class ThankyouContent(
    var mainImageUrl: String? = null,
    var mainCaption: String? = null,
    var title: String? = null,
    var senderType: String? = "couple",
    var groomName: String? = null,
    var brideName: String? = null,
    var groomParentName: String? = null,
    var brideParentName: String? = null,
    var recipientName: String? = null,
    var headingPrefixText: String? = null,
    var headingPrefixColor: String? = "#ef9ea3",
    var headingPrefixFontSize: Int? = 25,
    var headingTitleColor: String? = "#524b51",
    var headingTitleFontSize: Int? = 29,
    var senderName: String? = null,
    var receiverName: String? = null,
    var eventDate: String? = null,
    var greetingHtml: String? = null,
    var detailBodyText: String? = null,
    var endingImageUrl: String? = null,
    var endingCaption: String? = null,
    var ogTitle: String? = null,
    var ogDescription: String? = null,
    var ogImageUrl: String? = null,
    var themeBackgroundColor: String? = "#fdf8f5",
    var themeTextColor: String? = "#4a2c2a",
    var themeAccentColor: String? = "#803b2a",
    var themePattern: String? = "none",
    var themeEffectType: String? = "none",
    var themeFontFamily: String? = "'Noto Sans KR', sans-serif",
    var themeFontSize: Int? = 16,
    var themeScrollReveal: Boolean = false,
) : Serializable
