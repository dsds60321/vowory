package com.gh.wedding.common

class WeddingException(
    val errorCode: WeddingErrorCode,
    val detailMessage: String? = null,
    cause: Throwable? = null,
) : RuntimeException(detailMessage ?: errorCode.message, cause)
