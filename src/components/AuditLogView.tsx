import React, { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/lib/authStore';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Download, Calendar, Search, Bell } from 'lucide-react';
import { AuditLog } from '@/lib/types';

export default function AuditLogView() {
  const { systemData, currentUser, activeSchoolId } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyLogs, setDailyLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // By default, recent logs are from systemData (which holds the last 200).
  // But if a user selects a date, we fetch it from Firestore.
  useEffect(() => {
    let unmounted = false;
    const fetchLogs = async () => {
       setLoading(true);
       try {
           const docRef = doc(db, 'auditLogs', selectedDate);
           const snap = await getDoc(docRef);
           if (!unmounted) {
              if (snap.exists()) {
                  const data = snap.data();
                  setDailyLogs(data.logs || []);
              } else {
                  // Fallback to in-memory if today and not yet synced to DB fully
                  if (selectedDate === new Date().toISOString().slice(0, 10)) {
                      const todayLogs = (systemData.auditLogs || []).filter(l => l.timestamp.startsWith(selectedDate));
                      setDailyLogs(todayLogs);
                  } else {
                      setDailyLogs([]);
                  }
              }
           }
       } catch (e) {
           console.error("Error fetching audit logs", e);
       } finally {
           if (!unmounted) setLoading(false);
       }
    };
    fetchLogs();
    
    return () => {
        unmounted = true;
    };
  }, [selectedDate, systemData.auditLogs]);

  const filteredLogs = useMemo(() => {
     let logs = dailyLogs;
     
     // Filter by active school
     if (activeSchoolId) {
         logs = logs.filter(l => !l.schoolId || l.schoolId === activeSchoolId);
     }
     
     if (search) {
         const s = search.toLowerCase();
         logs = logs.filter(l => 
            l.username.toLowerCase().includes(s) || 
            l.action.toLowerCase().includes(s) || 
            l.details.toLowerCase().includes(s)
         );
     }
     
     // Sort by timestamp descending
     return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [dailyLogs, search, activeSchoolId]);

  const handleExport = () => {
    if (filteredLogs.length === 0) return;
    const exportData = filteredLogs.map(l => ({
      'Date & Time': new Date(l.timestamp).toLocaleString(),
      'User': l.username,
      'User ID': l.userId,
      'Action': l.action,
      'Details': l.details
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
    XLSX.writeFile(wb, `Audit_Logs_${selectedDate}.xlsx`);
  };

  if (!currentUser?.permissions.isAdmin) {
      return (
         <div className="p-8 text-center text-slate-500">
             You do not have permission to view the audit log.
         </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">System Audit Log</h2>
            <p className="text-sm text-slate-500">Review system activity across all users.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                   type="text" 
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   placeholder="Search logs..." 
                   className="w-48 pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                 />
             </div>
             
             <div className="relative">
                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="date"
                   value={selectedDate}
                   onChange={e => setSelectedDate(e.target.value)}
                   className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                 />
             </div>
             
             <button 
                 onClick={handleExport}
                 disabled={filteredLogs.length === 0}
                 className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
             >
                 <Download className="w-4 h-4" /> Export
             </button>
          </div>
        </div>

        {loading ? (
            <div className="py-20 text-center text-slate-500">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
            <div className="py-20 text-center">
               <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-full mx-auto mb-4">
                  <Bell className="w-8 h-8 text-slate-400" />
               </div>
               <h3 className="text-lg font-bold text-slate-700">No Activity Found</h3>
               <p className="text-sm text-slate-500">There are no audit logs for {selectedDate}.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                        <th className="p-4 rounded-tl-lg">Timestamp</th>
                        <th className="p-4">User</th>
                        <th className="p-4">Action</th>
                        <th className="p-4 rounded-tr-lg">Details</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                           <td className="p-4 text-slate-600 font-medium">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                           </td>
                           <td className="p-4">
                              <span className="font-semibold text-slate-900">{log.username}</span>
                              <span className="text-[10px] text-slate-400 block">{log.userId}</span>
                           </td>
                           <td className="p-4">
                              <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">
                                  {log.action}
                              </span>
                           </td>
                           <td className="p-4 text-slate-600 truncate max-w-md" title={log.details}>
                              {log.details}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
        )}
      </div>
    </div>
  );
}
