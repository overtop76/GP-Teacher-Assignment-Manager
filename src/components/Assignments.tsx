import { useState } from 'react';
import React from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/authStore';
import { FL_FLAGS, FL_LANGUAGES, ART_MUSIC_SUBJECTS, GRADE_LABELS, MAX_CLASS_SESSIONS, Subject, TEACHER_MAX_SESSIONS, TEACHER_MIN_SESSIONS } from '@/lib/types';
import { Edit2, Plus, Trash2, Globe2, Copy, ShieldAlert, Palette, Shuffle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Assignments() {
  const { data, getClassesForGrade, getTotalSessionsForClass, setSubjectForGradeClass, deleteSubjectForGradeClass, setFLSubject, setArtMusicSubject, setElectiveSubject, copySubjectsToClass, copySubjectsToAnotherSchool, getClassesForAnotherSchool } = useAppStore();
  const { currentUser, systemData, activeSchoolId } = useAuthStore();
  
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');

  const classesText = selectedGrade ? getClassesForGrade(selectedGrade) : [];

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState<string>('');

  // Form State
  const [isFL, setIsFL] = useState(false);
  const [isArtMusic, setIsArtMusic] = useState(false);
  const [isElective, setIsElective] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [sessions, setSessions] = useState(5);
  const [teacher, setTeacher] = useState('');
  const [flTeachers, setFlTeachers] = useState<Record<string, string>>({ French: '', Spanish: '', German: '' });
  const [amTeachers, setAmTeachers] = useState<Record<string, string>>({ Art: '', Music: '' });
  const [electiveOptions, setElectiveOptions] = useState<{name: string, teacher: string}[]>([{name: '', teacher: ''}]);

  // Copy Panel State
  const [copyDestSchool, setCopyDestSchool] = useState(activeSchoolId || '');
  const [copyDestGrade, setCopyDestGrade] = useState('');
  const [copyDestClass, setCopyDestClass] = useState('');

  const destClasses = copyDestSchool === activeSchoolId 
     ? (copyDestGrade ? getClassesForGrade(copyDestGrade) : [])
     : (copyDestGrade ? getClassesForAnotherSchool(copyDestSchool, copyDestGrade) : []);

  const currentSubjects = selectedGrade && selectedClass 
    ? data.gradeLevels[selectedGrade]?.classes[selectedClass]?.subjects || {} 
    : {};
    
  const totalSessions = selectedGrade && selectedClass ? getTotalSessionsForClass(selectedGrade, selectedClass) : 0;
  
  const hasNoGradeAccessControl = (!currentUser?.permissions?.canEditGrades?.length && !currentUser?.permissions?.canViewGrades?.length);

  const isAdmin = currentUser?.permissions.isAdmin;
  const canEditSelectedGrade = isAdmin || hasNoGradeAccessControl || (selectedGrade && currentUser?.permissions.canEditGrades?.includes(selectedGrade));

  const gradesList = data.gradesOrder || GRADE_LABELS;
  const visibleGrades = gradesList.filter(g => 
      isAdmin || 
      hasNoGradeAccessControl ||
      currentUser?.permissions.canEditGrades?.includes(g) || 
      currentUser?.permissions.canViewGrades?.includes(g)
  );

  const activeSchoolName = systemData.schools.find(s => s.id === activeSchoolId)?.name;
  const showArtMusicOption = !!activeSchoolName && activeSchoolName.toLowerCase().includes('gpis') && ['6', '7', '8'].includes(selectedGrade);

  const handleOpenModal = (subjStr?: string) => {
    if (!canEditSelectedGrade) return;

    if (subjStr) {
      const subj = currentSubjects[subjStr];
      setEditingSubject(subj);
      setEditingSubjectName(subjStr);
      setIsFL(!!subj.isFL);
      setIsArtMusic(!!subj.isArtMusic);
      setIsElective(!!subj.isElective);
      setSubjectName(subjStr);
      setSessions(subj.sessions);
      if (subj.isFL) {
        setFlTeachers({
          French: subj.languages?.French?.teacher || '',
          Spanish: subj.languages?.Spanish?.teacher || '',
          German: subj.languages?.German?.teacher || ''
        });
      } else if (subj.isArtMusic) {
        setAmTeachers({
          Art: subj.subSubjects?.Art?.teacher || '',
          Music: subj.subSubjects?.Music?.teacher || ''
        });
      } else if (subj.isElective) {
        const opts = Object.entries(subj.electives || {}).map(([name, data]) => ({ name, teacher: data.teacher }));
        setElectiveOptions(opts.length ? opts : [{name: '', teacher: ''}]);
      } else {
        setTeacher(subj.teacher || '');
      }
    } else {
      setEditingSubject(null);
      setEditingSubjectName('');
      setIsFL(false);
      setIsArtMusic(false);
      setIsElective(false);
      setSubjectName('');
      setSessions(Math.min(5, Math.max(1, MAX_CLASS_SESSIONS - totalSessions)));
      setTeacher('');
      setFlTeachers({ French: '', Spanish: '', German: '' });
      setAmTeachers({ Art: '', Music: '' });
      setElectiveOptions([{name: '', teacher: ''}]);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (isFL) {
      setFLSubject(selectedGrade, selectedClass, sessions, flTeachers, editingSubject?.id);
      toast.success('FL Subject saved!');
    } else if (isArtMusic) {
      setArtMusicSubject(selectedGrade, selectedClass, sessions, amTeachers, editingSubject?.id);
      toast.success('Art & Music saved!');
    } else if (isElective) {
      if (!subjectName.trim()) {
        toast.error('Block name is required');
        return;
      }
      const el: Record<string, string> = {};
      electiveOptions.forEach(eo => {
        if (eo.name.trim()) el[eo.name.trim()] = eo.teacher;
      });
      if (Object.keys(el).length === 0) {
        toast.error('At least one elective option is required');
        return;
      }
      setElectiveSubject(selectedGrade, selectedClass, subjectName, sessions, el, editingSubject?.id);
      toast.success('Electives block saved!');
    } else {
      if (!subjectName.trim()) {
        toast.error('Subject name is required');
        return;
      }
      setSubjectForGradeClass(selectedGrade, selectedClass, subjectName, sessions, teacher, editingSubject?.id);
      toast.success('Subject saved!');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (subj: string) => {
    deleteSubjectForGradeClass(selectedGrade, selectedClass, subj);
    toast.success('Deleted');
  };

  const handleCopy = () => {
    if (!copyDestGrade || !copyDestClass) {
      toast.error('Select destination grade and class');
      return;
    }
    if (copyDestSchool === activeSchoolId && copyDestGrade === selectedGrade && copyDestClass === selectedClass) {
      toast.error('Cannot copy to the same class');
      return;
    }

    const canEditDest = isAdmin || hasNoGradeAccessControl || currentUser?.permissions.canEditGrades?.includes(copyDestGrade);
    const canSwitchSchool = isAdmin || currentUser?.assignedSchools?.includes('ALL');
    
    if (copyDestSchool !== activeSchoolId && !canSwitchSchool) {
        toast.error(`You do not have permission to copy to another school.`);
        return;
    }

    if (!canEditDest) {
        toast.error(`You do not have permission to edit Grade ${copyDestGrade}.`);
        return;
    }

    if (copyDestSchool === activeSchoolId) {
       copySubjectsToClass(selectedGrade, selectedClass, copyDestGrade, copyDestClass);
    } else {
       copySubjectsToAnotherSchool(selectedGrade, selectedClass, copyDestSchool, copyDestGrade, copyDestClass);
    }
    toast.success('Copied successfully!');
  };

  const allTeachers = Object.keys(data.teachers || {}).sort();
  const allSubjectNames = new Set<string>();
  Object.values(data.gradeLevels).forEach(g => {
    Object.values(g.classes || {}).forEach(c => {
      Object.entries(c.subjects || {}).forEach(([s, subj]: [string, any]) => {
         if (!['FL', 'Art/Music'].includes(s)) {
             allSubjectNames.add(s);
         }
         if (subj.isElective && subj.electives) {
             Object.keys(subj.electives).forEach(el => allSubjectNames.add(el));
         }
      });
    });
  });
  const uniqueSubjectNames = Array.from(allSubjectNames).sort();

  const getFilteredTeachers = (targetSubject: string) => {
    if (!targetSubject || !targetSubject.trim()) return allTeachers;
    const target = targetSubject.toLowerCase().trim();
    const teachers = new Set<string>();
    
    Object.values(data.gradeLevels).forEach(g => {
      Object.values(g.classes || {}).forEach(c => {
        Object.entries(c.subjects || {}).forEach(([sName, subj]: [string, any]) => {
          if (!['FL', 'Art/Music'].includes(sName) && !subj.isElective) {
             if (sName.toLowerCase().trim() === target && subj.teacher) teachers.add(subj.teacher);
          }
          if (subj.isFL && subj.languages) {
             Object.entries(subj.languages).forEach(([lang, lData]: [string, any]) => {
               if (lang.toLowerCase().trim() === target && lData.teacher) teachers.add(lData.teacher);
             });
          }
          if (subj.isArtMusic && subj.subSubjects) {
             Object.entries(subj.subSubjects).forEach(([am, amData]: [string, any]) => {
               if (am.toLowerCase().trim() === target && amData.teacher) teachers.add(amData.teacher);
             });
          }
          if (subj.isElective && subj.electives) {
             Object.entries(subj.electives).forEach(([elName, elData]: [string, any]) => {
               if (elName.toLowerCase().trim() === target && elData.teacher) teachers.add(elData.teacher);
             });
          }
        });
      });
    });
    
    const arr = Array.from(teachers).sort();
    return arr.length > 0 ? arr : allTeachers;
  };

  if (visibleGrades.length === 0) {
      return (
          <div className="p-8 text-center text-slate-500">
              <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h2 className="text-xl font-bold text-slate-700">No Grade Access</h2>
              <p>You have not been assigned view or edit permissions for any grades.</p>
          </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Teacher Assignments</h1>
          <p className="text-slate-500 text-sm mt-1">Assign subjects and teachers for each class section.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Class Selection</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Grade Level</label>
            <select 
              value={selectedGrade}
              onChange={e => { setSelectedGrade(e.target.value); setSelectedClass(''); }}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors text-slate-900"
            >
              <option value="">-- Select --</option>
              {visibleGrades.map(g => {
                const cls = getClassesForGrade(g);
                return (
                  <option key={g} value={g} disabled={cls.length === 0}>
                    Grade {g} {cls.length > 0 ? `(${cls.length} classes)` : ''}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Class Section</label>
             <select 
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              disabled={!selectedGrade}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors text-slate-900 disabled:opacity-50 disabled:bg-slate-50"
            >
              <option value="">-- Select --</option>
              {classesText.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedGrade && selectedClass && Object.keys(currentSubjects).length > 0 && canEditSelectedGrade && (
        <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-6">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Copy className="w-4 h-4" /> Copy Subjects</h3>
          <p className="text-sm text-slate-600 mb-4">Duplicate this class's subjects to another class.</p>
          <div className="flex flex-col sm:flex-row items-end gap-4">
             {(isAdmin || currentUser?.assignedSchools?.includes('ALL')) && (
               <div className="flex-1 w-full">
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5">Destination School</label>
                 <select 
                   value={copyDestSchool}
                   onChange={e => { setCopyDestSchool(e.target.value); setCopyDestGrade(''); setCopyDestClass(''); }}
                   className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                 >
                   {systemData.schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
               </div>
             )}
             <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Destination Grade</label>
              <select 
                value={copyDestGrade}
                onChange={e => { setCopyDestGrade(e.target.value); setCopyDestClass(''); }}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
              >
                <option value="">-- Select --</option>
                {gradesList.filter(g => (copyDestSchool === activeSchoolId ? getClassesForGrade(g) : getClassesForAnotherSchool(copyDestSchool, g)).length > 0 && (isAdmin || hasNoGradeAccessControl || currentUser?.permissions.canEditGrades?.includes(g))).map(g => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Destination Class</label>
               <select 
                value={copyDestClass}
                onChange={e => setCopyDestClass(e.target.value)}
                disabled={!copyDestGrade}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm disabled:opacity-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">-- Select --</option>
                {destClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
             <button 
              onClick={handleCopy}
              className="px-5 py-2.5 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-semibold rounded-lg w-full sm:w-auto flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Copy size={16} /> Copy All
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
               Subjects & Teachers
               {!canEditSelectedGrade && selectedGrade && (
                   <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] ml-2">Read Only</span>
               )}
            </h3>
          </div>
          {canEditSelectedGrade && (
              <button 
                disabled={!selectedGrade || !selectedClass}
                onClick={() => handleOpenModal()}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors shadow-sm shadow-indigo-200"
              >
                <Plus size={16} /> Add Subject
              </button>
          )}
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
        {selectedGrade && selectedClass ? (
          <>
            <div className={`px-4 py-3 rounded-lg text-sm font-medium border mb-6 ${
              totalSessions > MAX_CLASS_SESSIONS ? 'bg-rose-50 text-rose-700 border-rose-200' : 
              totalSessions < MAX_CLASS_SESSIONS ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {totalSessions > MAX_CLASS_SESSIONS ? `🔴 Total sessions: ${totalSessions} (${totalSessions - MAX_CLASS_SESSIONS} over limit)` : 
               totalSessions < MAX_CLASS_SESSIONS ? `🟡 Total sessions: ${totalSessions} (${MAX_CLASS_SESSIONS - totalSessions} below target)` : 
               `✅ Total sessions: ${totalSessions} — exactly at required sessions.`}
            </div>

            {Object.keys(currentSubjects).length === 0 ? (
               <div className="text-center py-16 opacity-60">
                 <div className="text-4xl mb-3 text-slate-300">📭</div>
                 <h3 className="font-semibold text-slate-900">No subjects yet</h3>
                 <p className="text-sm text-slate-500">Click Add Subject to start assigning.</p>
               </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">#</th>
                      <th className="px-6 py-3">Subject Name</th>
                      <th className="px-6 py-3">Sessions</th>
                      <th className="px-6 py-3">Assigned Teacher</th>
                      {canEditSelectedGrade && <th className="px-6 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(currentSubjects).sort((a, b) => a[0].localeCompare(b[0])).map(([subjName, subj]: [string, any], idx) => {
                      if (subj.isFL) {
                        const assignedDict = (FL_LANGUAGES as unknown as string[]).filter(l => (subj.languages?.[l]?.teacher || '').trim());
                        return (
                          <React.Fragment key={subjName}>
                             <tr className="bg-indigo-50/30">
                               <td colSpan={3} className="px-6 py-4 font-semibold text-indigo-900 border-l-4 border-indigo-500">
                                  🌍 FL — Foreign Languages ({subj.sessions} sess)
                               </td>
                               <td className="px-6 py-4 text-indigo-600 text-xs font-bold">{assignedDict.length} assigned</td>
                               {canEditSelectedGrade && (
                                   <td className="px-6 py-4 flex items-center justify-end gap-2">
                                    <button onClick={() => handleOpenModal(subjName)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(subjName)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                  </td>
                               )}
                             </tr>
                             {FL_LANGUAGES.map(lang => {
                               const teacherStr = (subj.languages?.[lang]?.teacher || '').trim();
                               if (!teacherStr) return null;
                               const teacherIdStr = subj.languages?.[lang]?.teacherId;
                               return (
                               <tr key={lang} className="bg-white">
                                 <td className="px-6 py-3 border-l-4 border-indigo-100"></td>
                                 <td className="px-6 py-3 font-medium text-slate-700 flex items-center gap-2">
                                    {FL_FLAGS[lang]} {lang}
                                 </td>
                                 <td className="px-6 py-3"><span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold">{subj.sessions} sess.</span></td>
                                 <td className="px-6 py-3 font-medium text-slate-900">{teacherStr} {teacherIdStr && <span className="text-slate-400 ml-1 text-xs">({teacherIdStr})</span>}</td>
                                 {canEditSelectedGrade && <td className="px-6 py-3 border-r border-transparent"></td>}
                               </tr>
                               )
                             })}
                          </React.Fragment>
                        );
                      } else if (subj.isArtMusic) {
                        const assignedDictAM = (ART_MUSIC_SUBJECTS as unknown as string[]).filter(am => (subj.subSubjects?.[am]?.teacher || '').trim());
                        return (
                          <React.Fragment key={subjName}>
                             <tr className="bg-amber-50/30">
                               <td colSpan={3} className="px-6 py-4 font-semibold text-amber-900 border-l-4 border-amber-500">
                                  🎨 Art & Music (Parallel) ({subj.sessions} sess)
                               </td>
                               <td className="px-6 py-4 text-amber-600 text-xs font-bold">{assignedDictAM.length} assigned</td>
                               {canEditSelectedGrade && (
                                   <td className="px-6 py-4 flex items-center justify-end gap-2">
                                    <button onClick={() => handleOpenModal(subjName)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(subjName)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                  </td>
                               )}
                             </tr>
                             {ART_MUSIC_SUBJECTS.map(am => {
                               const teacherStr = (subj.subSubjects?.[am]?.teacher || '').trim();
                               if (!teacherStr) return null;
                               const teacherIdStr = subj.subSubjects?.[am]?.teacherId;
                               return (
                               <tr key={am} className="bg-white">
                                 <td className="px-6 py-3 border-l-4 border-amber-100"></td>
                                 <td className="px-6 py-3 font-medium text-slate-700 flex items-center gap-2">
                                    {am}
                                 </td>
                                 <td className="px-6 py-3"><span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold">{subj.sessions} sess.</span></td>
                                 <td className="px-6 py-3 font-medium text-slate-900">{teacherStr} {teacherIdStr && <span className="text-slate-400 ml-1 text-xs">({teacherIdStr})</span>}</td>
                                 {canEditSelectedGrade && <td className="px-6 py-3 border-r border-transparent"></td>}
                               </tr>
                               )
                             })}
                          </React.Fragment>
                        );
                      } else if (subj.isElective) {
                        const electivesList = Object.keys(subj.electives || {});
                        const assignedDictAM = electivesList.filter(am => (subj.electives?.[am]?.teacher || '').trim());
                        return (
                          <React.Fragment key={subjName}>
                             <tr className="bg-emerald-50/30">
                               <td colSpan={3} className="px-6 py-4 font-semibold text-emerald-900 border-l-4 border-emerald-500">
                                  🔀 {subjName} (Parallel) ({subj.sessions} sess)
                               </td>
                               <td className="px-6 py-4 text-emerald-600 text-xs font-bold">{assignedDictAM.length} assigned</td>
                               {canEditSelectedGrade && (
                                   <td className="px-6 py-4 flex items-center justify-end gap-2">
                                    <button onClick={() => handleOpenModal(subjName)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(subjName)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                  </td>
                               )}
                             </tr>
                             {electivesList.map(am => {
                               const teacherStr = (subj.electives?.[am]?.teacher || '').trim();
                               if (!teacherStr) return null;
                               const teacherIdStr = subj.electives?.[am]?.teacherId;
                               return (
                               <tr key={am} className="bg-white">
                                 <td className="px-6 py-3 border-l-4 border-emerald-100"></td>
                                 <td className="px-6 py-3 font-medium text-slate-700 flex items-center gap-2">
                                    {am}
                                 </td>
                                 <td className="px-6 py-3"><span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold">{subj.sessions} sess.</span></td>
                                 <td className="px-6 py-3 font-medium text-slate-900">{teacherStr} {teacherIdStr && <span className="text-slate-400 ml-1 text-xs">({teacherIdStr})</span>}</td>
                                 {canEditSelectedGrade && <td className="px-6 py-3 border-r border-transparent"></td>}
                               </tr>
                               )
                             })}
                          </React.Fragment>
                        );
                      } else {
                        return (
                          <tr key={subjName} className="hover:bg-slate-50 transition-colors bg-white">
                            <td className="px-6 py-4 text-slate-400 text-xs">{idx + 1}</td>
                            <td className="px-6 py-4 font-medium text-slate-900">{subjName}</td>
                            <td className="px-6 py-4">
                              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold">{subj.sessions} sess.</span>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">
                               {subj.teacher || <span className="text-slate-400 italic">Unassigned</span>}
                               {subj.teacherId && subj.teacherId !== "TCH-000" && <span className="text-slate-400 ml-1 text-xs">({subj.teacherId})</span>}
                            </td>
                            {canEditSelectedGrade && (
                                <td className="px-6 py-4 flex items-center justify-end gap-2">
                                  <button onClick={() => handleOpenModal(subjName)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                  <button onClick={() => handleDelete(subjName)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                </td>
                            )}
                          </tr>
                        );
                      }
                    })}
                    <tr className={`font-bold ${totalSessions > MAX_CLASS_SESSIONS ? 'bg-rose-50 text-rose-900' : totalSessions < MAX_CLASS_SESSIONS ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-900'}`}>
                      <td colSpan={2} className="px-6 py-4 text-right uppercase text-[10px] tracking-widest text-slate-500">Total Sessions</td>
                      <td colSpan={canEditSelectedGrade ? 3 : 2} className="px-6 py-4">{totalSessions} / {MAX_CLASS_SESSIONS}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 opacity-60">
             <div className="text-4xl mb-3 text-slate-300">📋</div>
             <h3 className="font-medium text-slate-900">Select a grade and class above</h3>
          </div>
        )}
        </div>
      </div>

      {isModalOpen && canEditSelectedGrade && (
        <div className="fixed inset-0 bg-slate-900/40 z-[200] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">{editingSubject ? `Edit ${editingSubjectName}` : 'Add Subject'}</h3>
            
            {!editingSubject && (
              <div className="flex flex-col gap-2 mb-6">
                 <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${isFL ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                   <input type="radio" checked={isFL} onChange={() => { setIsFL(true); setIsArtMusic(false); }} className="w-4 h-4 text-indigo-600 focus:ring-indigo-600" />
                   <Globe2 className={isFL ? "text-indigo-600" : "text-slate-400"} size={18} />
                   <span className={`font-medium text-sm ${isFL ? 'text-indigo-900' : 'text-slate-700'}`}>Foreign Languages (FL) block</span>
                 </label>
                 {showArtMusicOption && (
                   <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${isArtMusic ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                     <input type="radio" checked={isArtMusic} onChange={() => { setIsFL(false); setIsArtMusic(true); setIsElective(false); }} className="w-4 h-4 text-amber-600 focus:ring-amber-600" />
                     <Palette className={isArtMusic ? "text-amber-600" : "text-slate-400"} size={18} />
                     <span className={`font-medium text-sm ${isArtMusic ? 'text-amber-900' : 'text-slate-700'}`}>Art & Music (Parallel) block</span>
                   </label>
                 )}
                 <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${isElective ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                   <input type="radio" checked={isElective} onChange={() => { setIsFL(false); setIsArtMusic(false); setIsElective(true); }} className="w-4 h-4 text-emerald-600 focus:ring-emerald-600" />
                   <Shuffle className={isElective ? "text-emerald-600" : "text-slate-400"} size={18} />
                   <span className={`font-medium text-sm ${isElective ? 'text-emerald-900' : 'text-slate-700'}`}>Custom Electives (Parallel) block</span>
                 </label>
                 <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${!isFL && !isArtMusic && !isElective ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                   <input type="radio" checked={!isFL && !isArtMusic && !isElective} onChange={() => { setIsFL(false); setIsArtMusic(false); setIsElective(false); }} className="w-4 h-4 text-slate-600 focus:ring-slate-600" />
                   <div className="w-[18px]"></div>
                   <span className={`font-medium text-sm ${!isFL && !isArtMusic && !isElective ? 'text-slate-900' : 'text-slate-700'}`}>Standard Subject</span>
                 </label>
              </div>
            )}

            {isFL ? (
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Shared Sessions/Week</label>
                    <input type="number" min="1" max={MAX_CLASS_SESSIONS} value={sessions} onChange={e => setSessions(parseInt(e.target.value) || 0)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm" />
                 </div>
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assign Language Teachers</div>
                   {FL_LANGUAGES.map(lang => (
                     <div key={lang} className="flex items-center gap-3">
                       <span className="text-lg">{FL_FLAGS[lang]}</span>
                       <span className="text-sm font-medium w-16 text-slate-700">{lang}</span>
                       <input 
                        type="text" 
                        list={`teachers-list-FL-${lang}`}
                        placeholder="Teacher name" 
                        value={flTeachers[lang] || ''} 
                        onChange={e => setFlTeachers(prev => ({ ...prev, [lang]: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                       />
                       <datalist id={`teachers-list-FL-${lang}`}>
                         {getFilteredTeachers(lang).map(t => <option key={t} value={t} />)}
                       </datalist>
                     </div>
                   ))}
                 </div>
              </div>
            ) : isArtMusic ? (
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Shared Sessions/Week</label>
                    <input type="number" min="1" max={MAX_CLASS_SESSIONS} value={sessions} onChange={e => setSessions(parseInt(e.target.value) || 0)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm" />
                 </div>
                 <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-4">
                   <div className="text-xs font-bold text-amber-600 uppercase tracking-widest">Assign Art/Music Teachers</div>
                   {ART_MUSIC_SUBJECTS.map(am => (
                     <div key={am} className="flex items-center gap-3">
                       <span className="text-sm font-medium w-16 text-slate-700">{am}</span>
                       <input 
                        type="text" 
                        list={`teachers-list-AM-${am}`}
                        placeholder="Teacher name" 
                        value={amTeachers[am] || ''} 
                        onChange={e => setAmTeachers(prev => ({ ...prev, [am]: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                       />
                       <datalist id={`teachers-list-AM-${am}`}>
                         {getFilteredTeachers(am).map(t => <option key={t} value={t} />)}
                       </datalist>
                     </div>
                   ))}
                 </div>
              </div>
            ) : isElective ? (
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Block Name (e.g. Science Electives)</label>
                    <input type="text" list="subjects-list" value={subjectName} disabled={!!editingSubject} onChange={e => setSubjectName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm disabled:bg-slate-50 disabled:text-slate-500" placeholder="Electives" />
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Shared Sessions/Week</label>
                    <input type="number" min="1" max={MAX_CLASS_SESSIONS} value={sessions} onChange={e => setSessions(parseInt(e.target.value) || 0)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm" />
                 </div>
                 <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Assign Elective Options</div>
                      <button onClick={() => setElectiveOptions([...electiveOptions, {name: '', teacher: ''}])} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded text-xs font-bold transition-colors">+ Add Option</button>
                   </div>
                   {electiveOptions.map((eo, idx) => (
                     <div key={idx} className="flex items-center gap-2">
                       <input 
                        type="text" 
                        list="subjects-list"
                        placeholder="Elective Name" 
                        value={eo.name} 
                        onChange={e => {
                          const n = [...electiveOptions];
                          n[idx].name = e.target.value;
                          setElectiveOptions(n);
                        }}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900"
                       />
                       <input 
                        type="text" 
                        list={`teachers-list-EO-${idx}`}
                        placeholder="Teacher name" 
                        value={eo.teacher} 
                        onChange={e => {
                          const n = [...electiveOptions];
                          n[idx].teacher = e.target.value;
                          setElectiveOptions(n);
                        }}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900"
                       />
                       <datalist id={`teachers-list-EO-${idx}`}>
                         {getFilteredTeachers(eo.name).map(t => <option key={t} value={t} />)}
                       </datalist>
                       {electiveOptions.length > 1 && (
                         <button onClick={() => {
                           const n = [...electiveOptions];
                           n.splice(idx, 1);
                           setElectiveOptions(n);
                         }} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded transition-colors"><Trash2 size={14}/></button>
                       )}
                     </div>
                   ))}
                 </div>
              </div>
            ) : (
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject Name</label>
                    <input type="text" list="subjects-list" value={subjectName} disabled={!!editingSubject} onChange={e => setSubjectName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm disabled:bg-slate-50 disabled:text-slate-500" />
                 </div>
                 <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sessions/Week</label>
                      <input type="number" min="1" max={MAX_CLASS_SESSIONS} value={sessions} onChange={e => setSessions(parseInt(e.target.value) || 0)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teacher</label>
                      <input type="text" list="teachers-list-standard" value={teacher} onChange={e => setTeacher(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm" />
                      <datalist id="teachers-list-standard">
                        {getFilteredTeachers(subjectName).map(t => <option key={t} value={t} />)}
                      </datalist>
                    </div>
                 </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 border border-transparent font-medium transition-colors text-sm">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm shadow-indigo-200 transition-colors text-sm">Save Subject</button>
            </div>
          </div>
        </div>
      )}
      
      {uniqueSubjectNames.length > 0 && (
        <datalist id="subjects-list">
          {uniqueSubjectNames.map(s => <option key={s} value={s} />)}
        </datalist>
      )}
    </div>
  );
}

