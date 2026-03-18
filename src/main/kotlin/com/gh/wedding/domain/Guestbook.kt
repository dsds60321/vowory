package com.gh.wedding.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.PrePersist
import java.time.LocalDateTime

@Entity
class Guestbook(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitation_id")
    var invitation: Invitation? = null,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false)
    var password: String = "",

    @Column(nullable = false, length = 1000)
    var content: String = "",

    var createdAt: LocalDateTime? = null,
) {
    @PrePersist
    fun onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now()
        }
    }
}
