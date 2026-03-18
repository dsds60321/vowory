package com.gh.wedding.security

data class AuthUser(
    val userId: String,
    val name: String? = null,
    val email: String? = null,
    val provider: String,
)
