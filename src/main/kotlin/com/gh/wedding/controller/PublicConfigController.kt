package com.gh.wedding.controller

import com.gh.wedding.config.KakaoProperties
import com.gh.wedding.dto.PublicConfigResponse
import com.gh.wedding.service.CompanyProfileService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/public/config")
class PublicConfigController(
    private val kakaoProperties: KakaoProperties,
    private val companyProfileService: CompanyProfileService,
) {
    @GetMapping
    fun getPublicConfig(): PublicConfigResponse {
        val companyProfile = companyProfileService.getDefaultProfile()
        return PublicConfigResponse(
            kakaoJsKey = kakaoProperties.js,
            appThemeKey = companyProfile?.appThemeKey,
            invitationThemeBackgroundColor = companyProfile?.invitationThemeBackgroundColor,
            invitationThemeTextColor = companyProfile?.invitationThemeTextColor,
            invitationThemeAccentColor = companyProfile?.invitationThemeAccentColor,
            invitationThemePattern = companyProfile?.invitationThemePattern,
            invitationThemeEffectType = companyProfile?.invitationThemeEffectType,
            invitationThemeFontFamily = companyProfile?.invitationThemeFontFamily,
            invitationThemeFontSize = companyProfile?.invitationThemeFontSize,
            invitationThemeScrollReveal = companyProfile?.invitationThemeScrollReveal,
        )
    }
}
