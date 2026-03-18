package com.gh.wedding.controller

import com.gh.wedding.dto.PublicThankyouResponse
import com.gh.wedding.service.ThankyouService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/public/thankyou-cards")
class PublicThankyouController(
    private val thankyouService: ThankyouService,
) {

    @GetMapping("/{slugOrId}")
    fun getPublishedThankyou(@PathVariable slugOrId: String): PublicThankyouResponse {
        return thankyouService.getPublishedThankyou(slugOrId)
    }
}
