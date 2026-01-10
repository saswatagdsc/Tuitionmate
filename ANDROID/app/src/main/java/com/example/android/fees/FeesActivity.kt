package com.example.android.fees

import android.app.DatePickerDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.android.R
// import com.example.android.fees.FeeModels.* // Removed incorrect import
import com.google.android.material.chip.ChipGroup
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.tabs.TabLayout
import com.google.android.material.textfield.TextInputEditText
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

class FeesActivity : AppCompatActivity(), FeesAdapter.FeeActionListener {

    private lateinit var adapter: FeesAdapter
    private val allFees = mutableListOf<FeeRecord>()
    private val students = mutableListOf<Student>()
    
    // User State
    private var isTeacher = true
    private val currentStudentId = "s1" // Mock logged in student

    // UI References
    private lateinit var recyclerView: RecyclerView
    private lateinit var tabLayout: TabLayout
    private lateinit var chipGroup: ChipGroup

    // Stat Views
    private lateinit var tvStatCollected: TextView
    private lateinit var tvStatPending: TextView
    private lateinit var tvStatOverdue: TextView
    private lateinit var tvStatTotal: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_fees)

        setSupportActionBar(findViewById(R.id.toolbar))

        mockData()

        recyclerView = findViewById(R.id.recyclerView)
        tabLayout = findViewById(R.id.tabLayout)
        chipGroup = findViewById(R.id.chipGroupFilters)

        // Init Stat Views
        tvStatCollected = findViewById(R.id.tvStatCollected)
        tvStatPending = findViewById(R.id.tvStatPending)
        tvStatOverdue = findViewById(R.id.tvStatOverdue)
        tvStatTotal = findViewById(R.id.tvStatTotal)
        
        recyclerView.layoutManager = LinearLayoutManager(this)
        adapter = FeesAdapter(this, allFees, students, this)
        recyclerView.adapter = adapter

        findViewById<FloatingActionButton>(R.id.fabCreateInvoice).setOnClickListener {
            showCreateFeeDialog()
        }

        tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) { applyFilters() }
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })

        chipGroup.setOnCheckedChangeListener { _, _ -> applyFilters() }
        
        applyFilters()
        calculateStats()
    }

    private fun calculateStats() {
        // Filter based on "Available Fees" (currently all fees as teacher)
        val collected = allFees.filter { it.status == "paid" }.sumOf { it.amount }
        val pending = allFees.filter { it.status == "pending" }.sumOf { it.amount }
        val overdue = allFees.filter { it.status == "overdue" }.sumOf { it.amount }
        val total = allFees.sumOf { it.amount }

        val fmt = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
        
        tvStatCollected.text = fmt.format(collected)
        tvStatPending.text = fmt.format(pending)
        tvStatOverdue.text = fmt.format(overdue)
        tvStatTotal.text = fmt.format(total)
    }

    private fun applyFilters() {
        val selectedTabPosition = tabLayout.selectedTabPosition
        var filteredList = allFees.toList()

        when (selectedTabPosition) {
            1 -> filteredList = filteredList.filter { it.type == "monthly" }
            3 -> filteredList = filteredList.filter { it.status == "overdue" }
        }

        val checkedChipId = chipGroup.checkedChipId
        if (checkedChipId != -1) {
            when (checkedChipId) {
                R.id.chipPending -> filteredList = filteredList.filter { it.status == "pending" }
                R.id.chipOverdue -> filteredList = filteredList.filter { it.status == "overdue" }
                R.id.chipPaid -> filteredList = filteredList.filter { it.status == "paid" }
            }
        }

        filteredList = filteredList.sortedByDescending { it.dueDate }
        adapter.updateData(filteredList)
        calculateStats() // Re-calculate or keep global? Usually stats are global context, not filtered. Keeping global mostly.
    }

    private fun showCreateFeeDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_create_fee, null)
        val dialog = MaterialAlertDialogBuilder(this)
            .setView(dialogView)
            .create()

        val studentAdapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, students.map { it.name })
        val inputStudent = dialogView.findViewById<AutoCompleteTextView>(R.id.inputStudent)
        inputStudent.setAdapter(studentAdapter)

        val months = listOf("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")
        val monthAdapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, months)
        dialogView.findViewById<AutoCompleteTextView>(R.id.inputMonth).setAdapter(monthAdapter)

        val inputDueDate = dialogView.findViewById<TextInputEditText>(R.id.inputDueDate)
        inputDueDate.setOnClickListener {
            val c = Calendar.getInstance()
            DatePickerDialog(this, { _, year, month, day ->
                val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                c.set(year, month, day)
                inputDueDate.setText(fmt.format(c.time))
            }, c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)).show()
        }
        inputDueDate.setText(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()))

        dialogView.findViewById<Button>(R.id.btnSubmit).setOnClickListener {
            val studentName = inputStudent.text.toString()
            val amountStr = dialogView.findViewById<TextInputEditText>(R.id.inputAmount).text.toString()
            
            if (studentName.isNotEmpty() && amountStr.isNotEmpty()) {
                val student = students.find { it.name == studentName } ?: students[0]
                val newFee = FeeRecord(
                    id = "f${System.currentTimeMillis()}",
                    studentId = student.id,
                    amount = amountStr.toDouble(),
                    dueDate = inputDueDate.text.toString(),
                    status = "pending",
                    type = "monthly",
                    month = dialogView.findViewById<AutoCompleteTextView>(R.id.inputMonth).text.toString(),
                    year = dialogView.findViewById<TextInputEditText>(R.id.inputYear).text.toString().toIntOrNull() ?: 2026,
                    createdAt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                )
                allFees.add(0, newFee)
                applyFilters()
                dialog.dismiss()
                Toast.makeText(this, "Invoice Created", Toast.LENGTH_SHORT).show()
            }
        }
        dialog.show()
    }

    override fun onRecordPayment(fee: FeeRecord) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_record_payment, null)
        val dialog = MaterialAlertDialogBuilder(this)
            .setView(dialogView)
            .create()

        val studentName = students.find { it.id == fee.studentId }?.name ?: "Unknown"
        dialogView.findViewById<TextView>(R.id.tvPaymentStudentName).text = "For: $studentName"
        
        val inputDate = dialogView.findViewById<TextInputEditText>(R.id.inputPaymentDate)
        inputDate.setText(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()))
        inputDate.setOnClickListener {
             val c = Calendar.getInstance()
             DatePickerDialog(this, { _, year, month, day ->
                 val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                 c.set(year, month, day)
                 inputDate.setText(fmt.format(c.time))
             }, c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)).show()
        }

        val inputAmount = dialogView.findViewById<TextInputEditText>(R.id.inputPaymentAmount)
        inputAmount.setText(fee.amount.toString()) // Default to full amount

        val methods = listOf("Cash", "Online", "UPI", "PhonePe", "GooglePay", "Bank Transfer", "Cheque")
        val methodAdapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, methods)
        dialogView.findViewById<AutoCompleteTextView>(R.id.inputPaymentMethod).setAdapter(methodAdapter)

        dialogView.findViewById<Button>(R.id.btnSavePayment).setOnClickListener {
            val amount = inputAmount.text.toString().toDoubleOrNull()
            val method = dialogView.findViewById<AutoCompleteTextView>(R.id.inputPaymentMethod).text.toString()
            val note = dialogView.findViewById<TextInputEditText>(R.id.inputPaymentNote).text.toString()
            val date = inputDate.text.toString()

            if (amount != null && amount > 0) {
                 // Update Fee Status
                 val isFullPayment = amount >= fee.amount
                 fee.status = if (isFullPayment) "paid" else "pending" // Naive partial payment logic - usually we track balance
                 if(isFullPayment) fee.paidOn = date
                 
                 fee.payments.add(Payment(
                     id = "p${System.currentTimeMillis()}",
                     feeId = fee.id,
                     date = date,
                     amount = amount,
                     method = method.lowercase(),
                     note = note.ifEmpty { null }
                 ))
                 
                 adapter.notifyDataSetChanged()
                 calculateStats()
                 dialog.dismiss()
                 Toast.makeText(this, "Payment Recorded", Toast.LENGTH_SHORT).show()
            }
        }
        dialog.show()
    }

    override fun onMarkPaid(fee: FeeRecord) {
        fee.status = "paid"
        fee.paidOn = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        adapter.notifyDataSetChanged()
        calculateStats()
        Toast.makeText(this, "Marked as Paid", Toast.LENGTH_SHORT).show()
    }

    override fun onDelete(fee: FeeRecord) {
        MaterialAlertDialogBuilder(this)
            .setTitle("Delete Invoice")
            .setMessage("Are you sure you want to delete this invoice?")
            .setPositiveButton("Delete") { _, _ ->
                allFees.remove(fee)
                applyFilters()
                calculateStats()
                Toast.makeText(this, "Deleted", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onWhatsAppReminder(fee: FeeRecord) {
        val student = students.find { it.id == fee.studentId }
        val phone = student?.phone
        if (phone != null && phone.isNotEmpty()) {
            val cleanPhone = phone.replace(Regex("[^0-9]"), "")
            // Ensure 91 prefix
            val finalPhone = if(cleanPhone.length == 10) "91$cleanPhone" else cleanPhone
            val message = "Hello, this is a reminder regarding the pending fee of ₹${fee.amount} for ${student.name}. Please pay at your earliest convenience."
            val url = "https://wa.me/$finalPhone?text=${Uri.encode(message)}"
            val intent = Intent(Intent.ACTION_VIEW)
            intent.data = Uri.parse(url)
            try {
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "WhatsApp not installed", Toast.LENGTH_SHORT).show()
            }
        } else {
             Toast.makeText(this, "Phone number not available", Toast.LENGTH_SHORT).show()
        }
    }

    private fun mockData() {
        students.add(Student("s1", "Aarav Patel", "Class 10", "9876543210"))
        students.add(Student("s2", "Vihaan Singh", "Class 10", "1234567890"))
        students.add(Student("s3", "Aditi Sharma", "Class 12"))

        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val today = Date()
        val nextMonth = Calendar.getInstance().apply { add(Calendar.DAY_OF_MONTH, 30) }.time
        val pastMonth = Calendar.getInstance().apply { add(Calendar.DAY_OF_MONTH, -10) }.time

        allFees.add(FeeRecord("f1", "s1", 2000.0, fmt.format(today), "pending", "monthly", "January", 2026, null, null, "advance", fmt.format(today)))
        allFees.add(FeeRecord("f2", "s2", 2500.0, fmt.format(pastMonth), "overdue", "monthly", "December", 2025, null, null, "advance", fmt.format(pastMonth)))
        allFees.add(FeeRecord("f3", "s3", 1500.0, fmt.format(nextMonth), "pending", "monthly", "January", 2026, null, null, "advance", fmt.format(today)))
        allFees.add(FeeRecord("f4", "s1", 5000.0, fmt.format(pastMonth), "paid", "one-time", null, null, null, "Registration Fee", "advance", fmt.format(pastMonth), mutableListOf(), fmt.format(pastMonth)))
    }
}
