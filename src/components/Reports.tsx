import { useState, useRef } from 'react';
import React from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/authStore';
import { FL_FLAGS, FL_LANGUAGES, ART_MUSIC_SUBJECTS, GRADE_LABELS, MAX_CLASS_SESSIONS, TEACHER_MIN_SESSIONS, TEACHER_MAX_SESSIONS } from '@/lib/types';
import { Printer, Download, Search, FileJson } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';

export default function Reports() {
  const { data, getClassesForGrade, getTotalSessionsForClass } = useAppStore();
  const { currentUser } = useAuthStore();
  const [reportType, setReportType] = useState('overall');
  const [reportFilter, setReportFilter] = useState('');
  
  const canExport = currentUser?.permissions.isAdmin || currentUser?.permissions.canPrintExport;

  // HTML state for preview
  const [previewHtml, setPreviewHtml] = useState<React.ReactNode>(
    <div className="text-center py-20 opacity-60">
       <div className="text-5xl mb-4 text-slate-300">📄</div>
       <h3 className="font-semibold text-slate-900 text-lg">Generate a Report</h3>
       <p className="text-sm text-slate-500 mt-1">Select options above and click Generate Overview.</p>
    </div>
  );

  const hasNoGradeAccessControl = (!currentUser?.permissions?.canEditGrades?.length && !currentUser?.permissions?.canViewGrades?.length);
  const isAdmin = currentUser?.permissions.isAdmin;
  
  const gradesList = data.gradesOrder || GRADE_LABELS;
  const visibleGrades = gradesList.filter(g => 
      isAdmin || 
      hasNoGradeAccessControl ||
      currentUser?.permissions.canEditGrades?.includes(g) || 
      currentUser?.permissions.canViewGrades?.includes(g)
  );

  const getVisibleClassesForGrade = (g: string) => {
    const classes = getClassesForGrade(g);
    if (isAdmin || hasNoGradeAccessControl) return classes;
    const canViewList = currentUser?.permissions.canViewClasses?.[g] || [];
    const canEditList = currentUser?.permissions.canEditClasses?.[g] || [];
    const hasViewAll = currentUser?.permissions.canViewGrades?.includes(g) && canViewList.length === 0;
    const hasEditAll = currentUser?.permissions.canEditGrades?.includes(g) && canEditList.length === 0;
    if (hasViewAll || hasEditAll) return classes;
    return classes.filter(cls => canViewList.includes(cls) || canEditList.includes(cls));
  };

  const getAllClasses = () => {
    const list: { grade: string, cls: string }[] = [];
    visibleGrades.forEach(g => getVisibleClassesForGrade(g).forEach(cls => list.push({ grade: g, cls })));
    return list;
  };

  const getAllSubjects = () => {
    const set = new Set<string>();
    visibleGrades.forEach(g => getVisibleClassesForGrade(g).forEach(cls => {
      Object.entries(data.gradeLevels[g].classes[cls].subjects || {}).forEach(([subj, d]: [string, any]) => {
        if (d.isFL) {
          set.add('FL — Foreign Languages');
          FL_LANGUAGES.forEach(lang => {
            if ((d.languages?.[lang]?.teacher || '').trim()) {
              set.add(`  ${FL_FLAGS[lang]} ${lang}`);
            }
          });
        } else if (d.isArtMusic) {
          set.add('Art & Music (Parallel)');
          ART_MUSIC_SUBJECTS.forEach(am => {
            if ((d.subSubjects?.[am]?.teacher || '').trim()) {
              set.add(`  🎨 ${am}`);
            }
          });
        } else if (d.isElective) {
          set.add(`🔀 ${subj} (Parallel)`);
          Object.keys(d.electives || {}).forEach(el => {
            if ((d.electives?.[el]?.teacher || '').trim()) {
              set.add(`  ${el}`);
            }
          });
        } else set.add(subj);
      });
    }));
    return Array.from(set).sort();
  };

  const getAllTeachers = () => {
    const set = new Set<string>();
    visibleGrades.forEach(g => getVisibleClassesForGrade(g).forEach(cls => {
      Object.entries(data.gradeLevels[g].classes[cls].subjects || {}).forEach(([subj, d]: [string, any]) => {
        if (d.isFL) {
          FL_LANGUAGES.forEach(l => { if (d.languages?.[l]?.teacher) set.add(d.languages[l].teacher); });
        } else if (d.isArtMusic) {
          ART_MUSIC_SUBJECTS.forEach(am => { if (d.subSubjects?.[am]?.teacher) set.add(d.subSubjects[am].teacher); });
        } else if (d.isElective) {
          Object.values(d.electives || {}).forEach((el: any) => { if (el.teacher) set.add(el.teacher); });
        } else {
          if (d.teacher) set.add(d.teacher);
        }
      });
    }));
    return Array.from(set).sort();
  };

  const getFilteredData = () => {
    const rows: { grade: string, cls: string, subj: string, sessions: number, teacher: string, teacherId?: string, isFLMarker?: boolean, isFLChild?: boolean }[] = [];
    
    visibleGrades.forEach(g => {
      if (reportType === 'grade' && reportFilter && g !== reportFilter) return;
      
      getVisibleClassesForGrade(g).forEach(cls => {
        if (reportType === 'class' && reportFilter && `${g}|${cls}` !== reportFilter) return;
        
        const subjects = data.gradeLevels[g].classes[cls].subjects || {};
        
        Object.entries(subjects).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([subj, d]: [string, any]) => {
          if (d.isFL) {
            const subjLabel = 'FL — Foreign Languages';
            const isSpecificSelected = FL_LANGUAGES.some(l => `  ${FL_FLAGS[l]} ${l}` === reportFilter);
            
            if (reportType === 'subject' && reportFilter && reportFilter !== subjLabel && !isSpecificSelected) return;
            
            // Add header for FL
            if (reportType !== 'teacher' && !isSpecificSelected) {
               rows.push({ grade: g, cls, subj: subjLabel, sessions: d.sessions, teacher: 'Multiple', isFLMarker: true });
            }
            
            FL_LANGUAGES.forEach(lang => {
              const teacher = (d.languages?.[lang]?.teacher || '').trim();
              if (!teacher) return; // Skip if no teacher assigned (meaning not taught in this class)
              if (reportType === 'teacher' && reportFilter && reportFilter !== teacher) return;
              
              const langSubj = `  ${FL_FLAGS[lang]} ${lang}`;
              if (reportType === 'subject' && reportFilter && isSpecificSelected && reportFilter !== langSubj) return;
              
              const teacherId = d.languages[lang].teacherId || 'TCH-XXX';
              rows.push({ grade: g, cls, subj: langSubj, sessions: d.sessions, teacher, teacherId, isFLChild: true });
            });
          } else if (d.isArtMusic) {
            const subjLabel = 'Art & Music (Parallel)';
            const isSpecificSelected = ART_MUSIC_SUBJECTS.some(am => `  🎨 ${am}` === reportFilter);
            
            if (reportType === 'subject' && reportFilter && reportFilter !== subjLabel && !isSpecificSelected) return;
            
            // Add header for Art & Music
            if (reportType !== 'teacher' && !isSpecificSelected) {
               rows.push({ grade: g, cls, subj: subjLabel, sessions: d.sessions, teacher: 'Multiple', isFLMarker: true }); // treat ArtMusic Marker like FLMarker for spanning and bg coloring
            }
            
            ART_MUSIC_SUBJECTS.forEach(am => {
              const teacher = (d.subSubjects?.[am]?.teacher || '').trim();
              if (!teacher) return; // Skip if no teacher assigned
              if (reportType === 'teacher' && reportFilter && reportFilter !== teacher) return;
              
              const amSubj = `  🎨 ${am}`;
              if (reportType === 'subject' && reportFilter && isSpecificSelected && reportFilter !== amSubj) return;
              
              const teacherId = d.subSubjects[am].teacherId || 'TCH-XXX';
              rows.push({ grade: g, cls, subj: amSubj, sessions: d.sessions, teacher, teacherId, isFLChild: true }); // treat ArtMusic child like FLChild for total sums
            });
            } else if (d.isElective) {
            const subjLabel = `🔀 ${subj} (Parallel)`;
            const electivesList = Object.keys(d.electives || {});
            const isSpecificSelected = electivesList.some(el => `  ${el}` === reportFilter);
            
            if (reportType === 'subject' && reportFilter && reportFilter !== subjLabel && !isSpecificSelected) return;
            
            if (reportType !== 'teacher' && !isSpecificSelected) {
               rows.push({ grade: g, cls, subj: subjLabel, sessions: d.sessions, teacher: 'Multiple', isFLMarker: true });
            }
            
            electivesList.forEach(el => {
              const teacher = (d.electives?.[el]?.teacher || '').trim();
              if (!teacher) return;
              if (reportType === 'teacher' && reportFilter && reportFilter !== teacher) return;
              
              const elSubj = `  ${el}`;
              if (reportType === 'subject' && reportFilter && isSpecificSelected && reportFilter !== elSubj) return;
              
              const teacherId = d.electives[el].teacherId || 'TCH-XXX';
              rows.push({ grade: g, cls, subj: elSubj, sessions: d.sessions, teacher, teacherId, isFLChild: true });
            });
          } else {
            if (reportType === 'subject' && reportFilter && reportFilter !== subj) return;
            const teacherTrimmed = (d.teacher || '').trim();
            if (reportType === 'teacher' && reportFilter && reportFilter !== teacherTrimmed) return;
            
            rows.push({ grade: g, cls, subj, sessions: d.sessions, teacher: teacherTrimmed || 'Unassigned', teacherId: teacherTrimmed ? (d.teacherId || 'TCH-XXX') : '' });
          }
        });
      });
    });
    
    return rows;
  };

  const generateReport = () => {
    toast.success('Report overview updated');
    const rows = getFilteredData();
    
    if (rows.length === 0) {
      setPreviewHtml(
        <div className="text-center py-20 opacity-60">
           <div className="text-5xl mb-4 text-amber-300">📭</div>
           <h3 className="font-semibold text-slate-900 text-lg">No Results Found</h3>
           <p className="text-sm text-slate-500 mt-1">Try adjusting your filters.</p>
        </div>
      );
      return;
    }

    const isFlat = reportType === 'subject' || reportType === 'teacher';
    const totalSessions = rows.reduce((acc, r) => {
         if (isFlat && !r.isFLMarker) return acc + (r.sessions || 0);
         return acc + (r.isFLChild ? 0 : (r.sessions || 0));
    }, 0);

    if (reportType === 'overall' || reportType === 'grade' || reportType === 'class') {
       // Grouped by Grade & Class
       const gradesToRender = Array.from(new Set(rows.map(r => r.grade)));
       
       setPreviewHtml(
        <div className="max-w-4xl mx-auto printable-report">
          <div className="border-b-2 border-slate-900 pb-6 mb-8 text-center sm:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
               {reportType === 'overall' ? 'Overall School Report' : reportType === 'grade' ? `Grade ${reportFilter || 'All'} Report` : `Class Report`}
            </h2>
            <p className="text-lg text-slate-600 mt-2 font-medium">{data.schoolName || 'Global Paradigm Academy'}</p>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mt-4">
              <p className="text-xs text-slate-400 tracking-widest uppercase font-bold">Generated: {new Date().toLocaleDateString()}</p>
              <div className="mt-4 sm:mt-0 bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-xl border border-indigo-100 flex flex-col items-center sm:items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Total Sessions</span>
                <span className="text-2xl font-black leading-none">{totalSessions}</span>
              </div>
            </div>
          </div>
          {gradesToRender.map(g => {
            const classesInGrade = Array.from(new Set(rows.filter(r => r.grade === g).map(r => r.cls)));
            return (
              <div key={g} className="mb-10 break-inside-avoid">
                <h3 className="text-xl font-bold text-indigo-700 mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm">G{g}</span>
                  Grade {g}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {classesInGrade.map(cls => {
                  const classRows = rows.filter(r => r.grade === g && r.cls === cls);
                  const totalSess = getTotalSessionsForClass(g, cls);
                  return (
                    <div key={cls} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm break-inside-avoid">
                      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                        <p className="font-bold text-white text-sm">Class {cls}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${totalSess > MAX_CLASS_SESSIONS ? 'bg-rose-500/20 text-rose-300' : totalSess < MAX_CLASS_SESSIONS ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {totalSess} / {MAX_CLASS_SESSIONS} Sess.
                        </span>
                      </div>
                      <table className="w-full text-sm text-left border-collapse">
                         <thead className="bg-white border-b border-slate-200">
                           <tr>
                              <th className="px-4 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Subj</th>
                              <th className="px-4 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-widest text-center">Sess</th>
                              <th className="px-4 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Teacher</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 bg-white">
                           {classRows.map((r, idx) => (
                             <tr key={idx} className={`break-inside-avoid ${r.isFLMarker ? "bg-indigo-50/30" : ""}`}>
                               <td className="px-4 py-2.5 text-slate-700 font-medium truncate max-w-[120px]">{r.subj}</td>
                               <td className="px-4 py-2.5 text-center text-slate-600">{r.sessions > 0 ? <span className="font-bold">{r.sessions}</span> : <span className="text-slate-300 text-xs italic">0</span>}</td>
                               <td className="px-4 py-2.5 text-slate-700 truncate max-w-[150px]">
                                 {r.teacher} {r.teacherId && r.teacherId !== 'TCH-XXX' && <span className="text-xs text-slate-400 ml-1">({r.teacherId})</span>}
                               </td>
                             </tr>
                           ))}
                         </tbody>
                      </table>
                    </div>
                  );
                })}
                </div>
              </div>
            );
          })}
        </div>
      );
    } else if (reportType === 'teacher') {
       // Grouped by Teacher
       const teachersToRender = Array.from(new Set(rows.map(r => r.teacher)));
       setPreviewHtml(
         <div className="max-w-4xl mx-auto printable-report">
           <div className="border-b-2 border-slate-900 pb-6 mb-8 text-center sm:text-left">
             <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
               Teacher Report: {reportFilter || 'All Teachers'}
             </h2>
             <p className="text-lg text-slate-600 mt-2 font-medium">{data.schoolName || 'Global Paradigm Academy'}</p>
             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mt-4">
               <p className="text-xs text-slate-400 tracking-widest uppercase font-bold">Generated: {new Date().toLocaleDateString()}</p>
               <div className="mt-4 sm:mt-0 bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-xl border border-indigo-100 flex flex-col items-center sm:items-end">
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Total Sessions</span>
                 <span className="text-2xl font-black leading-none">{totalSessions}</span>
               </div>
             </div>
           </div>
           
           <div className="grid grid-cols-1 gap-6">
             {teachersToRender.map(t => {
               const teacherRows = rows.filter(r => r.teacher === t);
               const tId = teacherRows.find(r => r.teacherId && r.teacherId !== 'TCH-XXX')?.teacherId;
               const tTotalSessions = teacherRows.reduce((acc, r) => acc + (r.sessions || 0), 0);
               const tProfile = tId ? data.teacherProfiles?.[tId] : null;
               const isHoD = tProfile?.isHoD;
               
               let statusColor = "bg-slate-100 text-slate-600";
               if (tTotalSessions > TEACHER_MAX_SESSIONS) {
                 statusColor = "bg-rose-100 text-rose-700 border border-rose-200";
               } else if (tTotalSessions < TEACHER_MIN_SESSIONS) {
                 statusColor = "bg-amber-100 text-amber-700 border border-amber-200";
               } else {
                 statusColor = "bg-emerald-100 text-emerald-700 border border-emerald-200";
               }

               return (
                 <div key={t} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm break-inside-avoid">
                   <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900">
                     <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-3">
                         <h3 className="font-bold text-white text-lg">{t}</h3>
                         {tId && <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs tracking-wider">{tId}</span>}
                       </div>
                       {isHoD && (
                          <div className="text-amber-400 text-[10px] uppercase tracking-wider font-semibold">
                            Head of Department 
                            <span className="text-amber-200/70 lowercase ml-1">
                              ({tProfile.hodSubjects?.length > 0 ? tProfile.hodSubjects.join(', ') : 'All Subjects'} • {tProfile.hodGrades?.length > 0 ? tProfile.hodGrades.join(', ') : 'All Grades'})
                            </span>
                          </div>
                       )}
                     </div>
                     <div className={`px-3 py-1 rounded-md text-xs font-bold ${statusColor}`}>
                       {tTotalSessions} Sess.
                     </div>
                   </div>
                   <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-white border-b border-slate-200">
                        <tr>
                           <th className="px-6 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Grade</th>
                           <th className="px-6 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Class</th>
                           <th className="px-6 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Subject</th>
                           <th className="px-6 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-widest text-center">Sessions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {teacherRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-6 py-2.5 text-slate-900 font-medium">Gr {r.grade}</td>
                            <td className="px-6 py-2.5 text-slate-600 font-medium">Cls {r.cls}</td>
                            <td className="px-6 py-2.5 text-slate-700 max-w-[200px] truncate">{r.subj}</td>
                            <td className="px-6 py-2.5 text-center text-slate-600 font-bold">{r.sessions}</td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                 </div>
               );
             })}
           </div>
         </div>
       );
    } else {
       // Flat view for Subject
       setPreviewHtml(
         <div className="max-w-4xl mx-auto printable-report">
           <div className="border-b-2 border-slate-900 pb-6 mb-8 text-center sm:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
               Subject Report: {reportFilter || 'All'}
            </h2>
            <p className="text-lg text-slate-600 mt-2 font-medium">{data.schoolName || 'Global Paradigm Academy'}</p>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mt-4">
              <p className="text-xs text-slate-400 tracking-widest uppercase font-bold">Generated: {new Date().toLocaleDateString()}</p>
              <div className="mt-4 sm:mt-0 bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-xl border border-indigo-100 flex flex-col items-center sm:items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Total Sessions</span>
                <span className="text-2xl font-black leading-none">{totalSessions}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                    <th className="px-6 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Grade</th>
                    <th className="px-6 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Class</th>
                    <th className="px-6 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Subject</th>
                    <th className="px-6 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-widest text-center">Sessions</th>
                    <th className="px-6 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-widest">Teacher</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {rows.map((r, idx) => (
                   <tr key={idx} className={`break-inside-avoid ${r.isFLMarker ? "bg-indigo-50/30" : "hover:bg-slate-50"}`}>
                     <td className="px-6 py-3 text-slate-900 font-medium tracking-tight">Gr {r.grade}</td>
                     <td className="px-6 py-3 text-slate-600 font-medium">Cls {r.cls}</td>
                     <td className="px-6 py-3 text-slate-700 flex items-center gap-2">{r.subj}</td>
                     <td className="px-6 py-3 text-center">
                       {r.sessions > 0 ? <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-bold">{r.sessions} sess.</span> : <span className="text-slate-300 text-xs italic">0</span>}
                     </td>
                     <td className="px-6 py-3 text-slate-700 font-medium">
                       {r.teacher} {r.teacherId && r.teacherId !== 'TCH-XXX' && <span className="ml-1 text-slate-400 text-xs font-normal">({r.teacherId})</span>}
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
         </div>
       );
    }
  };

  const handleExport = () => {
    const rows = getFilteredData();
    if (rows.length === 0) {
      toast.error('No data to export.');
      return;
    }

    const MathTrim = (str: string) => str.replace(/[\\/?*[\]:]/g, '').trim().substring(0, 31) || "Sheet";

    const wb = XLSX.utils.book_new();

    const addSheet = (sheetName: string, sheetRows: any[], title: string, sumAllSessions: boolean = false) => {
        if (sheetRows.length === 0) return;
        let validName = MathTrim(sheetName);
        let counter = 1;
        let finalName = validName;
        while (wb.SheetNames.includes(finalName)) {
            const suffix = ` (${counter})`;
            finalName = validName.substring(0, 31 - suffix.length) + suffix;
            counter++;
        }

        const totalSessions = sheetRows.reduce((acc, r) => {
             if (sumAllSessions && !r.isFLMarker) return acc + (r.sessions || 0);
             return acc + (r.isFLChild ? 0 : (r.sessions || 0));
        }, 0);

        const wsData = [
          [`School: ${data.schoolName || 'Unnamed School'}`],
          [title],
          [`Total Sessions: ${totalSessions}`],
          [`Generated: ${new Date().toLocaleDateString()}`],
          [],
          ['Grade', 'Class', 'Subject', 'Sessions', 'Teacher', 'Teacher ID']
        ];

        sheetRows.forEach(r => {
           let sessionsCell = r.sessions > 0 ? r.sessions.toString() : '0';
           if (r.isFLMarker) sessionsCell = `${r.sessions} (Class Total)`;
           wsData.push([`Grade ${r.grade}`, `Class ${r.cls}`, r.subj.trim(), sessionsCell, r.teacher, r.teacherId || '']);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{wch: 12}, {wch: 12}, {wch: 30}, {wch: 15}, {wch: 25}, {wch: 15}];
        
        XLSX.utils.book_append_sheet(wb, ws, finalName);
    };

    // 1. Add Main Sheet
    const mainTitle = `Type: ${reportType.toUpperCase()} | Filter: ${reportFilter || 'All'}`;
    addSheet("Main Report", rows, mainTitle);

    // 2. Unconditionally break down into tabs based on the exported subset of data
    const grades = Array.from(new Set(rows.map(r => r.grade)));
    grades.forEach(g => {
        addSheet(`Grade ${g}`, rows.filter(r => r.grade === g), `Grade ${g} Report`);
    });

    const classes = Array.from(new Set(rows.map(r => `${r.grade}|${r.cls}`)));
    classes.forEach(c => {
        const [g, cls] = c.split('|');
        addSheet(`G${g} - Class ${cls}`, rows.filter(r => r.grade === g && r.cls === cls), `Grade ${g} Class ${cls} Report`);
    });

    const teachers = Array.from(new Set(rows.map(r => r.teacher)));
    teachers.forEach(t => {
        if (t === 'Unassigned' || t === 'Multiple') return;
        addSheet(`Tchr - ${t.substring(0, 20)}`, rows.filter(r => r.teacher === t), `Teacher: ${t}`, true);
    });

    const subjects = Array.from(new Set(rows.map(r => r.subj)));
    subjects.forEach(s => {
        const cleanName = s.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace('FL —', 'FL').trim();
        if (cleanName === 'FL Foreign Languages' || cleanName === 'FL') {
             addSheet(`Subj - FL`, rows.filter(r => r.subj === s), `Subject: Foreign Languages`); // Marker doesn't need sumAllSessions
        } else {
             addSheet(`Subj - ${cleanName.substring(0, 20)}`, rows.filter(r => r.subj === s), `Subject: ${s.trim()}`, true);
        }
    });

    XLSX.writeFile(wb, `EduDash_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Report exported to Excel with separate tabs!');
  };

  const getFilterOptions = () => {
    if (reportType === 'grade') return visibleGrades.filter(g => getVisibleClassesForGrade(g).length > 0).map(g => <option key={g} value={g}>Grade {g}</option>);
    if (reportType === 'class') return getAllClasses().map(c => <option key={`${c.grade}|${c.cls}`} value={`${c.grade}|${c.cls}`}>Grade {c.grade} - Class {c.cls}</option>);
    if (reportType === 'subject') return getAllSubjects().map(s => <option key={s} value={s}>{s}</option>);
    if (reportType === 'teacher') return getAllTeachers().map(t => <option key={t} value={t}>{t}</option>);
    return null;
  };

  const handleExportJson = () => {
    const rows = getFilteredData();
    if (rows.length === 0) {
      toast.error('No data to export.');
      return;
    }
    const dataStr = JSON.stringify(rows, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${reportType}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('JSON Exported');
  };

  const handlePrint = () => {
    const el = document.getElementById('report-preview-content');
    if (!el || el.innerHTML.includes('No Results Found') || el.innerHTML.includes('Generate an Overview')) {
       toast.error('No data to export.');
       return;
    }
    
    toast.loading('Preparing Print-Friendly PDF...', { id: 'pdf-gen' });
    
    try {
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(s => s.outerHTML)
        .join('\n');

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>EduDash_Report_${new Date().toISOString().slice(0,10)}</title>
            ${styles}
            <style>
              @media print {
                body { 
                  -webkit-print-color-adjust: exact; 
                  print-color-adjust: exact; 
                  background-color: white !important; 
                }
                @page { margin: 15mm; }
                .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
                .print-hidden { display: none !important; }
                #report-preview-content { border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; max-height: none !important; overflow: visible !important; }
              }
            </style>
          </head>
          <body class="bg-white !m-0 !p-8">
            ${el.outerHTML}
          </body>
        </html>
      `;

      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(printContent);
        printWin.document.close();
        
        toast.success('Ready to save as PDF!', { id: 'pdf-gen' });
        
        // Wait for styles and fonts to load
        setTimeout(() => {
          printWin.focus();
          printWin.print();
        }, 500);
      } else {
        toast.error('Print blocked. Please allow popups.', { id: 'pdf-gen' });
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to prepare PDF.', { id: 'pdf-gen' });
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between print-hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Generate overviews and export assignment data.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row gap-4 items-end print-hidden">
         <div className="flex-1 w-full">
           <label className="block text-sm font-semibold text-slate-700 mb-1.5">Report Type</label>
           <select 
              value={reportType} 
              onChange={e => { setReportType(e.target.value); setReportFilter(''); }}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors text-slate-900"
            >
              <option value="overall">🏫 Overall School Report</option>
              <option value="grade">📘 By Grade Level</option>
              <option value="class">📙 By Class</option>
              <option value="subject">📕 By Subject</option>
              <option value="teacher">👤 By Teacher</option>
           </select>
         </div>
         {reportType !== 'overall' && (
           <div className="flex-1 w-full animate-in fade-in">
             <label className="block text-sm font-semibold text-slate-700 mb-1.5">
               {reportType === 'grade' ? 'Select Grade' :
                reportType === 'class' ? 'Select Class' :
                reportType === 'subject' ? 'Select Subject' :
                reportType === 'teacher' ? 'Select Teacher' : 'Filter Options'}
             </label>
             <select 
                value={reportFilter} 
                onChange={e => setReportFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors text-slate-900"
              >
                <option value="">-- All --</option>
                {getFilterOptions()}
             </select>
           </div>
         )}
         <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
            <button onClick={generateReport} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors text-sm shadow-sm">
              <Search className="w-4 h-4" /> Overview
            </button>
            {canExport && (
                <>
                    <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-colors text-sm shadow-sm">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    <button onClick={handleExport} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm shadow-sm shadow-emerald-200">
                      <Download className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={handleExportJson} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition-colors text-sm shadow-sm shadow-sky-200">
                      <FileJson className="w-4 h-4" /> JSON
                    </button>
                </>
            )}
         </div>
      </div>

      <div id="report-preview-content" className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 min-h-[500px] flex-1 overflow-y-auto">
        {previewHtml}
      </div>
    </div>
  );
}
