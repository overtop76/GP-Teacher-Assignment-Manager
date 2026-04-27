import { useAppStore } from '@/lib/store';
import { GRADE_LABELS, MAX_CLASS_SESSIONS, TEACHER_MAX_SESSIONS, TEACHER_MIN_SESSIONS } from '@/lib/types';
import { Users, School, BookOpen, Presentation, Hash, Library } from 'lucide-react';

import { Trash2 } from 'lucide-react';

export default function Dashboard() {
  const { data, getTotalSessionsForClass, getTeacherTotalSessions, getClassesForGrade, deleteClass } = useAppStore();

  const configuredGrades = GRADE_LABELS.filter(g => getClassesForGrade(g).length > 0).length;
  
  let totalClasses = 0;
  let totalSubjects = 0;
  const allTeachers = new Set<string>();
  const classListForTable: { grade: string, className: string, subjectsCount: number, totalSessions: number }[] = [];

  GRADE_LABELS.forEach(g => {
    const classes = getClassesForGrade(g);
    totalClasses += classes.length;
    classes.forEach(cls => {
      const subjects = data.gradeLevels[g].classes[cls].subjects || {};
      const subjectsCount = Object.keys(subjects).length;
      totalSubjects += subjectsCount;
      const tSessions = getTotalSessionsForClass(g, cls);
      classListForTable.push({ grade: g, className: cls, subjectsCount, totalSessions: tSessions });

      Object.values(subjects).forEach((subj: any) => {
        if (subj.isFL) {
          Object.values(subj.languages || {}).forEach((lang: any) => {
            if (lang.teacher) allTeachers.add(lang.teacher);
          });
        } else if (subj.isArtMusic) {
          Object.values(subj.subSubjects || {}).forEach((subp: any) => {
            if (subp.teacher) allTeachers.add(subp.teacher);
          });
        } else {
          if (subj.teacher) allTeachers.add(subj.teacher);
        }
      });
    });
  });

  const handleDeleteClass = (grade: string, cls: string) => {
    if (confirm(`Are you sure you want to delete Class ${cls} from Grade ${grade}? This will also delete all subjects assigned to it.`)) {
      deleteClass(grade, cls);
    }
  };

  const totalTeachers = allTeachers.size;

  const stats = [
    { icon: <School className="w-5 h-5" />, value: data.schoolName || '—', label: 'School Name' },
    { icon: <Library className="w-5 h-5" />, value: `${configuredGrades}/13`, label: 'Grades Configured' },
    { icon: <Users className="w-5 h-5" />, value: totalClasses, label: 'Class Sections' },
    { icon: <BookOpen className="w-5 h-5" />, value: totalSubjects, label: 'Assignments' },
    { icon: <Presentation className="w-5 h-5" />, value: totalTeachers, label: 'Unique Teachers' },
    { icon: <Hash className="w-5 h-5" />, value: data.nextSubjectId - 1, label: 'Subject IDs' }
  ];

  const alerts: { type: 'ok'|'warn'|'danger', msg: string }[] = [];

  // Alerts
  GRADE_LABELS.forEach(g => {
    getClassesForGrade(g).forEach(cls => {
      const total = getTotalSessionsForClass(g, cls);
      const subjects = data.gradeLevels[g].classes[cls].subjects || {};
      if (Object.keys(subjects).length === 0) return;
      
      if (total > MAX_CLASS_SESSIONS) alerts.push({ type: 'danger', msg: `Grade ${g} – Class ${cls}: ${total} sessions (${total - MAX_CLASS_SESSIONS} over limit)`});
      else if (total < MAX_CLASS_SESSIONS) alerts.push({ type: 'warn', msg: `Grade ${g} – Class ${cls}: ${total} sessions (${MAX_CLASS_SESSIONS - total} below target)`});
    });
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
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-widest mb-4">Quick Summary</h3>
          {totalClasses === 0 ? (
            <p className="text-slate-500 text-sm">Start by setting up school name and grade classes in Setup.</p>
          ) : (
            <p className="text-slate-600 text-sm leading-relaxed">{configuredGrades} grades configured with {totalClasses} classes. Managing {totalSubjects} subjects across {totalTeachers} teachers.</p>
          )}
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
                      <button 
                        onClick={() => handleDeleteClass(item.grade, item.className)} 
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-block"
                        title="Delete Class"
                      >
                        <Trash2 size={16} />
                      </button>
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
