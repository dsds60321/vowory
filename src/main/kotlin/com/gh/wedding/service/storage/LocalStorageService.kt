package com.gh.wedding.service.storage

import com.gh.wedding.config.StorageProperties
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Paths

@Service
@ConditionalOnProperty(prefix = "app.storage", name = ["type"], havingValue = "local", matchIfMissing = true)
class LocalStorageService(
    private val storageProperties: StorageProperties,
) : StorageService {

    override fun store(relativePath: String, bytes: ByteArray, contentType: String): String {
        val normalized = normalize(relativePath)
        val destination = Paths.get(storageProperties.localBasePath, normalized)

        Files.createDirectories(destination.parent)
        Files.write(destination, bytes)

        val publicPrefix = storageProperties.localPublicPrefix.trimEnd('/')
        return "$publicPrefix/$normalized"
    }

    override fun delete(relativePath: String) {
        val normalized = normalize(relativePath)
        val destination = Paths.get(storageProperties.localBasePath, normalized)
        Files.deleteIfExists(destination)
    }

    private fun normalize(value: String): String {
        return value
            .replace("\\", "/")
            .split("/")
            .filter { it.isNotBlank() }
            .joinToString("/")
    }
}
