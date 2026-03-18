package com.gh.wedding.dto

data class PublicConfigResponse(
    val kakaoJsKey: String,
    val appThemeKey: String?,
    val invitationThemeBackgroundColor: String?,
    val invitationThemeTextColor: String?,
    val invitationThemeAccentColor: String?,
    val invitationThemePattern: String?,
    val invitationThemeEffectType: String?,
    val invitationThemeFontFamily: String?,
    val invitationThemeFontSize: Int?,
    val invitationThemeScrollReveal: Boolean?,
)
