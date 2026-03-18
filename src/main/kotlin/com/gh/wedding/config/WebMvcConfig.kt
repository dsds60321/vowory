package com.gh.wedding.config

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import java.nio.file.Paths

@Configuration
class WebMvcConfig(
    private val storageProperties: StorageProperties,
) : WebMvcConfigurer {
    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        if (storageProperties.type != "local") return

        val localBasePath = Paths.get(storageProperties.localBasePath).toAbsolutePath().toUri().toString()
        val publicPrefix = storageProperties.localPublicPrefix.trimEnd('/')
        registry.addResourceHandler("$publicPrefix/**").addResourceLocations(localBasePath)
    }
}
