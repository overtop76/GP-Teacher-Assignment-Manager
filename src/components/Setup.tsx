import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/authStore';
import { GRADE_LABELS } from '@/lib/types';
import { Save, Trash2, Plus, Building, CopyCheck, Download, Upload, Edit2, Check, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDocs, collection, setDoc } from 'firebase/firestore';

export default function Setup() {
  const { data, getClassesForGrade, setClassesForGrade, clearClassesForGrade, importSchoolData, patchSchoolData, renameGrade, renameClass, updateSettings } = useAppStore();
  const gradesList = data?.gradesOrder || GRADE_LABELS;
  const { currentUser, setActiveSchoolId, activeSchoolId, createSchool, updateSchool, systemData } = useAuthStore();
  const [sName, setSName] = useState(data?.schoolName || '');
  const [activeGrade, setActiveGrade] = useState(gradesList[0] || 'K1');
  
  const [maxTeacherLoad, setMaxTeacherLoad] = useState(data?.settings?.maxTeacherLoad?.toString() || '24');
  const [maxHoDLoad, setMaxHoDLoad] = useState(data?.settings?.maxHoDLoad?.toString() || '18');

  const classesText = activeSchoolId ? getClassesForGrade(activeGrade).join(', ') : '';
  const [classListInput, setClassListInput] = useState(classesText);
  const [isCreatingNewSchool, setIsCreatingNewSchool] = useState(!activeSchoolId);
  
  const [editingGrade, setEditingGrade] = useState<{old: string, newName: string} | null>(null);
  const [editingClass, setEditingClass] = useState<{old: string, newName: string} | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('whole_system');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isCreatingNewSchool) {
        setSName(data?.schoolName || '');
        setClassListInput(activeSchoolId ? getClassesForGrade(activeGrade).join(', ') : '');
    }
  }, [data?.schoolName, activeGrade, isCreatingNewSchool, activeSchoolId]);

  const handleGradeChange = (g: string) => {
    setActiveGrade(g);
    setClassListInput(activeSchoolId ? getClassesForGrade(g).join(', ') : '');
  };

  const saveSchool = () => {
    if (!sName.trim()) {
        toast.error('School name is required');
        return;
    }
    if (isCreatingNewSchool) {
        const newId = createSchool(sName);
        setActiveSchoolId(newId);
        setIsCreatingNewSchool(false);
        toast.success('New school created!');
    } else if (activeSchoolId) {
        updateSchool(activeSchoolId, sName);
        toast.success('School profile updated!');
    }
  };

  const saveClasses = () => {
    if (!activeSchoolId) {
        toast.error('Please create/select a school first.');
        return;
    }
    const arr = classListInput.split(',').map(s => s.trim()).filter(Boolean);
    if (!arr.length) {
      toast.error('Enter at least one class section.');
      return;
    }
    setClassesForGrade(activeGrade, arr);
    toast.success(`Classes for Grade ${activeGrade} saved!`);
  };

  const clearClasses = () => {
    if (confirm(`Are you sure you want to delete ALL classes & assignments for Grade ${activeGrade}?`)) {
      clearClassesForGrade(activeGrade);
      setClassListInput('');
      toast.success('Classes cleared.');
    }
  };

  const handleRenameGrade = () => {
    if (editingGrade && editingGrade.newName.trim() && editingGrade.newName.trim() !== editingGrade.old) {
      renameGrade(editingGrade.old, editingGrade.newName.trim());
      setActiveGrade(editingGrade.newName.trim());
      setEditingGrade(null);
      toast.success('Grade renamed successfully!');
    } else {
      setEditingGrade(null);
    }
  };

  const handleRenameClass = () => {
    if (editingClass && editingClass.newName.trim() && editingClass.newName.trim() !== editingClass.old) {
      renameClass(activeGrade, editingClass.old, editingClass.newName.trim());
      // Re-fetch classes input to reflect changes if necessary
      const newClasses = getClassesForGrade(activeGrade).map(c => c === editingClass.old ? editingClass.newName.trim() : c);
      setClassListInput(newClasses.join(', '));
      setEditingClass(null);
      toast.success('Section renamed successfully!');
    } else {
      setEditingClass(null);
    }
  };

  const applyToAllGrades = () => {
    if (!activeSchoolId) {
        toast.error('Please create/select a school first.');
        return;
    }
    const arr = classListInput.split(',').map(s => s.trim()).filter(Boolean);
    if (!arr.length) {
      toast.error('Enter at least one class section.');
      return;
    }
    if (confirm(`Are you sure you want to apply sections [${arr.join(', ')}] to EVERY grade level?`)) {
        gradesList.forEach(g => setClassesForGrade(g, arr));
        toast.success(`Sections applied to all grades!`);
    }
  };

  const performExport = async () => {
    setIsExporting(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const username = currentUser?.username?.replace(/\s+/g, '_') || 'Auto';
      let exportObj: any = { version: "1.0", exportedBy: username, date };
      let filenamePrefix = '';

      if (exportType === 'whole_system') {
        filenamePrefix = 'WholeSystem';
        exportObj.type = 'whole_system';
        const schoolsSnap = await getDocs(collection(db, 'schoolsData'));
        const sData: Record<string, any> = {};
        schoolsSnap.forEach(docSnap => {
           sData[docSnap.id] = docSnap.data();
        });
        exportObj.schoolsData = sData;
        exportObj.systemData = systemData;
      } else if (exportType === 'current_school') {
        filenamePrefix = `School_${sName.replace(/\s+/g, '')}`;
        exportObj.type = 'current_school';
        exportObj.appData = data;
      } else if (exportType === 'teacher_assignments') {
        filenamePrefix = `Teachers_${sName.replace(/\s+/g, '')}`;
        exportObj.type = 'teacher_assignments';
        exportObj.payload = {
           teachers: data.teachers,
           teacherProfiles: data.teacherProfiles
        };
      } else if (exportType === 'classes_sections') {
        filenamePrefix = `Classes_${sName.replace(/\s+/g, '')}`;
        exportObj.type = 'classes_sections';
        exportObj.payload = {
           gradeLevels: data.gradeLevels,
           gradesOrder: data.gradesOrder
        };
      }

      const jsonStr = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Edudash_${filenamePrefix}_${date}_${username}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Backup exported successfully');
      setShowExportModal(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to export data');
    }
    setIsExporting(false);
  };

  const handleExportDataClick = () => {
    if (!activeSchoolId) {
        toast.error('Select a school first.');
        return;
    }
    setShowExportModal(true);
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
        const str = evt.target?.result as string;
        if (str) {
            try {
               const parsed = JSON.parse(str);
               if (parsed.type === 'whole_system' && parsed.schoolsData && parsed.systemData) {
                  if (!confirm('This will OVERWRITE the entire system (all schools, users). Are you sure?')) return;
                  await setDoc(doc(db, 'systemData', 'global'), parsed.systemData);
                  for (const [sId, sData] of Object.entries(parsed.schoolsData)) {
                     await setDoc(doc(db, 'schoolsData', sId), sData);
                  }
                  toast.success('Whole system restored! Please refresh.');
                  setTimeout(() => window.location.reload(), 1500);
               } else if (parsed.type === 'current_school' && parsed.appData) {
                  if (!confirm(`Restore full data for current school (${sName})?`)) return;
                  const success = importSchoolData(JSON.stringify(parsed.appData));
                  if (success) toast.success('School data restored!');
                  else toast.error('Failed to apply school data');
               } else if (parsed.type === 'teacher_assignments' && parsed.payload) {
                  if (!confirm('Restore teacher profiles and lists for current school?')) return;
                  patchSchoolData({ teachers: parsed.payload.teachers || {}, teacherProfiles: parsed.payload.teacherProfiles || {} });
                  toast.success('Teacher assignments restored!');
               } else if (parsed.type === 'classes_sections' && parsed.payload) {
                  if (!confirm('Restore classes and sections for current school?')) return;
                  patchSchoolData({ gradeLevels: parsed.payload.gradeLevels || {}, gradesOrder: parsed.payload.gradesOrder || GRADE_LABELS });
                  toast.success('Classes and sections restored!');
               } else if (parsed.gradeLevels) {
                  // Legacy support
                  const success = importSchoolData(str);
                  if (success) toast.success('School data imported successfully!');
               } else {
                  toast.error('Unknown backup format');
               }
            } catch (e) {
               console.error(e);
               toast.error('Invalid JSON file format.');
            }
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  if (!currentUser?.permissions.isAdmin) {
      return (
          <div className="p-8 text-center text-slate-500">
              <Building className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h2 className="text-xl font-bold text-slate-700">Access Denied</h2>
              <p>You do not have permission to modify school configuration.</p>
          </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in fade-in">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">School Configuration</h1>
          <p className="text-slate-500 text-sm mt-1">Manage school profiles and structure.</p>
        </div>
        {!isCreatingNewSchool && (
            <button 
               onClick={() => { setIsCreatingNewSchool(true); setSName(''); }}
               className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
               <Plus className="w-4 h-4" /> Create Another School
            </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
           {isCreatingNewSchool ? 'Create New School' : 'Edit School Name'}
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">School Name</label>
            <input 
              type="text" 
              value={sName}
              onChange={(e) => setSName(e.target.value)}
              placeholder="e.g., Global Paradigm Academy"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors text-slate-900"
            />
          </div>
          <button 
            onClick={saveSchool}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-md shadow-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          >
            <Save className="w-4 h-4" /> {isCreatingNewSchool ? 'Create School' : 'Update Name'}
          </button>
        </div>
      </div>

      {!isCreatingNewSchool && activeSchoolId && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-bottom-4 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">School Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5">Default Max Teacher Load</label>
                 <input 
                   type="number" 
                   value={maxTeacherLoad}
                   onChange={(e) => {
                     setMaxTeacherLoad(e.target.value);
                     updateSettings({ maxTeacherLoad: parseInt(e.target.value) || 24, maxHoDLoad: parseInt(maxHoDLoad) || 18 });
                   }}
                   className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors text-slate-900"
                 />
                 <p className="text-xs text-slate-500 mt-1">Target workload limit for regular teachers.</p>
               </div>
               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5">Default Max HoD Load</label>
                 <input 
                   type="number" 
                   value={maxHoDLoad}
                   onChange={(e) => {
                     setMaxHoDLoad(e.target.value);
                     updateSettings({ maxTeacherLoad: parseInt(maxTeacherLoad) || 24, maxHoDLoad: parseInt(e.target.value) || 18 });
                   }}
                   className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors text-slate-900"
                 />
                 <p className="text-xs text-slate-500 mt-1">Target workload limit for Heads of Department.</p>
               </div>
            </div>
          </div>
      )}

      {!isCreatingNewSchool && activeSchoolId && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-bottom-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Grade Levels & Sections</h3>
            <p className="text-sm text-slate-500 mb-6">Define class sections (e.g., A, B, C) for each grade in {sName}.</p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {gradesList.map(g => (
                <button
                  key={g}
                  onClick={() => handleGradeChange(g)}
                  className={`px-4 py-2 rounded-lg font-semibold text-xs transition-colors border ${
                    activeGrade === g 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Grade {g}
                </button>
              ))}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
              <div className="mb-4 flex items-center gap-3">
                {editingGrade?.old === activeGrade ? (
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 text-lg">Grade</strong>
                    <input 
                      type="text" 
                      value={editingGrade.newName}
                      onChange={e => setEditingGrade({ ...editingGrade, newName: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && handleRenameGrade()}
                      className="px-2 py-1 border border-slate-300 rounded text-sm w-32 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      autoFocus
                    />
                    <button onClick={handleRenameGrade} className="text-emerald-600 hover:text-emerald-700 p-1">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditingGrade(null)} className="text-red-500 hover:text-red-600 p-1">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <strong className="text-slate-900 text-lg">Grade {activeGrade}</strong>
                    <button onClick={() => setEditingGrade({ old: activeGrade, newName: activeGrade })} className="text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Rename Grade">
                       <Edit2 size={16} />
                    </button>
                  </>
                )}
              </div>
              
              <div className="mb-6 flex flex-wrap gap-2">
                {getClassesForGrade(activeGrade).map(c => (
                  <div key={c} className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700">
                     {editingClass?.old === c ? (
                       <div className="flex items-center gap-1">
                         <span>Class</span>
                         <input 
                            type="text" 
                            value={editingClass.newName}
                            onChange={e => setEditingClass({ ...editingClass, newName: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleRenameClass()}
                            className="px-1.5 py-0.5 border border-slate-300 rounded text-sm w-16 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            autoFocus
                         />
                         <button onClick={handleRenameClass} className="text-emerald-600 hover:text-emerald-700 p-[1px]">
                           <Check size={14} />
                         </button>
                         <button onClick={() => setEditingClass(null)} className="text-red-500 hover:text-red-600 p-[1px]">
                           <X size={14} />
                         </button>
                       </div>
                     ) : (
                       <>
                         Class {c}
                         <button onClick={() => setEditingClass({ old: c, newName: c })} className="ml-1 text-slate-400 hover:text-indigo-600 transition-colors p-0.5" title="Rename Class">
                            <Edit2 size={14} />
                         </button>
                       </>
                     )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-[3] w-full">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Add or Overwrite Class Sections (comma-separated)</label>
                  <input 
                    type="text" 
                    value={classListInput}
                    onChange={e => setClassListInput(e.target.value)}
                    placeholder="A, B, C"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors text-slate-900"
                  />
                </div>
                <div className="flex gap-2 flex-[2] w-full mt-4 sm:mt-0">
                  <button 
                    onClick={saveClasses}
                    className="flex-1 bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Save
                  </button>
                  <button 
                    onClick={applyToAllGrades}
                    className="flex-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-lg font-medium shadow-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                    title="Apply these sections to EVERY grade level"
                  >
                    <CopyCheck className="w-4 h-4" /> Apply All
                  </button>
                  {getClassesForGrade(activeGrade).length > 0 && (
                    <button 
                      onClick={clearClasses}
                      className="flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 font-medium rounded-lg transition-colors"
                      title="Clear Classes"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      {!isCreatingNewSchool && activeSchoolId && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-bottom-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Data Management</h3>
            <p className="text-sm text-slate-500 mb-6">Backup or restore configuration for {sName}.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleExportDataClick}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors w-full sm:w-auto"
              >
                <Download className="w-4 h-4" /> Export School JSON
              </button>
              <label className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 font-medium rounded-lg transition-colors cursor-pointer w-full sm:w-auto">
                <Upload className="w-4 h-4" /> Import School JSON
                <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
              </label>
            </div>
          </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">Export Backup</h3>
              <button onClick={() => setShowExportModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Data to Export</label>
              <select 
                value={exportType}
                onChange={e => setExportType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mb-4"
              >
                <option value="whole_system">Whole System (All Schools & Config)</option>
                <option value="current_school">Full Current School Backup</option>
                <option value="teacher_assignments">Teacher Assignments Only</option>
                <option value="classes_sections">Classes & Sections Only</option>
              </select>
              <p className="text-xs text-slate-500 italic">
                Filename will automatically include the chosen export type, the current date, and your username.
              </p>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowExportModal(false)} 
                className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isExporting}
              >
                Cancel
              </button>
              <button 
                onClick={performExport} 
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {isExporting ? 'Exporting...' : 'Download JSON'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
