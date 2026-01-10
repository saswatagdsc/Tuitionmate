package com.example.android.fees

import java.io.Serializable
import java.util.Date

data class FeeRecord(
    val id: String,
    val studentId: String,
    val amount: Double,
    val dueDate: String, // YYYY-MM-DD
    var status: String, // pending, paid, overdue
    val type: String, // monthly, one-time, etc.
    val month: String? = null,
    val year: Int? = null,
    val title: String? = null,
    val description: String? = null,
    val feePolicy: String = "advance",
    val createdAt: String,
    val payments: MutableList<Payment> = mutableListOf(),
    var paidOn: String? = null
) : Serializable

data class Payment(
    val id: String,
    val feeId: String,
    val date: String,
    val amount: Double,
    val method: String, // cash, online, upi, etc.
    val note: String? = null
) : Serializable

data class Student(
    val id: String,
    val name: String,
    val className: String,
    val phone: String? = null
) : Serializable
