package com.gh.wedding.domain

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter

@Converter
class InvitationContentConverter : AttributeConverter<InvitationContent, String> {
    private val objectMapper: ObjectMapper = jacksonObjectMapper()

    override fun convertToDatabaseColumn(attribute: InvitationContent?): String? {
        if (attribute == null) return null

        return try {
            objectMapper.writeValueAsString(attribute)
        } catch (e: JsonProcessingException) {
            throw IllegalStateException("Error converting InvitationContent to JSON", e)
        }
    }

    override fun convertToEntityAttribute(dbData: String?): InvitationContent {
        if (dbData.isNullOrBlank()) return InvitationContent()

        return try {
            objectMapper.readValue(dbData, InvitationContent::class.java)
        } catch (e: JsonProcessingException) {
            throw IllegalStateException("Error converting JSON to InvitationContent", e)
        }
    }
}
