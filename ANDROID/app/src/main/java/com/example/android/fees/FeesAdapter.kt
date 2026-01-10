package com.example.android.fees

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageButton
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.example.android.R
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.Date

class FeesAdapter(
    private val context: Context,
    private var fees: List<FeeRecord>,
    private val students: List<Student>,
    private val isTeacher: Boolean,
    private val listener: FeeActionListener
) : RecyclerView.Adapter<FeesAdapter.FeeViewHolder>() {

    interface FeeActionListener {
        fun onRecordPayment(fee: FeeRecord)
        fun onMarkPaid(fee: FeeRecord)
        fun onDelete(fee: FeeRecord)
        fun onWhatsAppReminder(fee: FeeRecord)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FeeViewHolder {
        val view = LayoutInflater.from(context).inflate(R.layout.item_fee, parent, false)
        return FeeViewHolder(view)
    }

    override fun onBindViewHolder(holder: FeeViewHolder, position: Int) {
        val fee = fees[position]
        holder.bind(fee)
    }

    override fun getItemCount(): Int = fees.size

    fun updateData(newFees: List<FeeRecord>) {
        this.fees = newFees
        notifyDataSetChanged()
    }

    inner class FeeViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvStudentName: TextView = itemView.findViewById(R.id.tvStudentName)
        private val tvAmount: TextView = itemView.findViewById(R.id.tvAmount)
        private val tvDescription: TextView = itemView.findViewById(R.id.tvDescription)
        private val tvStatus: TextView = itemView.findViewById(R.id.tvStatus)
        private val tvDueDate: TextView = itemView.findViewById(R.id.tvDueDate)
        private val btnRecordPayment: Button = itemView.findViewById(R.id.btnRecordPayment)
        private val btnMore: ImageButton = itemView.findViewById(R.id.btnMore)
        private val btnWhatsApp: ImageButton = itemView.findViewById(R.id.btnWhatsApp)

        fun bind(fee: FeeRecord) {
            val student = students.find { it.id == fee.studentId }
            tvStudentName.text = student?.name ?: "Unknown Student"
            
            val format = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
            tvAmount.text = format.format(fee.amount)

            tvDescription.text = if (fee.type == "monthly") {
                "${fee.month} ${fee.year ?: ""} (Monthly)"
            } else {
                fee.description ?: fee.type.replaceFirstChar { it.uppercase() }
            }

            // Status Styling
            tvStatus.text = fee.status
            val statusColorRes = when (fee.status) {
                "paid" -> android.R.color.holo_green_dark
                "overdue" -> android.R.color.holo_red_dark
                else -> android.R.color.holo_orange_dark // pending
            }
             val statusBgColor = when (fee.status) {
                "paid" -> Color.parseColor("#DCFCE7") // green-100
                "overdue" -> Color.parseColor("#FEE2E2") // red-100
                else -> Color.parseColor("#FEF9C3") // yellow-100
            }
            
            // Set background programmatically for simplicity or use shape drawable
            val drawable = GradientDrawable()
            drawable.setColor(statusBgColor)
            drawable.cornerRadius = 8f
            tvStatus.background = drawable
            tvStatus.setTextColor(ContextCompat.getColor(context, statusColorRes))

            // Due Date Calculation
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            try {
                val dueDate = dateFormat.parse(fee.dueDate)
                val today = Date()
                val diff = dueDate!!.time - today.time
                val days = TimeUnit.DAYS.convert(diff, TimeUnit.MILLISECONDS)

                if (fee.status == "paid") {
                    tvDueDate.visibility = View.GONE
                } else {
                    tvDueDate.visibility = View.VISIBLE
                    if (days < 0) {
                        tvDueDate.text = "${Math.abs(days)} days overdue"
                        tvDueDate.setTextColor(Color.RED)
                    } else if (days.toInt() == 0) {
                         tvDueDate.text = "Due Today"
                         tvDueDate.setTextColor(Color.DKGRAY)
                    } else {
                        tvDueDate.text = "Due in $days days"
                         tvDueDate.setTextColor(Color.GRAY)
                    }
                }
            } catch (e: Exception) {
                tvDueDate.text = fee.dueDate
            }

            // Buttons
             if (fee.status == "paid" || !isTeacher) {
                 btnRecordPayment.visibility = View.GONE
                 btnWhatsApp.visibility = View.GONE
             } else {
                 btnRecordPayment.visibility = View.VISIBLE
                 btnRecordPayment.setOnClickListener { listener.onRecordPayment(fee) }
                 
                 // Show WhatsApp for Overdue/Pending
                 btnWhatsApp.visibility = View.VISIBLE
                 btnWhatsApp.setOnClickListener { listener.onWhatsAppReminder(fee) }
             }

            // More Menu (Stub)
            if (!isTeacher) {
                btnMore.visibility = View.GONE
            } else {
                btnMore.visibility = View.VISIBLE
                btnMore.setOnClickListener {
                    // Show popup menu here (Mark Paid, Delete)
                    val popup = androidx.appcompat.widget.PopupMenu(context, btnMore)
                    popup.menu.add("Mark Paid")
                    popup.menu.add("Delete")
                    popup.setOnMenuItemClickListener { item ->
                        when (item.title) {
                            "Mark Paid" -> listener.onMarkPaid(fee)
                            "Delete" -> listener.onDelete(fee)
                        }
                        true
                    }
                    popup.show()
                }
            }
        }
    }
}
