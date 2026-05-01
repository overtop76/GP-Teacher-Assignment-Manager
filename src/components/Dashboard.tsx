import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/authStore';
import { GRADE_LABELS, MAX_CLASS_SESSIONS, TEACHER_MAX_SESSIONS, TEACHER_MIN_SESSIONS } from '@/lib/types';
import { Users, School, BookOpen, Presentation, Hash, Library, Filter } from 'lucide-react';

import { Trash2 } from 'lucide-react';

export default function Dashboard() {
  const { data, getTotalSessionsForClass, getTeacherTotalSessions, getClassesForGrade, deleteClass } = useAppStore();

  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.permissions.isAdmin;

  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const configuredGrades = GRADE_LABELS.filter(g => getClassesForGrade(g).length > 0).length;
  
  let totalClasses = 0;
  let totalSubjects = 0;
  const allTeachers = new Set<string>();
  const teachersPerSubject: Record<string, Set<string>> = {};
  const sessionsPerSubject: Record<string, number> = {};
  const classListForTable: { grade: string, className: string, subjectsCount: number, totalSessions: number }[] = [];

  const allAvailableClasses = new Set<string>();
  const allAvailableSubjects = new Set<string>();
  GRADE_LABELS.forEach(g => {
    getClassesForGrade(g).forEach(c => {
      allAvailableClasses.add(c);
      const subjects = data.gradeLevels[g].classes[c].subjects || {};
      Object.entries(subjects).forEach(([sId, subj]: [string, any]) => {
        if (subj.isFL) {
           Object.keys(subj.languages || {}).forEach(langId => allAvailableSubjects.add(langId));
        } else if (subj.isArtMusic) {
           Object.keys(subj.subSubjects || {}).forEach(subId => allAvailableSubjects.add(subId));
        } else {
           const name = subj.isElective ? subj.name || sId : sId;
           allAvailableSubjects.add(name);
        }
      });
    });
  });
  const uniqueClassNames = Array.from(allAvailableClasses).sort();
  const uniqueSubjects = Array.from(allAvailableSubjects).sort();

  GRADE_LABELS.forEach(g => {
    getClassesForGrade(g).forEach(cls => {
      const subjects = data.gradeLevels[g].classes[cls].subjects || {};
      const subjectsCount = Object.keys(subjects).length;
      const tSessions = getTotalSessionsForClass(g, cls);
      classListForTable.push({ grade: g, className: cls, subjectsCount, totalSessions: tSessions });
    });
  });

  const filteredGradeLabels = selectedGrades.length > 0 
    ? GRADE_LABELS.filter(g => selectedGrades.includes(g))
    : GRADE_LABELS;

  filteredGradeLabels.forEach(g => {
    const classes = getClassesForGrade(g);
    let filteredClasses = classes;
    if (selectedClasses.length > 0) {
      filteredClasses = classes.filter(cls => selectedClasses.includes(cls));
    }
    
    totalClasses += filteredClasses.length;
    filteredClasses.forEach(cls => {
      const subjects = data.gradeLevels[g].classes[cls].subjects || {};
      
      let classSubjectsCount = Object.keys(subjects).length;
      // We process subjects, applying the subject filter
      
      Object.entries(subjects).forEach(([sId, subj]: [string, any]) => {
        if (subj.isFL) {
          Object.entries(subj.languages || {}).forEach(([langId, lang]: [string, any]) => {
            if (selectedSubjects.length > 0 && !selectedSubjects.includes(langId)) return;
            totalSubjects++;
            sessionsPerSubject[langId] = (sessionsPerSubject[langId] || 0) + (subj.sessions || 0);
            if (lang.teacher) {
               allTeachers.add(lang.teacher);
               if (!teachersPerSubject[langId]) teachersPerSubject[langId] = new Set();
               teachersPerSubject[langId].add(lang.teacher);
            }
          });
        } else if (subj.isArtMusic) {
          Object.entries(subj.subSubjects || {}).forEach(([subId, subp]: [string, any]) => {
            if (selectedSubjects.length > 0 && !selectedSubjects.includes(subId)) return;
            totalSubjects++;
            sessionsPerSubject[subId] = (sessionsPerSubject[subId] || 0) + (subj.sessions || 0);
            if (subp.teacher) {
               allTeachers.add(subp.teacher);
               if (!teachersPerSubject[subId]) teachersPerSubject[subId] = new Set();
               teachersPerSubject[subId].add(subp.teacher);
            }
          });
        } else {
          const name = subj.isElective ? subj.name || sId : sId;
          if (selectedSubjects.length > 0 && !selectedSubjects.includes(name)) return;
          totalSubjects++;
          sessionsPerSubject[name] = (sessionsPerSubject[name] || 0) + (subj.sessions || 0);
          if (subj.teacher) {
             allTeachers.add(subj.teacher);
             if (!teachersPerSubject[name]) teachersPerSubject[name] = new Set();
             teachersPerSubject[name].add(subj.teacher);
          }
        }
      });
    });
  });

  const handleDeleteClass = (grade: string, cls: string) => {
    let canEdit = false;
    if (isAdmin || (!currentUser?.permissions.canEditGrades?.length && !currentUser?.permissions.canViewGrades?.length)) {
      canEdit = true;
    } else if (currentUser?.permissions.canEditGrades?.includes(grade)) {
      const editList = currentUser?.permissions.canEditClasses?.[grade] || [];
      if (editList.length === 0 || editList.includes(cls)) canEdit = true;
    }

    if (!canEdit) {
      alert("You do not have permission to delete this class.");
      return;
    }

    if (confirm(`Are you sure you want to delete Class ${cls} from Grade ${grade}? This will also delete all subjects assigned to it.`)) {
      deleteClass(grade, cls);
    }
  };

  const totalTeachers = allTeachers.size;

  let totalHoDs = 0;
  if (selectedGrades.length > 0 || selectedClasses.length > 0 || selectedSubjects.length > 0) {
    allTeachers.forEach(tch => {
      if (data.teacherProfiles?.[tch]?.isHoD) totalHoDs++;
    });
  } else {
    Object.values(data.teacherProfiles || {}).forEach((tp: any) => {
      if (tp.isHoD) totalHoDs++;
    });
  }

  const stats = [
    { icon: <School className="w-5 h-5" />, value: data.schoolName || '—', label: 'School Name' },
    { icon: <Library className="w-5 h-5" />, value: `${configuredGrades}/13`, label: 'Grades Configured' },
    { icon: <Users className="w-5 h-5" />, value: totalClasses, label: 'Class Sections' },
    { icon: <BookOpen className="w-5 h-5" />, value: totalSubjects, label: 'Assignments' },
    { icon: <Presentation className="w-5 h-5" />, value: totalTeachers, label: 'Unique Teachers' },
    { icon: <Presentation className="w-5 h-5 text-amber-500" />, value: totalHoDs, label: 'Assigned HoDs' },
    { icon: <Hash className="w-5 h-5" />, value: data.nextSubjectId - 1, label: 'Subject IDs' }
  ];

  const alerts: { type: 'ok'|'warn'|'danger', msg: string }[] = [];

  // Alerts
  classListForTable.forEach(item => {
    const { grade: g, className: cls, totalSessions: total } = item;
    const subjects = data.gradeLevels[g].classes[cls].subjects || {};
    if (Object.keys(subjects).length === 0) return;
    
    if (total > MAX_CLASS_SESSIONS) alerts.push({ type: 'danger', msg: `Grade ${g} – Class ${cls}: ${total} sessions (${total - MAX_CLASS_SESSIONS} over limit)`});
    else if (total < MAX_CLASS_SESSIONS) alerts.push({ type: 'warn', msg: `Grade ${g} – Class ${cls}: ${total} sessions (${MAX_CLASS_SESSIONS - total} below target)`});
  });

  allTeachers.forEach(tch => {
    const total = getTeacherTotalSessions(tch);
    if (total > TEACHER_MAX_SESSIONS) alerts.push({ type: 'danger', msg: `Teacher ${tch}: ${total} sessions (exceeds max of ${TEACHER_MAX_SESSIONS})` });
    else if (total < TEACHER_MIN_SESSIONS) alerts.push({ type: 'warn', msg: `Teacher ${tch}: ${total} sessions (below min of ${TEACHER_MIN_SESSIONS})` });
  });

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and track school assignments and capacity.</p>
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${showFilters ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Filter className="w-4 h-4" /> Filters {(selectedGrades.length > 0 || selectedClasses.length > 0 || selectedSubjects.length > 0) && <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{selectedGrades.length + selectedClasses.length + selectedSubjects.length}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in flex flex-col gap-4">
           <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Filter by Grade</h3>
              <div className="flex flex-wrap gap-2">
                 {GRADE_LABELS.map(g => {
                   const isSel = selectedGrades.includes(g);
                   return (
                     <button 
                       key={g}
                       onClick={() => {
                          if (isSel) setSelectedGrades(selectedGrades.filter(x => x !== g));
                          else setSelectedGrades([...selectedGrades, g]);
                       }}
                       className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${isSel ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                     >
                       {g}
                     </button>
                   )
                 })}
              </div>
           </div>
           
           <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Filter by Class Section</h3>
              <div className="flex flex-wrap gap-2">
                 {uniqueClassNames.map(c => {
                   const isSel = selectedClasses.includes(c);
                   return (
                     <button 
                       key={c}
                       onClick={() => {
                          if (isSel) setSelectedClasses(selectedClasses.filter(x => x !== c));
                          else setSelectedClasses([...selectedClasses, c]);
                       }}
                       className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${isSel ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                     >
                       {c}
                     </button>
                   )
                 })}
                 {uniqueClassNames.length === 0 && <span className="text-sm text-slate-400">No classes configured.</span>}
              </div>
           </div>

           <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Filter by Subject</h3>
              <div className="flex flex-wrap gap-2">
                 {uniqueSubjects.map(s => {
                   const isSel = selectedSubjects.includes(s);
                   return (
                     <button 
                       key={s}
                       onClick={() => {
                          if (isSel) setSelectedSubjects(selectedSubjects.filter(x => x !== s));
                          else setSelectedSubjects([...selectedSubjects, s]);
                       }}
                       className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${isSel ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                     >
                       {s}
                     </button>
                   )
                 })}
                 {uniqueSubjects.length === 0 && <span className="text-sm text-slate-400">No subjects configured.</span>}
              </div>
           </div>
           
           {(selectedGrades.length > 0 || selectedClasses.length > 0 || selectedSubjects.length > 0) && (
             <div className="flex justify-end pt-2 border-t border-slate-100">
                <button onClick={() => { setSelectedGrades([]); setSelectedClasses([]); setSelectedSubjects([]); }} className="text-xs font-bold text-slate-500 hover:text-slate-700">Clear All Filters</button>
             </div>
           )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.slice(0,4).map((s, i) => (
          <div key={i} className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm ${i === 3 ? 'border-l-4 border-l-amber-400' : ''}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400">{s.icon}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
          </div>
        ))}
        {stats.slice(4).map((s, i) => (
          <div key={i + 4} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400">{s.icon}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-widest mb-4">Quick Summary</h3>
          {totalClasses === 0 ? (
            <p className="text-slate-500 text-sm">Start by setting up school name and grade classes in Setup.</p>
          ) : (
            <p className="text-slate-600 text-sm leading-relaxed">{configuredGrades} grades configured with {totalClasses} classes. Managing {totalSubjects} subjects across {totalTeachers} teachers ({totalHoDs} Heads of Department).</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-widest mb-4">Subject Stats</h3>
          <div className="space-y-2 overflow-y-auto max-h-[250px] pr-2">
            {Object.entries(teachersPerSubject).length === 0 ? (
               <p className="text-slate-500 text-sm">No subjects/teachers assigned yet.</p>
            ) : Object.entries(teachersPerSubject).sort((a, b) => b[1].size - a[1].size).map(([subj, teachers]) => (
               <div key={subj} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  <span className="font-medium text-sm text-slate-700">{subj}</span>
                  <div className="flex items-center gap-1.5">
                     <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full" title="Teachers">{teachers.size} Tchs</span>
                     <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full" title="Sessions">{sessionsPerSubject[subj] || 0} Sess</span>
                  </div>
               </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-widest mb-4">Session & Teacher Alerts</h3>
          <div className="space-y-3 overflow-y-auto flex-1 max-h-[250px] pr-2">
            {alerts.length === 0 ? (
               <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-3 rounded-lg text-sm font-medium">
                 All classes and teachers are within limits.
               </div>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className={`px-4 py-3 rounded-lg text-sm font-medium border ${
                  a.type === 'danger' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {a.msg}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-4">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-widest">Configured Classes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Grade</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Class</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Subjects</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Total Sessions</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-[10px] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classListForTable.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">No classes configured.</td>
                </tr>
              ) : (
                classListForTable.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 font-medium">{item.grade}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{item.className}</td>
                    <td className="px-6 py-4 text-slate-600"><span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold">{item.subjectsCount} subj.</span></td>
                    <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                       <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${item.totalSessions > MAX_CLASS_SESSIONS ? 'bg-rose-100 text-rose-700' : item.totalSessions < MAX_CLASS_SESSIONS ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                         {item.totalSessions} / {MAX_CLASS_SESSIONS}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(() => {
                        let canEdit = false;
                        if (isAdmin || (!currentUser?.permissions.canEditGrades?.length && !currentUser?.permissions.canViewGrades?.length)) {
                          canEdit = true;
                        } else if (currentUser?.permissions.canEditGrades?.includes(item.grade)) {
                          const editList = currentUser?.permissions.canEditClasses?.[item.grade] || [];
                          if (editList.length === 0 || editList.includes(item.className)) canEdit = true;
                        }
                        if (!canEdit) return null;
                        return (
                          <button 
                            onClick={() => handleDeleteClass(item.grade, item.className)} 
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-block"
                            title="Delete Class"
                          >
                            <Trash2 size={16} />
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
