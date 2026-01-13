import React, { useMemo, useState } from 'react';
import { useData } from '../services/store';
import { GraduationCap, ShieldCheck, Lock, Mail, UserPlus, KeyRound } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export const Login: React.FC = () => {
  const { students, login } = useData();
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student'>('student');
  const [mode, setMode] = useState<'login' | 'setup' | 'forgot' | 'reset'>('login');
  
  // Teacher State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Check for reset token on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
        setResetToken(token);
        setMode('reset');
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  
  // Student State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [pin, setPin] = useState(''); // Last 4 digits of phone
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error); // Locked out message
        } else {
          setError(data.error || 'Login failed');
        }
      } else {
        // Automatically detect if user is superadmin or teacher
        login({ ...data, role: data.role || 'teacher' });
      }
    } catch (e) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE}/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Super Admin created! You can now login.');
        setMode('login');
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('Setup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      setMessage(data.message);
    } catch (e) {
        setMessage('If the email exists, a link was sent.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: password })
      });
      const data = await res.json();
      if (res.ok) {
          setMessage('Password updated! Please login.');
          setMode('login');
          setPassword('');
      } else {
          setError(data.error);
      }
    } catch (e) {
        setError('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'student' })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error);
        } else {
          setError(data.error || 'Login failed');
        }
      } else {
        login(data);
      }
    } catch (e) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
             <GraduationCap className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to TutorMate</h1>
          <p className="text-slate-500 mt-2">Secure Learning Platform</p>
        </div>

        {mode === 'login' && (
           <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => { setSelectedRole('teacher'); setError(''); }}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                selectedRole === 'teacher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShieldCheck size={16} /> Teacher
            </button>
            <button
              onClick={() => { setSelectedRole('student'); setError(''); }}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                selectedRole === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap size={16} /> Student
            </button>
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center font-medium animate-in fade-in">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 text-center font-medium animate-in fade-in">{message}</div>}

        {/* AUTH FORMS */}
        {mode === 'reset' ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <h3 className="text-lg font-bold text-center text-slate-800">Set New Password</h3>
            <p className="text-sm text-slate-500 text-center mb-4">Create a new secure password.</p>
            <input type="password" required placeholder="New Password" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
              value={password} onChange={e => setPassword(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('login')} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold">Cancel</button>
              <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700">{isLoading ? 'Update Password' : 'Update'}</button>
            </div>
          </form>
        ) : mode === 'login' ? (
          selectedRole === 'teacher' ? (
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                 <div className="relative">
                   <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                   <input type="email" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                     placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                 </div>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                 <div className="relative">
                   <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                   <input type="password" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                     placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                 </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <button type="button" onClick={() => setMode('forgot')} className="text-blue-600 hover:underline">Forgot password?</button>
                {false && <button type="button" onClick={() => setMode('setup')} className="text-slate-500 hover:text-slate-700">First time setup?</button>} 
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-70">
                {isLoading ? 'Verifying...' : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleStudentLogin} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      <input type="email" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="student@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="animate-in slide-in-from-top duration-200">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                      <div className="relative">
                          <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} 
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="••••••••" />
                      </div>
                </div>
                
                <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-70 mt-4">
                  {isLoading ? 'Verifying...' : 'Enter Class'}
                </button>
            </form>
          )
        ) : mode === 'setup' ? (
          <form onSubmit={handleSetup} className="space-y-4">
            <h3 className="text-lg font-bold text-center text-slate-800">Create Super Admin</h3>
            <input type="text" required placeholder="Full Name" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
              value={name} onChange={e => setName(e.target.value)} />
            <input type="email" required placeholder="Email Address" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
              value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" required placeholder="Create Password" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
              value={password} onChange={e => setPassword(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('login')} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold">Cancel</button>
              <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700">{isLoading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        ) : mode === 'forgot' ? (
          <form onSubmit={handleForgot} className="space-y-4">
            <h3 className="text-lg font-bold text-center text-slate-800">Reset Password</h3>
            <p className="text-sm text-slate-500 text-center mb-4">Enter your email to receive recovery instructions.</p>
            <input type="email" required placeholder="Email Address" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
              value={email} onChange={e => setEmail(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('login')} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold">Back</button>
              <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700">{isLoading ? 'Sending...' : 'Send Link'}</button>
            </div>
          </form>
        ) : null}
      </div>
      <p className="mt-8 text-xs text-slate-400">© 2024 TutorMate Academy</p>
    </div>
  );
};
