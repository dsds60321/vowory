package com.gh.wedding.service.storage

interface StorageService {
    fun store(relativePath: String, bytes: ByteArray, contentType: String = "application/octet-stream"): String
    fun delete(relativePath: String)
}
