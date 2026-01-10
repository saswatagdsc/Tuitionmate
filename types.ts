export interface Student {
  id: string;
  name: string;
  rollNo: string;
  class: string;
  parentName: string;
  phone: string;
  email?: string;
  batchIds: string[]; // Linked batches
  teacherId?: string;
  archived?: boolean;
  // Fee configuration
  monthlyFee?: number; // Agreed monthly fee amount
  feePolicy?: 'advance' | 'pay-after-study'; // Payment policy
  joinDate?: string; // Date student joined (for mid-month calculations)
  isActive?: boolean; // Whether student is currently active
}

export interface BatchSlot {
  id: string;
  day: string;
  time: string;
  duration: number; // in minutes
}

export interface Batch {
  id: string;
  name: string;
  subject: string;
  days: string[]; // e.g., ["Mon", "Wed"]
  time: string;
  sessionDurationMinutes?: number; // Duration of each class session in minutes
  teacherId?: string;
  // Optional schedule management properties
  slots?: BatchSlot[];
  color?: string;
  schedule?: string; // Display string like "Mon, Wed 5:00 PM"
}

export interface AttendanceRecord {
  id?: string;
  batchId: string;
  teacherId?: string;
  date: string;
  records: { studentId: string; status: 'present' | 'absent' | 'late' }[];
}

export interface Payment {
  id: string;
  feeId: string;
  amount: number;
  date: string;
  method: 'cash' | 'online' | 'phonepe' | 'upi' | 'card' | 'bank' | 'other';
  note?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  teacherId?: string;
  title?: string; // e.g. "January Monthly Fee"
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidOn?: string;
  payments?: Payment[]; // Augmented by store
  // Extended fields used by UI
  type?: 'monthly' | 'one-time' | 'package' | 'per-class' | 'custom';
  month?: string; // Month name e.g. "January"
  year?: number; // Year e.g. 2025
  description?: string;
  // Indian tuition specific
  feePolicy?: 'advance' | 'pay-after-study'; // How this fee should be paid
  isFirstMonth?: boolean; // Whether this is the student's first month (for pay-after-study)
  createdAt?: string; // When the fee record was created
}

export interface ExamResult {
  id: string;
  studentId: string;
  teacherId?: string;
  subject: string;
  marks: number;
  totalMarks: number;
  examName: string;
  date: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  teacherId?: string;
  audience?: 'all' | 'students' | 'parents' | 'teachers';
  batchId?: string; // Optional: target specific batch, or 'all' for everyone
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  teacherId?: string;
  batchId?: string; // For group chat per batch
  receiverId?: string; // For direct messages
  text: string;
  content?: string; // Alias for text
  timestamp: string;
  read?: boolean;
  role?: 'teacher' | 'student'; // Sender role
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'student' | 'teacher' | 'superadmin';
  email?: string;
  studentId?: string; // If role is student
  teacherId?: string; // If role is student
  batchId?: string; // Primary batch for student
}

// --- NEW MODULES ---

// CRM & Growth Engine
export interface Enquiry {
  id: string;
  teacherId?: string;
  studentName: string;
  parentName: string;
  phone: string;
  class: string;
  status: 'new' | 'contacted' | 'demo_scheduled' | 'converted' | 'lost';
  notes: string[];
  date: string;
  followUpDate?: string;
  source?: string; // e.g., "referral", "ad"
}

// Financial Health
export interface Expense {
  id: string;
  teacherId?: string;
  title: string;
  amount: number;
  category: 'rent' | 'salary' | 'utilities' | 'marketing' | 'maintenance' | 'other';
  date: string;
  receiptUrl?: string;
  notes?: string;
}

// LMS Lite
export interface StudyMaterial {
  id: string;
  teacherId?: string;
  title: string;
  subject: string;
  class: string;
  type: 'pdf' | 'video' | 'link' | 'image';
  url: string; 
  uploadDate: string;
}

// Smart Attendance (Holidays)
export interface Holiday {
  id: string;
  teacherId?: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'public' | 'institute';
}

// Professional Branding & Settings
export interface InstituteSettings {
  teacherId?: string;
  name: string;
  logo: string;
  address: string;
  website?: string;
  primaryColor: string;
  accentColor: string;
  academicYear: string;
  appLockPin?: string;
}

// Context
export interface DataContextType {
  students: Student[];
  batches: Batch[];
  attendance: AttendanceRecord[];
  fees: FeeRecord[];
  exams: ExamResult[];
  messages: ChatMessage[];
  notices: Notice[];
  currentUser: User | null;
  
  // New State
  enquiries: Enquiry[];
  expenses: Expense[];
  studyMaterials: StudyMaterial[];
  holidays: Holiday[];
  settings: InstituteSettings;

  // Actions
  addStudent: (s: Student) => Promise<void>;
  updateStudent?: (id: string, s: Partial<Student>) => Promise<void>;
  addBatch: (b: Batch) => Promise<void>;
  updateBatch: (id: string, b: Partial<Batch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  markAttendance: (r: AttendanceRecord) => Promise<void>;
  addFee: (f: FeeRecord) => Promise<void>;
  addPayment: (p: Payment) => Promise<void>;
  updateFeeStatus: (id: string, status: FeeRecord['status']) => Promise<void>;
  addExamResult: (e: ExamResult) => Promise<void>;
  addNotice: (n: Notice) => Promise<void>;
  
  // New Actions
  addEnquiry: (e: Enquiry) => Promise<void>;
  updateEnquiryStatus: (id: string, status: Enquiry['status']) => Promise<void>;
  addExpense: (e: Expense) => Promise<void>;
  addStudyMaterial: (m: StudyMaterial) => Promise<void>;
  addHoliday: (h: Holiday) => Promise<void>;
  updateSettings: (s: Partial<InstituteSettings>) => Promise<void>;
  deleteFee: (id: string) => Promise<void>;
  
  deleteStudent: (id: string) => Promise<void>;
  archiveStudent: (id: string, archived: boolean) => Promise<void>;
  deleteExamResult: (id: string) => Promise<void>;

  login: (user: User) => void;
  logout: () => void;
  sendMessage: (batchId: string, text: string) => Promise<void>;
  generateMonthlyFees: (month: string, year: number) => Promise<any>;
}
