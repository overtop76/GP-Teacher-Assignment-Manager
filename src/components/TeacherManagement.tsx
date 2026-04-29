import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/authStore';
import { BadgeCheck, GraduationCap, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeacherManagement() {
  const { data, setTeacherProfile } = useAppStore();
  const { currentUser } = useAuthStore();
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'hod', 'only_teacher'
  
  const canEdit = currentUser?.permissions.isAdmin; // Only admins can edit HoD? Or maybe anyone with access. Let's say all users with access.
  
  // Build a complete list of teachers and their assignments
  const teacherStats: Record<string, {
    name: string,
    id: string,
    sessions: number,
    subjects: Set<string>,
    grades: Set<string>,
    classes: Set<string>,
    isHoD: boolean,
    department: string,
  }> = {};

  const teachersList = Object.keys(data.teachers || {});
  teachersList.forEach(tName => {
    const tId = data.teachers[tName];
    teacherStats[tName] = {
      name: tName,
      id: tId,
      sessions: 0,
      subjects: new Set(),
      grades: new Set(),
      classes: new Set(),
      isHoD: data.teacherProfiles?.[tId]?.isHoD || false,
      department: data.teacherProfiles?.[tId]?.department || '',
    };
  });

  const allSubjectNames = new Set<string>();

  Object.entries(data.gradeLevels).forEach(([grade, gData]: [string, any]) => {
    Object.entries(gData.classes || {}).forEach(([cls, cData]: [string, any]) => {
      Object.entries(cData.subjects || {}).forEach(([sName, subj]: [string, any]) => {
        if (!['FL', 'Art/Music'].includes(sName) && !subj.isElective) {
           allSubjectNames.add(sName);
           if (subj.teacher && teacherStats[subj.teacher]) {
              teacherStats[subj.teacher].sessions += subj.sessions || 0;
              teacherStats[subj.teacher].subjects.add(sName);
              teacherStats[subj.teacher].grades.add(grade);
              teacherStats[subj.teacher].classes.add(`${grade}-${cls}`);
           }
        }
        if (subj.isFL && subj.languages) {
           Object.entries(subj.languages).forEach(([lang, lData]: [string, any]) => {
             allSubjectNames.add(lang);
             if (lData.teacher && teacherStats[lData.teacher]) {
                teacherStats[lData.teacher].sessions += subj.sessions || 0;
                teacherStats[lData.teacher].subjects.add(lang);
                teacherStats[lData.teacher].grades.add(grade);
                teacherStats[lData.teacher].classes.add(`${grade}-${cls}`);
             }
           });
        }
        if (subj.isArtMusic && subj.subSubjects) {
           Object.entries(subj.subSubjects).forEach(([am, amData]: [string, any]) => {
             allSubjectNames.add(am);
             if (amData.teacher && teacherStats[amData.teacher]) {
                teacherStats[amData.teacher].sessions += subj.sessions || 0;
                teacherStats[amData.teacher].subjects.add(am);
                teacherStats[amData.teacher].grades.add(grade);
                teacherStats[amData.teacher].classes.add(`${grade}-${cls}`);
             }
           });
        }
        if (subj.isElective && subj.electives) {
           Object.entries(subj.electives).forEach(([elName, elData]: [string, any]) => {
             allSubjectNames.add(elName);
             if (elData.teacher && teacherStats[elData.teacher]) {
                teacherStats[elData.teacher].sessions += subj.sessions || 0;
                teacherStats[elData.teacher].subjects.add(elName);
                teacherStats[elData.teacher].grades.add(grade);
                teacherStats[elData.teacher].classes.add(`${grade}-${cls}`);
             }
           });
        }
      });
    });
  });

  const uniqueSubjectNames = Array.from(allSubjectNames).sort();

  // "only_teacher" means they teach only ONE subject
  let filteredTeachers = Object.values(teacherStats);
  
  if (filterSubject) {
    filteredTeachers = filteredTeachers.filter(t => t.subjects.has(filterSubject));
  }
  if (filterType === 'hod') {
    filteredTeachers = filteredTeachers.filter(t => t.isHoD);
  } else if (filterType === 'only_teacher') {
    // Only teacher of a specific subject, or literally teaching only 1 subject across their load
    // Standard interpretation: teaches exactly 1 subject type
    filteredTeachers = filteredTeachers.filter(t => t.subjects.size === 1);
  }

  // Sort by name
  filteredTeachers.sort((a, b) => a.name.localeCompare(b.name));

  const toggleHoD = (teacherId: string, currentVal: boolean) => {
    setTeacherProfile(teacherId, { isHoD: !currentVal });
    if (!currentVal) {
      toast.success('Marked as Head of Department');
    } else {
      toast.success('Removed Head of Department role');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Teacher Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage teacher roles and view subject assignments.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select 
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Subjects</option>
            {uniqueSubjectNames.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Roles</option>
            <option value="hod">Head of Department (HoD)</option>
            <option value="only_teacher">Teaches Only One Subject</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <th className="p-4">Teacher Name</th>
              <th className="p-4">Role</th>
              <th className="p-4 text-center">Total Sessions</th>
              <th className="p-4">Subjects Taught</th>
              <th className="p-4">Grades Taught</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTeachers.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-medium text-slate-900">
                  {t.name}
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => toggleHoD(t.id, t.isHoD)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${t.isHoD ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {t.isHoD ? <BadgeCheck size={14} /> : <GraduationCap size={14} />}
                    {t.isHoD ? 'HoD' : 'Teacher'}
                  </button>
                </td>
                <td className="p-4 text-center">
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-bold ${t.sessions > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                    {t.sessions}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(t.subjects).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-xs font-medium">
                        {s}
                      </span>
                    ))}
                    {t.subjects.size === 0 && <span className="text-xs text-slate-400 font-medium">Unassigned</span>}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {Array.from(t.grades).map(g => (
                      <span key={g} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                        {g}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {filteredTeachers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No teachers match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
