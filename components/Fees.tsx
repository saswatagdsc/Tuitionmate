import React, { useMemo, useState } from 'react';
import { useData } from '../services/store';
import { IndianRupee, Clock, AlertCircle, CheckCircle2, Download, Plus, X, History, FileText, Users, CreditCard } from 'lucide-react';
import { FeeRecord, Payment } from '../types';
import { utils, writeFile } from 'xlsx';

export const Fees: React.FC = () => {
  const { fees, students, updateFeeStatus, addFee, currentUser, addPayment, deleteFee, generateMonthlyFees } = useData();
  const [viewMode, setViewMode] = useState<'invoices' | 'payments' | 'pending' | 'overdue' | 'monthly'>('invoices');
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
    // Payment modal state
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);
    const [paymentDraft, setPaymentDraft] = useState<Partial<Payment>>({
      date: new Date().toISOString().split('T')[0],
      amount: undefined,
      method: 'cash',
      note: ''
    });

  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFee, setNewFee] = useState<Partial<FeeRecord>>({
    studentId: '',
    amount: undefined,
    dueDate: new Date().toISOString().split('T')[0],
    type: 'monthly',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    description: '',
    feePolicy: 'advance'
  });

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'Unknown';

  // Filter Logic: If student logged in, only show their fees
  const availableFees = currentUser?.role === 'student' ? fees.filter(f => f.studentId === currentUser.studentId) : fees;

  const allPayments = useMemo(() => {
    return availableFees.flatMap(fee => (fee.payments || []).map(p => ({
      ...p,
      studentId: fee.studentId,
      feeId: fee.id,
      feeTitle: fee.type === 'monthly' ? `${fee.month} (Monthly)` : (fee.description || fee.type),
      feeAmount: fee.amount
    }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [availableFees]);

  // Compute pending students (those with unpaid fees)
  const pendingStudents = useMemo(() => {
    const studentSet = new Set<string>();
    availableFees.forEach(fee => {
      if (fee.status === 'pending') {
        const paidAmount = (fee.payments || []).reduce((sum, p) => sum + p.amount, 0);
        if (paidAmount < fee.amount) {
          studentSet.add(fee.studentId);
        }
      }
    });
    return students.filter(s => studentSet.has(s.id));
  }, [availableFees, students]);

  // Compute overdue students (those with overdue unpaid fees)
  const overdueStudents = useMemo(() => {
    const studentSet = new Set<string>();
    const today = new Date();
    availableFees.forEach(fee => {
      if (fee.status === 'pending') {
        const dueDate = new Date(fee.dueDate);
        if (dueDate < today) {
          const paidAmount = (fee.payments || []).reduce((sum, p) => sum + p.amount, 0);
          if (paidAmount < fee.amount) {
            studentSet.add(fee.studentId);
          }
        }
      }
    });
    return students.filter(s => studentSet.has(s.id)).sort((a, b) => {
      const aFees = availableFees.filter(f => f.studentId === a.id && f.status === 'pending');
      const bFees = availableFees.filter(f => f.studentId === b.id && f.status === 'pending');
      const aDaysOverdue = Math.max(...aFees.map(f => (Date.now() - new Date(f.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
      const bDaysOverdue = Math.max(...bFees.map(f => (Date.now() - new Date(f.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
      return bDaysOverdue - aDaysOverdue; // Most overdue first
    });
  }, [availableFees, students]);

  const filteredFees = availableFees.filter(fee => {
    if (filter === 'all') return true;
    return fee.status === filter;
  });

  const totals = useMemo(() => {
    const totalBilled = availableFees.reduce((a, b) => a + b.amount, 0);
    const totalCollected = availableFees.filter(f => f.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const totalOutstanding = availableFees.filter(f => f.status !== 'paid').reduce((a, b) => a + b.amount, 0);
    const overdueCount = availableFees.filter(f => f.status === 'overdue').length;
    return { totalBilled, totalCollected, totalOutstanding, overdueCount };
  }, [availableFees]);

  // Group fees by month and year for month-wise view
  const feesByMonth = useMemo(() => {
    const grouped: Record<string, FeeRecord[]> = {};
    filteredFees.forEach(fee => {
      if (fee.type === 'monthly' && fee.month) {
        const key = `${fee.month} ${fee.year || new Date().getFullYear()}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(fee);
      }
    });
    // Sort by date (most recent first)
    const sorted = Object.entries(grouped).sort((a, b) => {
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const [aMonth, aYear] = a[0].split(' ');
      const [bMonth, bYear] = b[0].split(' ');
      const aIndex = monthNames.indexOf(aMonth) + (parseInt(aYear) * 12);
      const bIndex = monthNames.indexOf(bMonth) + (parseInt(bYear) * 12);
      return bIndex - aIndex;
    });
    return sorted;
  }, [filteredFees]);

  // Helper to calculate days until/past due
  const getDueDaysText = (dueDate: string): { text: string; isOverdue: boolean; daysOverdue: number } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} days overdue`, isOverdue: true, daysOverdue: Math.abs(diffDays) };
    } else if (diffDays === 0) {
      return { text: 'Due today', isOverdue: false, daysOverdue: 0 };
    } else if (diffDays <= 3) {
      return { text: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`, isOverdue: false, daysOverdue: 0 };
    }
    return { text: `Due: ${new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, isOverdue: false, daysOverdue: 0 };
  };

  // Generate monthly fees for current month
  const handleGenerateMonthlyFees = async () => {
    if (!generateMonthlyFees) return;
    setIsGenerating(true);
    try {
      const now = new Date();
      const monthName = now.toLocaleString('default', { month: 'long' });
      const year = now.getFullYear();
      const result = await generateMonthlyFees(monthName, year);
      if (result) {
        alert(`Generated ${result.created} fee records. ${result.skipped} skipped (already exist).`);
      }
    } catch (e) {
      alert('Failed to generate fees. Check console for errors.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusColor = (status: FeeRecord['status']) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50 border-green-100';
      case 'overdue': return 'text-red-600 bg-red-50 border-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee || !paymentDraft.amount || !paymentDraft.method || !paymentDraft.date) return;
    const payment: Payment = {
      id: `p${Date.now()}`,
      feeId: selectedFee.id,
      date: paymentDraft.date,
      amount: Number(paymentDraft.amount),
      method: paymentDraft.method as Payment['method'],
      note: paymentDraft.note || ''
    };
    addPayment(payment);
    setIsPaymentModalOpen(false);
    setSelectedFee(null);
    setPaymentDraft({ date: new Date().toISOString().split('T')[0], amount: undefined, method: 'cash', note: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFee.studentId || !newFee.amount || !newFee.type) return;

    addFee({
      id: `f${Date.now()}`,
      studentId: newFee.studentId,
      amount: Number(newFee.amount),
      dueDate: newFee.dueDate!,
      status: 'pending',
      type: newFee.type,
      month: newFee.type === 'monthly' ? newFee.month : undefined,
      year: newFee.type === 'monthly' ? newFee.year : undefined,
      title: newFee.type === 'monthly' 
        ? `${newFee.month} ${newFee.year} Monthly Fee`
        : newFee.description,
      description: newFee.type !== 'monthly' ? newFee.description : undefined,
      feePolicy: newFee.feePolicy || 'advance',
      createdAt: new Date().toISOString()
    });

    setIsModalOpen(false);
    setNewFee({
      studentId: '',
      amount: undefined,
      dueDate: new Date().toISOString().split('T')[0],
      type: 'monthly',
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear(),
      description: '',
      feePolicy: 'advance'
    });
  };

  const downloadReport = () => {
    // Flatten data for Excel - Fee Summary
    const feeData = filteredFees.map(f => {
      const student = students.find(s => s.id === f.studentId);
      const totalPaid = f.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const balance = f.amount - totalPaid;
      return {
        'Student Name': student?.name || 'Unknown',
        'Student ID': f.studentId,
        'Fee Type': f.type || 'N/A',
        'Description': f.description || f.month || '-',
        'Total Amount': f.amount,
        'Paid Amount': totalPaid,
        'Balance': balance,
        'Status': f.status,
        'Due Date': f.dueDate,
        'Paid On': f.paidOn || '-',
        'Parent Contact': student?.phone || '-'
      };
    });

    // Payment Log Sheet with Method Tracking
    const paymentLog: any[] = [];
    filteredFees.forEach(f => {
      const student = students.find(s => s.id === f.studentId);
      if (f.payments && f.payments.length > 0) {
        f.payments.forEach(p => {
          paymentLog.push({
            'Date': p.date,
            'Student': student?.name || 'Unknown',
            'Fee Type': f.type || 'N/A',
            'Amount': p.amount,
            'Payment Method': p.method.toUpperCase(),
            'Note': p.note || '-',
            'Fee Status': f.status
          });
        });
      }
    });

    // Payment Method Summary Sheet
    const methodSummary = {};
    paymentLog.forEach(p => {
      const method = p['Payment Method'];
      if (!methodSummary[method]) {
        methodSummary[method] = { Method: method, Count: 0, Total: 0 };
      }
      methodSummary[method].Count += 1;
      methodSummary[method].Total += p.Amount;
    });
    const methodSummaryData = Object.values(methodSummary);

    // Create Workbook
    const wb = utils.book_new();
    
    // Fee Summary Sheet
    const ws1 = utils.json_to_sheet(feeData);
    ws1['!cols'] = [
      {wch: 20}, {wch: 12}, {wch: 12}, {wch: 25}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 15}
    ];
    utils.book_append_sheet(wb, ws1, "Fee Summary");
    
    // Payment Log Sheet
    if (paymentLog.length > 0) {
      const ws2 = utils.json_to_sheet(paymentLog);
      ws2['!cols'] = [
        {wch: 12}, {wch: 20}, {wch: 15}, {wch: 12}, {wch: 15}, {wch: 30}, {wch: 10}
      ];
      utils.book_append_sheet(wb, ws2, "Payment Log");
    }

    // Payment Method Summary Sheet
    if (methodSummaryData.length > 0) {
      const ws_method = utils.json_to_sheet(methodSummaryData);
      ws_method['!cols'] = [
        {wch: 15}, {wch: 10}, {wch: 15}
      ];
      utils.book_append_sheet(wb, ws_method, "Payment Methods");
    }

    // Summary Statistics Sheet
    const summaryData = [
      { 'Metric': 'Total Billed', 'Value': totals.totalBilled },
      { 'Metric': 'Total Collected', 'Value': totals.totalCollected },
      { 'Metric': 'Outstanding', 'Value': totals.totalOutstanding },
      { 'Metric': 'Overdue Count', 'Value': totals.overdueCount },
      { 'Metric': 'Total Students', 'Value': new Set(filteredFees.map(f => f.studentId)).size },
      { 'Metric': 'Total Invoices', 'Value': filteredFees.length }
    ];
    const ws3 = utils.json_to_sheet(summaryData);
    ws3['!cols'] = [{wch: 20}, {wch: 15}];
    utils.book_append_sheet(wb, ws3, "Summary");

    // Download
    writeFile(wb, `Fees_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-slate-900">Fee Management</h2>
        {currentUser?.role === 'teacher' && (
          <div className="flex gap-2">
            <button 
              onClick={handleGenerateMonthlyFees}
              disabled={isGenerating}
              className="bg-green-600 text-white px-3 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold text-sm disabled:opacity-50"
              title="Generate monthly fees for all active students"
            >
              {isGenerating ? '⏳' : '📅'} Generate Monthly
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
              title="Create New Invoice"
            >
              <Plus size={20} />
              Create Invoice
            </button>
          </div>
        )}
      </div>

      {!currentUser && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
          Please login as a teacher to create fees.
        </div>
      )}
      
      {currentUser?.role === 'student' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          Student view: Check your fee status below. Contact your teacher for invoice details.
        </div>
      )}

      {/* View Toggle */}
      <div className="flex p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto">
        <button
          onClick={() => setViewMode('invoices')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
            viewMode === 'invoices' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {currentUser?.role === 'student' ? 'My Fees' : 'Invoices'}
        </button>
        {currentUser?.role !== 'student' && (
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              viewMode === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📅 Monthly
          </button>
        )}
        <button
          onClick={() => setViewMode('payments')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            viewMode === 'payments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <History size={16} /> Payments
        </button>
        {currentUser?.role !== 'student' && (
          <>
            <button
              onClick={() => setViewMode('pending')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                viewMode === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Clock size={16} /> To Pay
            </button>
            <button
              onClick={() => setViewMode('overdue')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                viewMode === 'overdue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <AlertCircle size={16} /> Overdue
            </button>
          </>
        )}
      </div>

      {/* Overview Horizontal Scroll - Teachers Only */}
      {currentUser?.role === 'teacher' && (
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          <div className="min-w-[140px] bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Collected</span>
              <div className="flex items-center gap-1 text-green-600">
                <IndianRupee size={16} />
                <span className="text-xl font-bold">{totals.totalCollected.toLocaleString()}</span>
              </div>
          </div>
          <div className="min-w-[140px] bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Pending</span>
              <div className="flex items-center gap-1 text-yellow-600">
                <Clock size={16} />
                <span className="text-xl font-bold">{availableFees.filter(f => f.status === 'pending').reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
              </div>
          </div>
          <div className="min-w-[140px] bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Overdue</span>
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle size={16} />
                <span className="text-xl font-bold">{availableFees.filter(f => f.status === 'overdue').reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
              </div>
          </div>
          <div className="min-w-[160px] bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Outstanding</span>
              <div className="flex items-center gap-1 text-slate-900">
                <IndianRupee size={16} />
                <span className="text-xl font-bold">{totals.totalOutstanding.toLocaleString()}</span>
              </div>
              <span className="text-[10px] text-red-600 mt-1">Overdue: {totals.overdueCount}</span>
          </div>
          <div className="min-w-[160px] bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Total Billed</span>
              <div className="flex items-center gap-1 text-slate-900">
                <IndianRupee size={16} />
                <span className="text-xl font-bold">{totals.totalBilled.toLocaleString()}</span>
              </div>
          </div>
        </div>
      )}

      {/* Filter and Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-1">
          {(['all', 'pending', 'overdue', 'paid'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          {currentUser?.role === 'teacher' && (
            <button 
              onClick={downloadReport}
              className="bg-green-600 text-white p-2 rounded-full shadow-sm hover:bg-green-700 transition-colors flex-shrink-0"
              title="Download Excel Report"
            >
              <Download size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Content Based on View Mode */}
      <div className="space-y-3 pb-20">
        {/* INVOICES VIEW */}
        {viewMode === 'invoices' && (
          <>
            {filteredFees.map((fee) => {
              const dueInfo = getDueDaysText(fee.dueDate);
              const isPayAfterStudy = fee.feePolicy === 'pay-after-study' && fee.isFirstMonth;
              
              return (
          <div key={fee.id} className={`bg-white p-4 rounded-xl shadow-sm ${
            fee.status === 'overdue' ? 'border-2 border-red-300 bg-red-50' : 
            fee.status === 'paid' ? 'border border-green-200' : 
            'border border-slate-100'
          }`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                {currentUser?.role !== 'student' && (
                  <h4 className="font-semibold text-slate-900">{getStudentName(fee.studentId)}</h4>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">
                    {fee.type === 'monthly' ? `${fee.month}${fee.year ? ` ${fee.year}` : ''} (Monthly)` : (fee.description || <span className="capitalize">{fee.type}</span>)}
                  </span>
                  {isPayAfterStudy && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                      Pay After Study
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="block font-bold text-lg text-slate-900">₹{fee.amount.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wide ${getStatusColor(fee.status)}`}>
                  {fee.status}
                </span>
                {fee.status !== 'paid' && (
                  <span className={`text-xs font-medium ${dueInfo.isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                    {dueInfo.text}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                 {currentUser?.role === 'teacher' && fee.status !== 'paid' && (
                    <button 
                      onClick={() => updateFeeStatus(fee.id, 'paid')}
                      className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-lg active:bg-blue-100"
                    >
                      Mark Paid
                    </button>
                  )}
                    {currentUser?.role === 'teacher' && (
                      <button
                        onClick={() => { setSelectedFee(fee); setIsPaymentModalOpen(true); }}
                        className="text-xs bg-green-50 text-green-700 font-bold px-3 py-1.5 rounded-lg active:bg-green-100"
                      >
                        Record Payment
                      </button>
                    )}
                    {currentUser?.role === 'teacher' && fee.status !== 'paid' && (
                      <button
                        onClick={() => { if(confirm('Delete this fee record?')) deleteFee(fee.id); }}
                        className="text-xs bg-red-50 text-red-600 font-bold px-3 py-1.5 rounded-lg active:bg-red-100"
                      >
                        Delete
                      </button>
                    )}
              </div>
            </div>

              {/* Payment History */}
              {fee.payments && fee.payments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-50">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Payment History</p>
                  <div className="space-y-2">
                    {fee.payments.map(p => (
                      <div key={p.id} className="bg-slate-50 p-2 rounded-lg">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>{new Date(p.date).toLocaleDateString()} • {p.method.toUpperCase()}</span>
                          <span className="font-bold text-green-600">₹{p.amount.toLocaleString()}</span>
                        </div>
                        {p.note && (
                          <div className="text-[10px] text-slate-500 mt-1">Note: {p.note}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {fee.paidOn && (
                    <p className="text-[10px] text-green-600 mt-1">Fully paid on {new Date(fee.paidOn).toLocaleDateString()}</p>
                  )}
                </div>
              )}
          </div>
            );
            })}
            {filteredFees.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle2 size={48} className="mx-auto mb-2 opacity-50" />
                <p>No invoices</p>
              </div>
            )}
          </>
        )}

        {/* MONTHLY VIEW - Month-wise fee breakdown */}
        {viewMode === 'monthly' && (
          <>
            {feesByMonth.length > 0 ? feesByMonth.map(([monthYear, monthFees]) => {
              const totalAmount = monthFees.reduce((sum, f) => sum + f.amount, 0);
              const paidAmount = monthFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
              const pendingCount = monthFees.filter(f => f.status === 'pending').length;
              const overdueCount = monthFees.filter(f => f.status === 'overdue').length;
              
              return (
                <div key={monthYear} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Month Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold">{monthYear}</h3>
                        <p className="text-sm text-blue-100">{monthFees.length} students</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</div>
                        <div className="text-sm text-blue-100">₹{paidAmount.toLocaleString()} collected</div>
                      </div>
                    </div>
                    {/* Status Summary */}
                    <div className="flex gap-4 mt-3">
                      {pendingCount > 0 && (
                        <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-bold">
                          {pendingCount} pending
                        </span>
                      )}
                      {overdueCount > 0 && (
                        <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold">
                          {overdueCount} overdue
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Student List for this month */}
                  <div className="divide-y divide-slate-100">
                    {monthFees.map(fee => {
                      const dueInfo = getDueDaysText(fee.dueDate);
                      const isPayAfterStudy = fee.feePolicy === 'pay-after-study' && fee.isFirstMonth;
                      const paidSoFar = (fee.payments || []).reduce((sum, p) => sum + p.amount, 0);
                      const remaining = fee.amount - paidSoFar;
                      
                      return (
                        <div key={fee.id} className={`p-3 flex items-center justify-between ${
                          fee.status === 'overdue' ? 'bg-red-50' : 
                          fee.status === 'paid' ? 'bg-green-50' : ''
                        }`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900 truncate">{getStudentName(fee.studentId)}</span>
                              {isPayAfterStudy && (
                                <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                  Pay After Study
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getStatusColor(fee.status)}`}>
                                {fee.status}
                              </span>
                              {fee.status !== 'paid' && (
                                <span className={`text-[10px] ${dueInfo.isOverdue ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                                  {dueInfo.text}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-2">
                            <div className="font-bold text-slate-900">₹{fee.amount.toLocaleString()}</div>
                            {paidSoFar > 0 && remaining > 0 && (
                              <div className="text-[10px] text-orange-600">₹{remaining.toLocaleString()} due</div>
                            )}
                          </div>
                          {currentUser?.role === 'teacher' && fee.status !== 'paid' && (
                            <button
                              onClick={() => updateFeeStatus(fee.id, 'paid')}
                              className="ml-2 text-[10px] bg-blue-600 text-white font-bold px-2 py-1 rounded"
                            >
                              ✓
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-10 text-slate-400">
                <FileText size={48} className="mx-auto mb-2 opacity-50" />
                <p>No monthly fees found</p>
                <p className="text-xs mt-1">Use "Generate Monthly" to create fees for all active students</p>
              </div>
            )}
          </>
        )}

        {/* PENDING PAYMENTS VIEW */}
        {viewMode === 'pending' && (
          <>
            {pendingStudents.map((student) => {
              const studentFees = fees.filter(f => f.studentId === student.id && f.status === 'pending');
              const totalPending = studentFees.reduce((sum, f) => sum + (f.amount - (f.payments?.reduce((s, p) => s + p.amount, 0) || 0)), 0);
              
              return (
                <div key={student.id} className="bg-white border border-yellow-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.class}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">₹{totalPending.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Pending</p>
                    </div>
                  </div>
                  
                  {/* Student Contact */}
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <p className="text-xs font-medium text-slate-600 mb-2">Contact Info</p>
                    {student.phone && (
                      <a 
                        href={`https://wa.me/91${student.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-bold mr-2"
                      >
                        WhatsApp Parent
                      </a>
                    )}
                    {currentUser?.role === 'teacher' && (
                      <button
                        onClick={() => { setSelectedFee(studentFees[0]); setIsPaymentModalOpen(true); }}
                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold active:bg-blue-100"
                      >
                        Log Payment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {pendingStudents.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle2 size={48} className="mx-auto mb-2 opacity-50" />
                <p>All students have paid fees!</p>
              </div>
            )}
          </>
        )}

        {/* OVERDUE PAYMENTS VIEW */}
        {viewMode === 'overdue' && (
          <>
            {overdueStudents.map((student) => {
              const studentFees = fees.filter(f => f.studentId === student.id && f.status === 'pending');
              const totalOverdue = studentFees.reduce((sum, f) => sum + (f.amount - (f.payments?.reduce((s, p) => s + p.amount, 0) || 0)), 0);
              const daysOverdue = Math.ceil((Date.now() - new Date(studentFees[0]?.dueDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={student.id} className="bg-white border-2 border-red-200 rounded-xl p-4 bg-red-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.class}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">₹{totalOverdue.toLocaleString()}</p>
                      <p className="text-xs text-red-600 font-bold">{daysOverdue}+ days overdue</p>
                    </div>
                  </div>
                  
                  {/* Student Contact - Urgent */}
                  <div className="border-t border-red-100 pt-3 mt-3">
                    <p className="text-xs font-bold text-red-700 mb-2">⚠️ Urgent Follow-up Required</p>
                    {student.phone && (
                      <a 
                        href={`https://wa.me/91${student.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold mr-2 hover:bg-green-700"
                      >
                        📱 WhatsApp Now
                      </a>
                    )}
                    {currentUser?.role === 'teacher' && (
                      <button
                        onClick={() => { setSelectedFee(studentFees[0]); setIsPaymentModalOpen(true); }}
                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold active:bg-blue-100"
                      >
                        Log Payment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {overdueStudents.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle2 size={48} className="mx-auto mb-2 opacity-50" />
                <p>No overdue payments</p>
              </div>
            )}
          </>
        )}

        {/* PAYMENT HISTORY VIEW */}
        {viewMode === 'payments' && (
          <>
            {allPayments.map((payment, idx) => {
              const fee = fees.find(f => f.id === payment.feeId);
              const student = students.find(s => s.id === fee?.studentId);
              const methodColors = {
                'cash': 'bg-green-50 text-green-700',
                'online': 'bg-blue-50 text-blue-700',
                'phonepe': 'bg-purple-50 text-purple-700',
                'upi': 'bg-orange-50 text-orange-700',
                'card': 'bg-indigo-50 text-indigo-700',
                'bank': 'bg-cyan-50 text-cyan-700',
                'other': 'bg-slate-50 text-slate-700'
              };
              const methodEmoji = {
                'cash': '💵',
                'online': '🏦',
                'phonepe': '📱',
                'upi': '💳',
                'card': '🎫',
                'bank': '🏪',
                'other': '✓'
              };
              
              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-slate-900">{student?.name}</p>
                      <p className="text-xs text-slate-500">{new Date(payment.date).toLocaleDateString('en-IN', {year: 'numeric', month: 'short', day: 'numeric'})}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">₹{payment.amount.toLocaleString()}</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${methodColors[payment.method as keyof typeof methodColors] || 'bg-slate-50'}`}>
                        {methodEmoji[payment.method as keyof typeof methodEmoji]} {payment.method.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  {payment.note && (
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded">
                      📝 {payment.note}
                    </p>
                  )}
                </div>
              );
            })}
            {allPayments.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <CreditCard size={48} className="mx-auto mb-2 opacity-50" />
                <p>No payments recorded yet</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Fee Modal (Teacher Only) */}
      {isModalOpen && currentUser?.role === 'teacher' && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Create New Invoice</h3>
            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-red-500">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Student Selector */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Select Student</label>
                <select 
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newFee.studentId} 
                  onChange={e => setNewFee({...newFee, studentId: e.target.value})}
                >
                  <option value="">Select a student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
                </select>
              </div>

              {/* Fee Type */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Fee Structure</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newFee.type} 
                  onChange={e => setNewFee({...newFee, type: e.target.value as any})}
                >
                  <option value="monthly">Monthly Fee</option>
                  <option value="one-time">One-time Registration</option>
                  <option value="package">Package / Crash Course</option>
                  <option value="per-class">Per-Class Fee</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Dynamic Fields based on Type */}
              {newFee.type === 'monthly' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Month</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newFee.month}
                        onChange={e => setNewFee({...newFee, month: e.target.value})}
                      >
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Year</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newFee.year}
                        onChange={e => setNewFee({...newFee, year: Number(e.target.value)})}
                      >
                        {[2024, 2025, 2026, 2027].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Fee Policy</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newFee.feePolicy}
                      onChange={e => setNewFee({...newFee, feePolicy: e.target.value as 'advance' | 'pay-after-study'})}
                    >
                      <option value="advance">Advance (Normal - pay before month)</option>
                      <option value="pay-after-study">Pay After Study (First month paid later)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-700">Description / Title</label>
                   <input 
                    type="text" 
                    placeholder="e.g. 10 Physics Sessions"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newFee.description}
                    onChange={e => setNewFee({...newFee, description: e.target.value})}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Amount (₹)</label>
                  <input 
                    required
                    type="number" 
                    placeholder="2000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={newFee.amount || ''} 
                    onChange={e => setNewFee({...newFee, amount: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Due Date</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={newFee.dueDate} 
                    onChange={e => setNewFee({...newFee, dueDate: e.target.value})} 
                  />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && currentUser?.role === 'teacher' && selectedFee && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Record Payment — {students.find(s => s.id === selectedFee.studentId)?.name}</h3>
            <button onClick={() => { setIsPaymentModalOpen(false); setSelectedFee(null); }} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-red-500">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={submitPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Date</label>
                  <input 
                    required
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={paymentDraft.date}
                    onChange={e => setPaymentDraft({ ...paymentDraft, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Amount (₹)</label>
                  <input 
                    required
                    type="number"
                    min={1}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={paymentDraft.amount || ''}
                    onChange={e => setPaymentDraft({ ...paymentDraft, amount: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Method</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={paymentDraft.method}
                  onChange={e => setPaymentDraft({ ...paymentDraft, method: e.target.value as any })}
                >
                  <option value="cash">💵 Cash</option>
                  <option value="phonepe">📱 PhonePe</option>
                  <option value="online">🏦 Online / Bank Transfer</option>
                  <option value="upi">💳 UPI</option>
                  <option value="card">🎫 Card</option>
                  <option value="bank">🏪 Bank</option>
                  <option value="other">✓ Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Note</label>
                <input
                  type="text"
                  placeholder="optional"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={paymentDraft.note}
                  onChange={e => setPaymentDraft({ ...paymentDraft, note: e.target.value })}
                />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-200">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};