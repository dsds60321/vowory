package com.gh.wedding.dto

import com.gh.wedding.domain.UserRole

data class AuthMeResponse(
    val loggedIn: Boolean,
    val userId: String? = null,
    val name: String? = null,
    val email: String? = null,
    val provider: String? = null,
    val role: UserRole? = null,
    val isAdmin: Boolean = false,
)
