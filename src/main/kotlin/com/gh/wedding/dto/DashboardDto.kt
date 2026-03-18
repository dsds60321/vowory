package com.gh.wedding.dto

data class DashboardVisitPointResponse(
    val date: String,
    val count: Long,
)

data class DashboardSummaryResponse(
    val totalVisitors: Long,
    val totalRsvps: Int,
    val totalGuestbooks: Int,
    val visitorTrend: List<DashboardVisitPointResponse>,
    val recentRsvps: List<RsvpSummaryResponse>,
    val recentGuestbooks: List<MyGuestbookResponse>,
)
