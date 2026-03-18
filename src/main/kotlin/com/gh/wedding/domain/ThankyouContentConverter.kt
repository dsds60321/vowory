package com.gh.wedding.domain

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter

@Converter
class ThankyouContentConverter : AttributeConverter<ThankyouContent, String> {
    private val objectMapper: ObjectMapper = jacksonObjectMapper()

    override fun convertToDatabaseColumn(attribute: ThankyouContent?): String? {
        if (attribute == null) return null

        return try {
            objectMapper.writeValueAsString(attribute)
        } catch (e: JsonProcessingException) {
            throw IllegalStateException("Error converting ThankyouContent to JSON", e)
        }
    }

    override fun convertToEntityAttribute(dbData: String?): ThankyouContent {
        if (dbData.isNullOrBlank()) return ThankyouContent()

        return try {
            objectMapper.readValue(dbData, ThankyouContent::class.java)
        } catch (e: JsonProcessingException) {
            throw IllegalStateException("Error converting JSON to ThankyouContent", e)
        }
    }
}
