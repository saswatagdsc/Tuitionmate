import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Student, Batch, AttendanceRecord, FeeRecord, ExamResult, DataContextType, User, 
  ChatMessage, Notice, Payment, Enquiry, Expense, StudyMaterial, Holiday, InstituteSettings 
} from '../types';

// Detect if running in app vs web
const getAPIBase = () => {
  // FORCE PRODUCTION URL as requested
  return 'https://api.mondalsirmaths.in/api';
};

const API_BASE = getAPIBase();
console.log('API_BASE configured as:', API_BASE);

// Helper: Calculate dynamic fee status based on current date
const calculateFeeStatus = (fee: FeeRecord): FeeRecord['status'] => {
  if (fee.status === 'paid') return 'paid';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(fee.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  // Calculate total paid from payments
  const totalPaid = (fee.payments || []).reduce((sum, p) => sum + p.amount, 0);
  if (totalPaid >= fee.amount) return 'paid';
  
  // If unpaid and past due date, it's overdue
  if (today > dueDate) return 'overdue';
  
  return 'pending';
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]); // Notices might be public? Keep protected for now.
  
  // New State
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [settings, setSettings] = useState<InstituteSettings>({
    name: "TutorMate Institute",
    logo: "",
    address: "",
    primaryColor: "#3b82f6",
    accentColor: "#10b981",
    academicYear: "2024-2025"
  });

  // Load Public Data (Settings) on Mount - Now requires teacherId for teacher-specific settings
  useEffect(() => {
    const fetchPublic = async () => {
      try {
        // Settings are now teacher-specific; skip public fetch, wait for login
        // Only fetch global defaults if no user is logged in
        if (!currentUser) {
          // Use default settings for login screen
          return;
        }
        // For students, use their teacher's ID to fetch settings
        let settingsTeacherId = currentUser.id;
        if (currentUser.role === 'student' && currentUser.teacherId) {
          settingsTeacherId = currentUser.teacherId;
        }
        const query = currentUser.role === 'superadmin' ? '' : `?teacherId=${settingsTeacherId}`;
        const setRes = await fetch(`${API_BASE}/settings${query}`);
        if (setRes.ok) setSettings(await setRes.json());
      } catch (e) { console.error("Failed to fetch settings", e); }
    };
    fetchPublic();
  }, [currentUser]);

  // Load Protected Data only when User is logged in
  useEffect(() => {
    if (!currentUser) {
      // Clear sensitive data on logout
      setStudents([]); // Clear students on logout
      setBatches([]);
      setAttendance([]);
      setFees([]);
      setExams([]);
      setMessages([]);
      setNotices([]);
      setEnquiries([]);
      setExpenses([]);
      setStudyMaterials([]);
      setHolidays([]);
      return;
    }

    const fetchProtected = async () => {
      try {
        // Strict Isolation: Only Super Admin sees global data. Everyone else (Teacher/Student) is scoped.
        // If role matches 'superadmin', no filter. Otherwise, filter by user ID (assumed to be teacherId).
        const isSuperAdmin = currentUser.role === 'superadmin';

        // Determine the Teacher ID to fetch data for
        // Teachers see their own data. Students see data from their assigned teacher.
        let queryId = currentUser.id;
        if (currentUser.role === 'student' && currentUser.teacherId) {
          queryId = currentUser.teacherId;
        } else if (currentUser.role === 'student' && !currentUser.teacherId) {
          console.warn("Student user missing teacherId link. Data fetch may be empty.");
        }

        // Build query string for non-superadmin users
        let query = '';
        if (!isSuperAdmin) {
          query = `?teacherId=${queryId}`;
        }

        let noticesUrl = `${API_BASE}/notices${query}`;
        if (currentUser.role === 'student') {
          // Pass batchId and role for student filtering
          const batchId = currentUser.batchId || '';
          noticesUrl = `${API_BASE}/notices?teacherId=${queryId}&batchId=${batchId}&role=student`;
        }

        const [
          sRes,
          bRes, aRes, fRes, eRes, mRes, nRes,
          enqRes, expRes, matRes, holRes
        ] = await Promise.all([
          fetch(`${API_BASE}/students${query}`),
          fetch(`${API_BASE}/batches${query}`),
          fetch(`${API_BASE}/attendance${query}`),
          fetch(`${API_BASE}/fees${query}`),
          fetch(`${API_BASE}/exams${query}`),
          fetch(`${API_BASE}/messages${query}`),
          fetch(noticesUrl),
          fetch(`${API_BASE}/enquiries${query}`),
          fetch(`${API_BASE}/expenses${query}`),
          fetch(`${API_BASE}/materials${query}`),
          fetch(`${API_BASE}/holidays${query}`),
        ]);

        if (sRes.ok) setStudents(await sRes.json());
        if (bRes.ok) setBatches(await bRes.json());
        if (aRes.ok) setAttendance(await aRes.json());
        if (fRes.ok) {
          const loadedFees: FeeRecord[] = await fRes.json();
          const feesWithDynamicStatus = loadedFees.map(f => ({
            ...f,
            status: calculateFeeStatus(f)
          }));
          setFees(feesWithDynamicStatus);
        }
        if (eRes.ok) setExams(await eRes.json());
        if (mRes.ok) setMessages(await mRes.json());
        if (nRes.ok) setNotices(await nRes.json());

        if (enqRes.ok) setEnquiries(await enqRes.json());
        if (expRes.ok) setExpenses(await expRes.json());
        if (matRes.ok) setStudyMaterials(await matRes.json());
        if (holRes.ok) setHolidays(await holRes.json());

      } catch (error) {
        console.error("Failed to fetch protected data", error);
      }
    };
    fetchProtected();
  }, [currentUser]); // Re-run when user logs in/out

  const createNextMonthlyFee = async (previous: FeeRecord) => {
    if (previous.type !== 'monthly') return;
    if (!previous.month || !previous.dueDate) return;

    const monthNames = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const currentIndex = monthNames.indexOf(previous.month);
    const nextIndex = currentIndex === -1 ? -1 : (currentIndex + 1) % 12;
    if (nextIndex === -1) return;

    const currentDue = new Date(previous.dueDate);
    if (isNaN(currentDue.getTime())) return;
    const nextDue = new Date(currentDue);
    nextDue.setMonth(nextDue.getMonth() + 1);
    const nextDueStr = nextDue.toISOString().split('T')[0];
    
    // Determine year for the next month
    const nextYear = nextIndex === 0 ? (previous.year || new Date().getFullYear()) + 1 : (previous.year || new Date().getFullYear());

    const nextFee: FeeRecord = {
      id: `f${Date.now()}`,
      studentId: previous.studentId,
      amount: previous.amount,
      dueDate: nextDueStr,
      status: 'pending',
      type: 'monthly',
      month: monthNames[nextIndex],
      year: nextYear,
      title: `${monthNames[nextIndex]} ${nextYear} Monthly Fee`,
      feePolicy: previous.feePolicy || 'advance',
      createdAt: new Date().toISOString()
    };

    await addFee(nextFee);
  };

  const addStudent = async (s: Student) => {
    try {
      const payload = {
          ...s,
          teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined // Attach teacher ID
      };
      const res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newStudent = await res.json();
        setStudents(prev => [...prev, newStudent]);
      } else {
         const err = await res.json();
         alert('Error adding student: ' + err.error);
      }
    } catch (e) {
         console.error(e);
         alert('Failed to connect to server');
    }
  };

  const updateStudent = async (id: string, s: Partial<Student>) => {
    try {
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      });
      if (res.ok) {
        const updated = await res.json();
        setStudents(prev => prev.map(stu => stu.id === id ? updated : stu));
      }
    } catch (e) { console.error(e); }
  };

  const deleteStudent = async (id: string) => {
    try {
      await fetch(`${API_BASE}/students/${id}`, { method: 'DELETE' });
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error(e); }
  };

  const archiveStudent = async (id: string, archived: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived })
      });
      if (res.ok) {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, archived } : s));
      }
    } catch (e) { console.error(e); }
  };

  const addBatch = async (b: Batch) => {
    try {
      const payload = { ...b, teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined };
      const res = await fetch(`${API_BASE}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newBatch = await res.json();
        setBatches(prev => [...prev, newBatch]);
      }
    } catch (e) { console.error(e); }
  };

  const updateBatch = async (id: string, b: Partial<Batch>) => {
    try {
      const res = await fetch(`${API_BASE}/batches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b)
      });
      if (res.ok) {
        const updated = await res.json();
        setBatches(prev => prev.map(batch => batch.id === id ? updated : batch));
      }
    } catch (e) { console.error(e); }
  };

  const deleteBatch = async (id: string) => {
    try {
      const url = `${API_BASE}/batches/${id}`;
      console.log('Attempting DELETE request to:', url);
      
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Delete response status:', res.status, res.statusText);
      const data = await res.json();
      console.log('Delete response data:', data);
      
      if (res.ok) {
        console.log('Batch deleted from DB, updating state for ID:', id);
        setBatches(prev => {
          const filtered = prev.filter(batch => batch.id !== id);
          console.log('Batches after deletion:', filtered);
          return filtered;
        });
        return true;
      } else {
        console.error('Delete failed:', res.status, data.error);
        return false;
      }
    } catch (e) { 
      console.error('Delete batch error:', e);
      return false;
    }
  };

  const markAttendance = async (record: AttendanceRecord) => {
    try {
      const payload = { ...record, teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined };
      const res = await fetch(`${API_BASE}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setAttendance(prev => {
           const filtered = prev.filter(r => !(r.batchId === record.batchId && r.date === record.date));
           return [...filtered, saved];
        });
      }
    } catch (e) { console.error(e); }
  };

  const addFee = async (f: FeeRecord) => {
    try {
      const payload = { ...f, teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined };
      const res = await fetch(`${API_BASE}/fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newFee = await res.json();
        setFees(prev => [...prev, newFee]);
      }
    } catch (e) { console.error(e); }
  };

  const addPayment = async (p: Payment) => {
    try {
      const res = await fetch(`${API_BASE}/fees/${p.feeId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      if (res.ok) {
        const { payment, fee } = await res.json();
        const prevFee = fees.find(f => f.id === fee.id);
        setFees(prev => prev.map(f => f.id === fee.id ? { 
            ...f, 
            status: fee.status, 
            paidOn: fee.paidOn,
            payments: [...(f.payments || []), payment] 
        } : f));

        if (prevFee && prevFee.status !== 'paid' && fee.status === 'paid') {
          await createNextMonthlyFee({ ...prevFee, status: fee.status, paidOn: fee.paidOn });
        }
      }
    } catch (e) { console.error(e); }
  };

  const updateFeeStatus = async (id: string, status: FeeRecord['status']) => {
    try {
      const prevFee = fees.find(f => f.id === id);
      const res = await fetch(`${API_BASE}/fees/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setFees(prev => prev.map(f => f.id === id ? updated : f));

        if (prevFee && prevFee.status !== 'paid' && updated.status === 'paid') {
          await createNextMonthlyFee(updated);
        }
      }
    } catch (e) { console.error(e); }
  };

  const deleteFee = async (id: string) => {
    try {
      // Never delete paid fees
      const target = fees.find(f => f.id === id);
      if (target && target.status === 'paid') {
        console.warn('Attempted to delete a paid fee; operation blocked.');
        return;
      }

      const res = await fetch(`${API_BASE}/fees/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setFees(prev => prev.filter(f => f.id !== id));
      }
    } catch (e) { console.error(e); }
  };

  const addExamResult = async (e: ExamResult) => {
    try {
      const payload = { ...e, teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined };
      const res = await fetch(`${API_BASE}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newExam = await res.json();
        setExams(prev => [...prev, newExam]);
      }
    } catch (e) { console.error(e); }
  };
  const deleteExamResult = async (id: string) => {
    try {
      await fetch(`${API_BASE}/exams/${id}`, { method: 'DELETE' });
      setExams(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error(e); }
  };
  const deleteNotice = async (id: string) => {
    try {
      await fetch(`${API_BASE}/notices/${id}`, { method: 'DELETE' });
      setNotices(prev => prev.filter(n => n.id !== id));
    } catch (e) { console.error(e); }
  };
  const deleteStudyMaterial = async (id: string) => {
    try {
      await fetch(`${API_BASE}/materials/${id}`, { method: 'DELETE' });
      setStudyMaterials(prev => prev.filter(m => m.id !== id));
    } catch (e) { console.error(e); }
  };
  const addNotice = async (n: Notice) => {
    try {
      const payload = { ...n, teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined };
      const res = await fetch(`${API_BASE}/notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newNotice = await res.json();
        setNotices(prev => [...prev, newNotice]);
      }
    } catch (e) { console.error(e); }
  };

  // --- NEW ACTIONS ---

  const addEnquiry = async (e: Enquiry) => {
    try {
      const payload = { ...e, teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined };
      const res = await fetch(`${API_BASE}/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newEnquiry = await res.json();
        setEnquiries(prev => [...prev, newEnquiry]);
      }
    } catch (e) { console.error(e); }
  };

  const updateEnquiryStatus = async (id: string, status: Enquiry['status']) => {
    try {
      const res = await fetch(`${API_BASE}/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setEnquiries(prev => prev.map(e => e.id === id ? updated : e));
      }
    } catch (e) { console.error(e); }
  };

  const addExpense = async (e: Expense) => {
    try {
      const payload = { ...e, teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined };
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newExpense = await res.json();
        setExpenses(prev => [...prev, newExpense]);
      }
    } catch (e) { console.error(e); }
  };

  const addStudyMaterial = async (m: StudyMaterial) => {
    try {
      const payload = { ...m, teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined };
      const res = await fetch(`${API_BASE}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newMaterial = await res.json();
        setStudyMaterials(prev => [...prev, newMaterial]);
      }
    } catch (e) { console.error(e); }
  };

  const addHoliday = async (h: Holiday) => {
    try {
      const payload = { ...h, teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined };
      const res = await fetch(`${API_BASE}/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newHoliday = await res.json();
        setHolidays(prev => [...prev, newHoliday]);
      }
    } catch (e) { console.error(e); }
  };

  const updateSettings = async (s: Partial<InstituteSettings>) => {
    try {
      const payload = { ...s, teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined };
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) setSettings(await res.json());
    } catch (e) { console.error(e); }
  };

  const login = (user: User) => {
    setCurrentUser(user);
    // Simple persistence for web refresh
    localStorage.setItem('currentUser', JSON.stringify(user));
  };
  
  useEffect(() => {
    // Listen for superadmin-logout event
    const handler = () => logout();
    window.addEventListener('superadmin-logout', handler);
    return () => window.removeEventListener('superadmin-logout', handler);
  }, []);
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const sendMessage = async (batchId: string, text: string) => {
    if (!currentUser) return;
    const teacherId = currentUser.role === 'teacher' ? currentUser.id : (currentUser as any).teacherId;
    const msg: ChatMessage = {
      id: `msg${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      teacherId, // Include teacherId
      batchId,
      text,
      timestamp: new Date().toISOString(),
      role: currentUser.role === 'teacher' ? 'teacher' : 'student',
      read: false
    };
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      if (res.ok) {
        const saved = await res.json();
        setMessages(prev => [...prev, saved]);
      } else {
        // Fallback to local state if API fails
        setMessages(prev => [...prev, msg]);
      }
    } catch (e) {
      // Fallback to local state if API fails
      setMessages(prev => [...prev, msg]);
    }
  };

  // Generate monthly fees for all active students for a given month/year
  const generateMonthlyFees = async (month: string, year: number) => {
    try {
      const teacherId = currentUser?.role === 'teacher' ? currentUser.id : undefined;
      const res = await fetch(`${API_BASE}/fees/generate-monthly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, teacherId })
      });
      if (res.ok) {
        const result = await res.json();
        // Add newly created fees to state with dynamic status
        const newFeesWithStatus = result.fees.map((f: FeeRecord) => ({
          ...f,
          status: calculateFeeStatus(f)
        }));
        setFees(prev => [...prev, ...newFeesWithStatus]);
        return result;
      }
    } catch (e) { 
      console.error('Failed to generate monthly fees:', e);
      throw e;
    }
  };

  return (
    <DataContext.Provider value={{
      students, batches, attendance, fees, exams, notices, messages, currentUser,
      enquiries, expenses, studyMaterials, holidays, settings,
      login, logout, addStudent, updateStudent, addBatch, updateBatch, deleteBatch, markAttendance, addFee, addPayment, updateFeeStatus, 
      addExamResult, addNotice, addEnquiry, updateEnquiryStatus, addExpense, 
      addStudyMaterial, addHoliday, updateSettings, deleteFee,
      deleteStudent, archiveStudent, deleteExamResult, sendMessage, generateMonthlyFees,
      deleteNotice, deleteStudyMaterial
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};
