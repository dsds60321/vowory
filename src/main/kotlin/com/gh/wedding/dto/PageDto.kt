package com.gh.wedding.dto

import org.springframework.data.domain.Page

data class PagedResponse<T>(
    val content: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val last: Boolean,
)

fun <T> Page<T>.toPagedResponse(): PagedResponse<T> {
    return PagedResponse(
        content = content,
        page = number,
        size = size,
        totalElements = totalElements,
        totalPages = totalPages,
        last = isLast,
    )
}
