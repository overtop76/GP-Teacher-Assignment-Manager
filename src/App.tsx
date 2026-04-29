/**
 * Layout and standard UI components structure
 */
import { AppProvider } from '@/lib/store';
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings, UserCheck, BarChart3, Search, Bell, LogOut, KeyRound, Building2, Users, GraduationCap } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import Setup from '@/components/Setup';
import Assignments from '@/components/Assignments';
import Reports from '@/components/Reports';
import UsersManagement from '@/components/UsersManagement';
import TeacherManagement from '@/components/TeacherManagement';
import { useAppStore } from '@/lib/store';
import { AuthProvider, useAuthStore } from '@/lib/authStore';

function Login() {
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(username, password)) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100 flex flex-col">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <KeyRound className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 text-center tracking-tight mb-2">EduDash Sign In</h1>
        <p className="text-sm text-slate-500 text-center mb-8">Sign in to manage the school directory.</p>
        
        {error && <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-lg mb-6 text-center border border-rose-100">{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              placeholder="Enter password"
            />
          </div>
          <button type="submit" className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors shadow-sm shadow-indigo-200">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const { data } = useAppStore();
  const { currentUser, logout, systemData, activeSchoolId, setActiveSchoolId } = useAuthStore();
  
  let subjectCount = 0;
  if (data?.gradeLevels) {
    Object.values(data.gradeLevels).forEach((g: any) => {
      Object.values(g.classes || {}).forEach((c: any) => {
        subjectCount += Object.keys(c.subjects || {}).length;
      });
    });
  }

  const availableSchools = systemData.schools.filter(s => 
     currentUser?.permissions.isAdmin || currentUser?.assignedSchools.includes('ALL') || currentUser?.assignedSchools.includes(s.id)
  );
  
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, show: true },
    { id: 'setup', label: 'School Setup', icon: <Settings className="w-5 h-5" />, show: currentUser?.permissions.isAdmin || false },
    { id: 'users', label: 'User Management', icon: <Users className="w-5 h-5" />, show: currentUser?.permissions.isAdmin || false },
    { id: 'teachers', label: 'Teacher Management', icon: <GraduationCap className="w-5 h-5" />, show: true },
    { id: 'assignments', label: 'Teacher Assignments', icon: <UserCheck className="w-5 h-5" />, badge: subjectCount, show: true },
    { id: 'reports', label: 'Analytics & Reports', icon: <BarChart3 className="w-5 h-5" />, show: true },
  ];

  const canSwitchSchools = currentUser?.permissions.isAdmin || currentUser?.assignedSchools?.includes('ALL');

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-inner flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-xl text-white">E</span>
        </div>
        <div className="flex flex-col">
          <span className="text-white font-semibold text-sm leading-none truncate w-40" title={data?.schoolName || 'EduDash'}>{data?.schoolName || 'EduDash'}</span>
          <span className="text-[10px] text-slate-500 tracking-wider uppercase mt-1">Multi-Tenant</span>
        </div>
      </div>
      
      {availableSchools.length > 0 && (
         <div className="px-4 pt-4 border-b border-slate-800 pb-4">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block px-1">Active School</label>
            <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                   value={activeSchoolId || ''} 
                   onChange={(e) => setActiveSchoolId(e.target.value)}
                   disabled={!canSwitchSchools}
                   className={`w-full bg-slate-800 border-none text-slate-300 text-sm py-2 pl-9 pr-4 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors appearance-none outline-none ${!canSwitchSchools ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                   {!activeSchoolId && <option value="" disabled>Select a school...</option>}
                   {availableSchools.map(s => (
                       <option key={s.id} value={s.id}>{s.name || 'Unnamed School'}</option>
                   ))}
                </select>
                {canSwitchSchools && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                )}
            </div>
         </div>
      )}

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-500 uppercase px-3 py-2 tracking-widest">Main Menu</div>
        {tabs.filter(t => t.show).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                isActive 
                  ? 'bg-indigo-600/10 text-indigo-400 font-medium' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-auto bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-800 space-y-4">
        <button onClick={logout} className="w-full flex items-center gap-2 justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
        <div className="bg-indigo-900/30 rounded-xl p-4">
          <p className="text-xs text-indigo-300 font-medium">System Status</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
             <div className="bg-indigo-500 h-full w-full"></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 italic">EduDash v4.0 (Multi)</p>
        </div>
      </div>
    </aside>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { currentUser, activeSchoolId } = useAuthStore();

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-4 bg-slate-100 px-3 py-1.5 rounded-lg">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search..." className="bg-transparent border-none text-sm focus:ring-0 w-64 placeholder-slate-400 outline-none" />
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 border-2 border-white rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">{currentUser?.username}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">{currentUser?.permissions.isAdmin ? 'Full Administrator' : 'Staff Member'}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border-2 border-indigo-50 flex items-center justify-center text-white font-bold bg-indigo-500 text-sm shadow-sm">
                 {currentUser?.username.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          {!activeSchoolId && activeTab !== 'setup' && activeTab !== 'users' ? (
             <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-8 h-8 text-slate-400" />
                   </div>
                   <h2 className="text-xl font-bold text-slate-700">No School Selected</h2>
                   <p className="text-slate-500 mt-2 text-sm">Please select a school from the sidebar or go to Setup to create one.</p>
                </div>
             </div>
          ) : (
             <div className="max-w-6xl mx-auto flex flex-col gap-6">
               {activeTab === 'dashboard' && <Dashboard />}
               {activeTab === 'setup' && <Setup />}
               {activeTab === 'users' && <UsersManagement />}
               {activeTab === 'teachers' && <TeacherManagement />}
               {activeTab === 'assignments' && <Assignments />}
               {activeTab === 'reports' && <Reports />}
             </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AppWrapper() {
  const { currentUser } = useAuthStore();
  
  if (!currentUser) return <Login />;

  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
  );
}

