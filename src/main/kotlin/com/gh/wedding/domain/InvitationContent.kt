package com.gh.wedding.domain

import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import java.io.Serializable
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit
import java.time.format.DateTimeFormatter

@JsonIgnoreProperties(ignoreUnknown = true)
data class InvitationContent(
    var status: InvitationStatus = InvitationStatus.ACTIVE,
    var groomName: String? = null,
    var brideName: String? = null,
    var date: String? = null,
    var locationName: String? = null,
    var address: String? = null,
    var message: String? = null,
    var groomContact: String? = null,
    var brideContact: String? = null,
    var imageUrls: MutableList<String> = mutableListOf(),
    var accountNumber: String? = null,
    var useSeparateAccounts: Boolean = false,
    var groomAccountNumber: String? = null,
    var brideAccountNumber: String? = null,
    var groomRelation: String? = null,
    var groomFatherName: String? = null,
    var groomFatherContact: String? = null,
    var groomMotherName: String? = null,
    var groomMotherContact: String? = null,
    var brideRelation: String? = null,
    var brideFatherName: String? = null,
    var brideFatherContact: String? = null,
    var brideMotherName: String? = null,
    var brideMotherContact: String? = null,
    var bus: String? = null,
    var subway: String? = null,
    var car: String? = null,
    var paperInvitationUrl: String? = null,
    var mainImageUrl: String? = null,
    var fontFamily: String? = null,
    var fontColor: String? = null,
    var fontSize: Int? = null,
    var heroMainFontFamily: String? = null,
    var heroMainFontColor: String? = null,
    var heroMainFontSize: Int? = null,
    var heroSubFontFamily: String? = null,
    var heroSubFontColor: String? = null,
    var heroSubFontSize: Int? = null,
    var useGuestbook: Boolean = true,
    var useRsvpModal: Boolean = true,
    var rsvpAutoOpenOnLoad: Boolean = false,
    var backgroundMusicUrl: String? = null,
    var slug: String? = null,
    var seoTitle: String? = null,
    var seoDescription: String? = null,
    var seoImageUrl: String? = null,
    var galleryTitle: String? = "웨딩 갤러리",
    var galleryType: String? = "swipe",
    var themeBackgroundColor: String? = "#fdf8f5",
    var themeTextColor: String? = "#4a2c2a",
    var themeAccentColor: String? = "#803b2a",
    var themePatternColor: String? = "#803b2a",
    var themePattern: String? = "none",
    var themeEffectType: String? = "none",
    var themeFontFamily: String? = "'Noto Sans KR', sans-serif",
    var themeFontSize: Int? = 16,
    var themeScrollReveal: Boolean = false,
    // 추가된 필드들
    var heroDesignId: String? = null,
    var heroEffectType: String? = "none",
    var heroEffectParticleCount: Int? = 30,
    var heroEffectSpeed: Int? = 100,
    var heroEffectOpacity: Int? = 72,
    var heroAccentFontFamily: String? = "'Playfair Display', serif",
    var messageFontFamily: String? = null,
    var transportFontFamily: String? = null,
    var rsvpTitle: String? = null,
    var rsvpMessage: String? = null,
    var rsvpButtonText: String? = null,
    var rsvpFontFamily: String? = null,
    var detailContent: String? = null,
    var detailFontFamily: String? = null,
    // 추가된 필드들
    var locationTitle: String? = null,
    var locationFloorHall: String? = null,
    var locationContact: String? = null,
    var showMap: Boolean = true,
    var lockMap: Boolean = false,
    var openingEnabled: Boolean = false,
    var openingAnimationType: String? = null,
    var openingBackgroundType: String? = null,
    var openingBackgroundColor: String? = null,
    var openingImageUrl: String? = null,
    var openingTitle: String? = null,
    var openingMessage: String? = null,
    var openingFontFamily: String? = null,
    var openingFontColor: String? = null,
    var openingTitleFontSize: Int? = null,
    var openingMessageFontSize: Int? = null,
) : Serializable {
    private fun parseDateTime(rawDate: String): LocalDateTime? {
        val normalized = rawDate.trim()
        if (normalized.isBlank()) return null

        val localDateTimePatterns = listOf(
            DateTimeFormatter.ISO_LOCAL_DATE_TIME,
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
        )

        localDateTimePatterns.forEach { formatter ->
            runCatching { LocalDateTime.parse(normalized, formatter) }.getOrNull()?.let { return it }
        }

        runCatching { OffsetDateTime.parse(normalized).toLocalDateTime() }.getOrNull()?.let { return it }
        runCatching { LocalDate.parse(normalized).atStartOfDay() }.getOrNull()?.let { return it }

        return null
    }

    @JsonIgnore
    fun formattedDate(): String {
        val rawDate = date?.trim().orEmpty()
        if (rawDate.isBlank()) return ""

        return try {
            val localDateTime = parseDateTime(rawDate) ?: return rawDate
            val amPm = if (localDateTime.hour < 12) "오전" else "오후"
            val hour12 = when (val value = localDateTime.hour % 12) {
                0 -> 12
                else -> value
            }
            "%d년 %d월 %d일 %s %d시 %02d분".format(
                localDateTime.year,
                localDateTime.monthValue,
                localDateTime.dayOfMonth,
                amPm,
                hour12,
                localDateTime.minute,
            )
        } catch (_: Exception) {
            rawDate
        }
    }

    @JsonIgnore
    fun dday(): String {
        val rawDate = date?.trim().orEmpty()
        if (rawDate.isBlank()) return ""

        return try {
            val eventDate = (parseDateTime(rawDate) ?: return "").toLocalDate()
            val today = LocalDate.now()
            val days = ChronoUnit.DAYS.between(today, eventDate)
            when {
                days > 0 -> "D-$days"
                days == 0L -> "D-Day"
                else -> "D+${kotlin.math.abs(days)}"
            }
        } catch (_: Exception) {
            ""
        }
    }
}
