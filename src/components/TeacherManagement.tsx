import React, { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/authStore';
import { BadgeCheck, GraduationCap, X, Check, Edit2, FileDown, FileUp, FileJson, FileText, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { GRADE_LABELS } from '@/lib/types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TeacherManagement() {
  const { data, setTeacherProfile, renameTeacher, addTeacher, setSubjectForGradeClass } = useAppStore();
  const { currentUser } = useAuthStore();
  const [filterTeacherName, setFilterTeacherName] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'hod', 'only_teacher'
  const [editingHod, setEditingHod] = useState<string | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const gradesList = data.gradesOrder || GRADE_LABELS;
  
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
    hodSubjects: string[],
    hodGrades: string[],
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
      hodSubjects: data.teacherProfiles?.[tId]?.hodSubjects || [],
      hodGrades: data.teacherProfiles?.[tId]?.hodGrades || [],
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
  
  if (filterTeacherName) {
    filteredTeachers = filteredTeachers.filter(t => t.name.toLowerCase().includes(filterTeacherName.toLowerCase()));
  }
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    const exportData = filteredTeachers.map(t => ({
      'Teacher Name': t.name,
      'Role': t.isHoD ? 'Head of Department' : 'Teacher',
      'HoD Subjects': t.isHoD ? (t.hodSubjects.length ? t.hodSubjects.join(', ') : 'All') : 'N/A',
      'HoD Grades': t.isHoD ? (t.hodGrades.length ? t.hodGrades.join(', ') : 'All') : 'N/A',
      'Total Sessions': t.sessions,
      'Subjects Taught': Array.from(t.subjects).join(', ') || 'Unassigned',
      'Classes Taught': Array.from(t.classes).join(', ') || 'None',
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers");
    XLSX.writeFile(wb, `Teachers_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Exported to Excel');
  };

  const handleExportJSON = () => {
    const exportData = filteredTeachers.map(t => ({
      id: t.id,
      name: t.name,
      isHoD: t.isHoD,
      hodSubjects: t.hodSubjects,
      hodGrades: t.hodGrades,
    }));
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `teachers_export.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('JSON Exported');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          let updatedCount = 0;
          json.forEach(t => {
            if (t.id && typeof t.isHoD === 'boolean') {
              setTeacherProfile(t.id, {
                isHoD: t.isHoD,
                hodSubjects: t.hodSubjects || [],
                hodGrades: t.hodGrades || [],
              });
              updatedCount++;
            }
          });
          toast.success(`Updated ${updatedCount} teacher profiles`);
        } else {
          toast.error('Invalid JSON format');
        }
      } catch (err) {
        toast.error('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Teacher Management Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
    
    const tableData = filteredTeachers.map(t => [
      t.name,
      t.isHoD ? `HoD\nSubj: ${t.hodSubjects.length ? t.hodSubjects.join(', ') : 'All'}\nGrds: ${t.hodGrades.length ? t.hodGrades.join(', ') : 'All'}` : 'Teacher',
      t.sessions.toString(),
      Array.from(t.subjects).join(', ') || 'Unassigned',
      Array.from(t.classes).join(', ') || 'None'
    ]);
    
    autoTable(doc, {
      startY: 30,
      head: [['Teacher Name', 'Role & Scope', 'Sessions', 'Subjects Taught', 'Classes (Sections) Taught']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 63, 70] },
    });
    
    doc.save(`Teachers_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success('PDF Exported');
  };

  const toggleHoD = (teacherId: string, currentVal: boolean) => {
    setTeacherProfile(teacherId, { isHoD: !currentVal });
    if (!currentVal) {
      toast.success('Marked as Head of Department');
      setEditingHod(teacherId);
    } else {
      toast.success('Removed Head of Department role');
      if (editingHod === teacherId) setEditingHod(null);
    }
  };

  const HodEditor = ({ t }: { t: any }) => {
    const [subjs, setSubjs] = useState<string[]>(t.hodSubjects || []);
    const [grds, setGrds] = useState<string[]>(t.hodGrades || []);

    const toggleSubject = (s: string) => setSubjs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    const toggleGrade = (g: string) => setGrds(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

    return (
      <div className="bg-amber-50 rounded-md p-3 border border-amber-200 mt-2 text-xs w-[250px] shadow-sm">
        <div className="font-semibold text-amber-900 mb-2">Configure HoD Roles</div>
        
        <div className="mb-3">
          <div className="text-amber-700/80 mb-1 font-medium flex justify-between">
            <span>Subjects</span>
            <span className="text-[10px] italic">{subjs.length === 0 ? 'All' : `${subjs.length} selected`}</span>
          </div>
          <div className="max-h-[150px] overflow-y-auto flex flex-wrap gap-1 p-1 bg-white/50 rounded border border-amber-100">
            {uniqueSubjectNames.length === 0 && <span className="text-amber-500 p-1">No subjects found</span>}
            {uniqueSubjectNames.map(s => (
              <label key={s} className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-amber-200 cursor-pointer hover:bg-amber-50">
                <input type="checkbox" checked={subjs.includes(s)} onChange={() => toggleSubject(s)} className="w-3 h-3 text-amber-600 rounded-sm focus:ring-amber-500 border-amber-300" />
                <span className="text-amber-900">{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-amber-700/80 mb-1 font-medium flex justify-between">
            <span>Grades</span>
            <span className="text-[10px] italic">{grds.length === 0 ? 'All' : `${grds.length} selected`}</span>
          </div>
          <div className="max-h-[150px] overflow-y-auto flex flex-wrap gap-1 p-1 bg-white/50 rounded border border-amber-100">
            {gradesList.map(g => (
              <label key={g} className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-amber-200 cursor-pointer hover:bg-amber-50">
                <input type="checkbox" checked={grds.includes(g)} onChange={() => toggleGrade(g)} className="w-3 h-3 text-amber-600 rounded-sm focus:ring-amber-500 border-amber-300" />
                <span className="text-amber-900">{g}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button onClick={() => setEditingHod(null)} className="px-2 py-1 text-amber-600 hover:text-amber-800 transition-colors">Cancel</button>
          <button 
            onClick={() => {
              setTeacherProfile(t.id, { hodSubjects: subjs, hodGrades: grds });
              setEditingHod(null);
              toast.success('HoD details saved');
            }} 
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    );
  };

  const AddTeacherModal = () => {
    const [name, setName] = useState('');
    const [grade, setGrade] = useState('');
    const [cls, setCls] = useState('');
    const [subject, setSubject] = useState('');
    const [sessions, setSessions] = useState(1);

    const availableClasses = grade ? Object.keys(data.gradeLevels[grade]?.classes || {}).sort((a,b)=>a.localeCompare(b)) : [];
    
    const handleSave = () => {
      const tName = name.trim();
      if (!tName) return toast.error('Teacher name is required');
      addTeacher(tName);
      let assigned = false;
      if (grade && cls && subject && sessions > 0) {
         setSubjectForGradeClass(grade, cls, subject.trim(), sessions, tName, undefined);
         assigned = true;
      }
      toast.success(assigned ? 'Teacher added and assigned!' : 'Teacher added successfully!');
      setShowAddModal(false);
    };

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Add New Teacher</h3>
            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4 bg-slate-50">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teacher Name <span className="text-red-500">*</span></label>
              <input type="text" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            
            <div className="pt-4 border-t border-slate-200">
               <h4 className="text-sm font-bold text-slate-800 mb-3">Quick Assignment (Optional)</h4>
               <div className="grid grid-cols-2 gap-3 mb-3">
                 <div>
                   <label className="block text-xs font-semibold text-slate-700 mb-1">Grade</label>
                   <select value={grade} onChange={e => { setGrade(e.target.value); setCls(''); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20">
                     <option value="">-- Select --</option>
                     {gradesList.map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-slate-700 mb-1">Class / Section</label>
                   <select value={cls} onChange={e => setCls(e.target.value)} disabled={!grade} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 text-slate-900">
                     <option value="">-- Select --</option>
                     {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                   <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Math" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20" />
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-slate-700 mb-1">Sessions per week</label>
                   <input type="number" min="1" max="20" value={sessions} onChange={e => setSessions(parseInt(e.target.value)||1)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20" />
                 </div>
               </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm">Save Teacher</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {showAddModal && <AddTeacherModal />}
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Teacher Management</h2>
            <p className="text-sm text-slate-500 mt-1">Manage teacher roles and view subject assignments.</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <UserPlus size={14} /> Add Teacher
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
              <FileDown size={14} /> Excel
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors">
              <FileText size={14} /> PDF
            </button>
            <button onClick={handleExportJSON} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
              <FileJson size={14} /> Export JSON
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
              <FileUp size={14} /> Import JSON
            </button>
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportJSON} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 w-full">
          <input 
            type="text" 
            placeholder="Search Teacher..." 
            value={filterTeacherName}
            onChange={e => setFilterTeacherName(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20"
          />
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
              <th className="p-4">Classes / Sections</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTeachers.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-medium text-slate-900">
                  {editingTeacherId === t.id ? (
                     <div className="flex items-center gap-2">
                       <input autoFocus value={editTeacherName} onChange={e => setEditTeacherName(e.target.value)} className="px-2 py-1 border border-slate-300 rounded text-sm w-32 focus:ring-2 focus:ring-indigo-500/20" />
                       <button onClick={() => { renameTeacher(t.name, editTeacherName); setEditingTeacherId(null); toast.success('Teacher renamed!'); }} className="p-1 text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100"><Check size={14}/></button>
                       <button onClick={() => setEditingTeacherId(null)} className="p-1 text-slate-400 bg-slate-100 rounded hover:bg-slate-200"><X size={14}/></button>
                     </div>
                  ) : (
                     <div className="flex items-center gap-2 group">
                       <span>{t.name}</span>
                       {canEdit && (
                         <button onClick={() => { setEditingTeacherId(t.id); setEditTeacherName(t.name); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-all"><Edit2 size={12} /></button>
                       )}
                     </div>
                  )}
                </td>
                <td className="p-4 align-top">
                  <div className="flex flex-col items-start gap-2">
                    <button 
                      onClick={() => toggleHoD(t.id, t.isHoD)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${t.isHoD ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {t.isHoD ? <BadgeCheck size={14} /> : <GraduationCap size={14} />}
                      {t.isHoD ? 'HoD' : 'Teacher'}
                    </button>
                    {t.isHoD && (
                      <div className="w-full relative">
                        {editingHod === t.id ? (
                           <HodEditor t={t} />
                        ) : (
                           <div className="bg-amber-50 rounded-md p-2 border border-amber-100 text-xs text-amber-800 w-full min-w-[150px] shadow-sm">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold">HoD Scope</span>
                                <button onClick={() => setEditingHod(t.id)} className="text-amber-600 hover:text-amber-800 p-0.5"><Edit2 size={12} /></button>
                              </div>
                              <div className="mb-0.5">
                                 <span className="font-medium text-amber-700/70">Subjects: </span>
                                 <span className="text-[10px]">{t.hodSubjects?.length > 0 ? t.hodSubjects.join(', ') : 'All Subjects'}</span>
                              </div>
                              <div>
                                 <span className="font-medium text-amber-700/70">Grades: </span>
                                 <span className="text-[10px]">{t.hodGrades?.length > 0 ? t.hodGrades.join(', ') : 'All Grades'}</span>
                              </div>
                           </div>
                        )}
                      </div>
                    )}
                  </div>
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
                    {Array.from(t.classes).map(c => (
                      <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                        {c}
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
