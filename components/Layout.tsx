import React, { useState } from 'react';
import { View } from '../App';
import { useData } from '../services/store';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  IndianRupee, 
  GraduationCap, 
  Sparkles,
  LogOut,
  MessageCircle,
  Bell,
  CalendarDays,
  UserPlus,
  BookOpen,
  PieChart,
  Settings,
  Menu as MenuIcon,
  ArrowLeft
} from 'lucide-react';
import { Menu } from './Menu';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange }) => {
  const { currentUser, logout } = useData();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Navigation Items Logic
  const teacherNav = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={24} /> },
    { id: 'attendance', label: 'Attend', icon: <CalendarCheck size={24} /> },
    { id: 'students', label: 'Students', icon: <Users size={24} /> },
    { id: 'fees', label: 'Fees', icon: <IndianRupee size={24} /> },
    { id: 'notices', label: 'Notices', icon: <Bell size={24} /> },
    { id: 'materials', label: 'LMS', icon: <BookOpen size={24} /> },
    { id: 'expenses', label: 'Finance', icon: <PieChart size={24} /> },
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={24} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={24} /> },
  ];

  const studentNav = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={24} /> },
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={24} /> },
    { id: 'notices', label: 'Notices', icon: <Bell size={24} /> },
    { id: 'fees', label: 'Fees', icon: <IndianRupee size={24} /> },
    { id: 'academics', label: 'Results', icon: <GraduationCap size={24} /> },
  ];

  const navItems: any[] = currentUser?.role === 'student' ? studentNav : teacherNav;

  const getTitle = () => {
    switch(currentView) {
      case 'dashboard': return currentUser?.role === 'student' ? 'My Portal' : 'TutorMate';
      case 'students': return 'My Students';
      case 'attendance': return 'Attendance';
      case 'fees': return 'Payments';
      case 'academics': return 'Academics';
      case 'ai-tools': return 'AI Assistant';
      case 'chat': return 'Class Group';
      case 'notices': return 'Notice Board';
      case 'schedule': return 'Batch Schedule';
      case 'crm': return 'Growth Engine';
      case 'expenses': return 'Financial Health';
      case 'materials': return 'Study Materials';
      case 'settings': return 'Institute Settings';
      default: return 'TutorMate';
    }
  };

  const canGoBack = currentView !== 'dashboard';

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      
      {/* Fixed Top Bar (AppBar) */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 h-16 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {canGoBack && (
            <button
              onClick={() => onViewChange('dashboard')}
              className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100"
              aria-label="Back"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{getTitle()}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {currentUser?.role === 'teacher' && (
            <button 
              onClick={() => onViewChange('ai-tools')}
              className={`p-2 rounded-full transition-colors ${currentView === 'ai-tools' ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Sparkles size={24} className={currentView === 'ai-tools' ? 'fill-purple-600' : ''} />
            </button>
          )}
          <button 
            onClick={logout}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut size={24} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-16 pb-24 overscroll-contain">
        <div className="p-4 min-h-full">
          {children}
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 h-16 flex items-center justify-around pb-safe">
        {navItems.slice(0, 4).map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="flex flex-col items-center justify-center min-w-[60px] w-full h-full space-y-1"
            >
              <div className={`transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        {/* Menu Icon */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex flex-col items-center justify-center min-w-[60px] w-full h-full space-y-1"
        >
          <div className="transition-colors duration-200 text-slate-400">
            <MenuIcon size={24} />
          </div>
          <span className="text-[10px] font-medium text-slate-400">
            More
          </span>
        </button>
      </nav>

      {/* Full-Screen Menu */}
      {isMenuOpen && (
        <Menu 
          onClose={() => setIsMenuOpen(false)} 
          onNavigate={onViewChange}
          currentView={currentView}
        />
      )}
    </div>
  );
};