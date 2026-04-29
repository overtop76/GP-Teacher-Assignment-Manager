import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppData, FL_LANGUAGES, GRADE_LABELS, ART_MUSIC_SUBJECTS } from './types';
import { useAuthStore } from './authStore';

function getDefaultGradeData() {
  return { classes: {} };
}

function initEmptyData(schoolName: string = ''): AppData {
  const data: AppData = {
    schoolName: schoolName,
    gradeLevels: {},
    gradesOrder: [...GRADE_LABELS],
    nextSubjectId: 1,
    nextTeacherId: 1,
    teachers: {},
  };
  GRADE_LABELS.forEach((g) => {
    data.gradeLevels[g] = getDefaultGradeData();
  });
  return data;
}

export interface AppContextType {
  data: AppData;
  setSchoolName: (name: string) => void;
  setClassesForGrade: (grade: string, classList: string[]) => void;
  setSubjectForGradeClass: (grade: string, className: string, subjectName: string, sessions: number, teacherName: string, existingSubjectId?: string) => void;
  setFLSubject: (grade: string, className: string, sessions: number, langTeachers: Record<string, string>, existingId?: string) => void;
  setArtMusicSubject: (grade: string, className: string, sessions: number, amTeachers: Record<string, string>, existingId?: string) => void;
  setElectiveSubject: (grade: string, className: string, subjectName: string, sessions: number, electives: Record<string, string>, existingId?: string) => void;
  deleteSubjectForGradeClass: (grade: string, className: string, subjectName: string) => void;
  copySubjectsToClass: (srcGrade: string, srcClass: string, destGrade: string, destClass: string) => void;
  copySubjectsToAnotherSchool: (srcGrade: string, srcClass: string, destSchoolId: string, destGrade: string, destClass: string) => void;
  getClassesForAnotherSchool: (schoolId: string, grade: string) => string[];
  getTeacherTotalSessions: (teacherName: string) => number;
  getTotalSessionsForClass: (grade: string, cls: string) => number;
  getClassesForGrade: (grade: string) => string[];
  clearClassesForGrade: (grade: string) => void;
  deleteClass: (grade: string, className: string) => void;
  renameGrade: (oldName: string, newName: string) => void;
  renameClass: (grade: string, oldName: string, newName: string) => void;
  setTeacherProfile: (teacherId: string, profile: { isHoD?: boolean; department?: string; hodSubjects?: string[]; hodGrades?: string[] }) => void;
  importSchoolData: (jsonData: string) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { activeSchoolId, systemData } = useAuthStore();
  const schoolName = systemData.schools.find(s => s.id === activeSchoolId)?.name || '';
  
  const [data, setData] = useState<AppData>(initEmptyData(schoolName));
  const [isLoaded, setIsLoaded] = useState(false);

  const STORAGE_KEY = activeSchoolId ? `eduDashData_v6_react_${activeSchoolId}` : null;

  useEffect(() => {
    if (!STORAGE_KEY) {
       setData(initEmptyData(''));
       setIsLoaded(true);
       return;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.gradeLevels?.['K'] && !parsed.gradeLevels?.['K1']) {
           parsed.gradeLevels['K1'] = parsed.gradeLevels['K'];
           delete parsed.gradeLevels['K'];
        }
        const base = initEmptyData(schoolName);
        const mergedGradeLevels = { ...base.gradeLevels, ...parsed.gradeLevels };
        const merged = { ...base, ...parsed, gradeLevels: mergedGradeLevels, schoolName }; // enforce synced name
        setData(merged);
      } catch (e) {
        console.error('Failed to parse app data', e);
      }
    } else {
        setData(initEmptyData(schoolName));
    }
    setIsLoaded(true);
  }, [STORAGE_KEY, schoolName]);

  const save = (newData: AppData) => {
    setData(newData);
    if (STORAGE_KEY) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    }
  };

  const getOrCreateTeacherId = (currentData: AppData, teacherName: string) => {
    const name = teacherName.trim();
    if (!name) return null;
    
    let tid = currentData.teachers[name];
    if (tid) {
      if (/^\d+$/.test(tid)) {
         tid = 'TCH-' + String(tid).padStart(3, '0');
         currentData.teachers[name] = tid;
      } else if (tid.startsWith('TCH-')) {
         const numStr = tid.replace('TCH-', '');
         if (/^\d+$/.test(numStr) && numStr.length < 3) {
            tid = 'TCH-' + numStr.padStart(3, '0');
            currentData.teachers[name] = tid;
         }
      }
      return tid;
    }
    
    const newTid = 'TCH-' + String(currentData.nextTeacherId).padStart(3, '0');
    currentData.teachers[name] = newTid;
    currentData.nextTeacherId++;
    return newTid;
  };

  const cbs: Omit<AppContextType, 'data' | 'getTeacherTotalSessions' | 'getTotalSessionsForClass' | 'getClassesForGrade'> = {
    setSchoolName: (name) => {
      save({ ...data, schoolName: name });
    },
    setClassesForGrade: (grade, classList) => {
      const d = structuredClone(data);
      if (!d.gradeLevels[grade]) d.gradeLevels[grade] = getDefaultGradeData();
      const existing = d.gradeLevels[grade].classes;
      const newClasses: any = {};
      classList.forEach((cls) => {
        const trimmed = cls.trim().toUpperCase();
        if (trimmed) newClasses[trimmed] = existing[trimmed] || { subjects: {} };
      });
      d.gradeLevels[grade].classes = newClasses;
      save(d);
    },
    clearClassesForGrade: (grade: string) => {
      const d = structuredClone(data);
      d.gradeLevels[grade] = getDefaultGradeData();
      save(d);
    },
    importSchoolData: (jsonStr: string) => {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === 'object') {
          // simple validation
          if (parsed.gradeLevels) {
             save({ ...data, ...parsed, schoolName: data.schoolName }); // preserve current school name/id
             return true;
          }
        }
      } catch(e) {
        console.error("Invalid JSON", e);
      }
      return false;
    },
    deleteClass: (grade: string, className: string) => {
      const d = structuredClone(data);
      if (d.gradeLevels[grade]?.classes[className]) {
        delete d.gradeLevels[grade].classes[className];
        save(d);
      }
    },
    renameGrade: (oldName: string, newName: string) => {
      if (!newName.trim() || oldName === newName) return;
      const d = structuredClone(data);
      if (!d.gradesOrder) d.gradesOrder = [...GRADE_LABELS];
      const idx = d.gradesOrder.indexOf(oldName);
      if (idx !== -1) {
        d.gradesOrder[idx] = newName;
      }
      if (d.gradeLevels[oldName]) {
        d.gradeLevels[newName] = d.gradeLevels[oldName];
        delete d.gradeLevels[oldName];
      }
      save(d);
    },
    renameClass: (grade: string, oldName: string, newName: string) => {
      if (!newName.trim() || oldName === newName) return;
      const d = structuredClone(data);
      const gradeData = d.gradeLevels[grade];
      if (gradeData?.classes[oldName]) {
        gradeData.classes[newName] = gradeData.classes[oldName];
        delete gradeData.classes[oldName];
        save(d);
      }
    },
    setTeacherProfile: (teacherId: string, profile: { isHoD?: boolean; department?: string; hodSubjects?: string[]; hodGrades?: string[] }) => {
      const d = structuredClone(data);
      if (!d.teacherProfiles) d.teacherProfiles = {};
      d.teacherProfiles[teacherId] = {
        ...d.teacherProfiles[teacherId],
        ...profile,
      };
      save(d);
    },
    setSubjectForGradeClass: (grade, className, subjectName, sessions, teacherName, existingSubjectId) => {
      const d = structuredClone(data);
      if (!d.gradeLevels[grade]) d.gradeLevels[grade] = getDefaultGradeData();
      if (!d.gradeLevels[grade].classes[className]) d.gradeLevels[grade].classes[className] = { subjects: {} };
      
      const subjects = d.gradeLevels[grade].classes[className].subjects;
      const trimmedSubject = subjectName.trim();
      const teacherTrimmed = teacherName.trim();
      const teacherId = getOrCreateTeacherId(d, teacherTrimmed) || 'TCH-000';
      
      if (existingSubjectId && subjects[trimmedSubject] && subjects[trimmedSubject].id === existingSubjectId) {
        subjects[trimmedSubject].sessions = sessions || 0;
        subjects[trimmedSubject].teacher = teacherTrimmed;
        subjects[trimmedSubject].teacherId = teacherId;
      } else {
        const subjectId = existingSubjectId || 'SUBJ-' + String(d.nextSubjectId++).padStart(3, '0');
        subjects[trimmedSubject] = {
          id: subjectId,
          sessions: sessions || 0,
          teacher: teacherTrimmed,
          teacherId: teacherId
        };
      }
      save(d);
    },
    setFLSubject: (grade, className, sessions, langTeachers, existingId) => {
      const d = structuredClone(data);
      if (!d.gradeLevels[grade]) d.gradeLevels[grade] = getDefaultGradeData();
      if (!d.gradeLevels[grade].classes[className]) d.gradeLevels[grade].classes[className] = { subjects: {} };
      
      const subjects = d.gradeLevels[grade].classes[className].subjects;
      const subjectId = existingId || 'SUBJ-' + String(d.nextSubjectId++).padStart(3, '0');
      
      const languages: any = {};
      FL_LANGUAGES.forEach(lang => {
        const tname = (langTeachers[lang] || '').trim();
        languages[lang] = { teacher: tname, teacherId: tname ? getOrCreateTeacherId(d, tname) : 'TCH-000' };
      });
      
      subjects['FL'] = { id: subjectId, isFL: true, sessions: sessions || 0, languages };
      save(d);
    },
    setArtMusicSubject: (grade, className, sessions, amTeachers, existingId) => {
      const d = structuredClone(data);
      if (!d.gradeLevels[grade]) d.gradeLevels[grade] = getDefaultGradeData();
      if (!d.gradeLevels[grade].classes[className]) d.gradeLevels[grade].classes[className] = { subjects: {} };
      
      const subjects = d.gradeLevels[grade].classes[className].subjects;
      const subjectId = existingId || 'SUBJ-' + String(d.nextSubjectId++).padStart(3, '0');
      
      const subSubjects: any = {};
      ART_MUSIC_SUBJECTS.forEach(am => {
        const tname = (amTeachers[am] || '').trim();
        subSubjects[am] = { teacher: tname, teacherId: tname ? getOrCreateTeacherId(d, tname) : 'TCH-000' };
      });
      subjects['Art/Music'] = { id: subjectId, isArtMusic: true, sessions: sessions || 0, subSubjects };
      save(d);
    },
    setElectiveSubject: (grade, className, subjectName, sessions, electives, existingId) => {
      const d = structuredClone(data);
      if (!d.gradeLevels[grade]) d.gradeLevels[grade] = getDefaultGradeData();
      if (!d.gradeLevels[grade].classes[className]) d.gradeLevels[grade].classes[className] = { subjects: {} };
      
      const subjects = d.gradeLevels[grade].classes[className].subjects;
      const subjectId = existingId || 'SUBJ-' + String(d.nextSubjectId++).padStart(3, '0');
      const trimmedSubject = subjectName.trim() || 'Electives';
      
      // If the old subject name was different (and we have an existingId), we must delete the old one
      if (existingId) {
         const oldKey = Object.keys(subjects).find(k => subjects[k].id === existingId);
         if (oldKey && oldKey !== trimmedSubject) {
             delete subjects[oldKey];
         }
      }

      const electiveData: any = {};
      Object.entries(electives).forEach(([elName, tname]) => {
        const tnameTrimmed = (tname || '').trim();
        electiveData[elName] = { teacher: tnameTrimmed, teacherId: tnameTrimmed ? getOrCreateTeacherId(d, tnameTrimmed) : 'TCH-000' };
      });
      subjects[trimmedSubject] = { id: subjectId, isElective: true, sessions: sessions || 0, electives: electiveData };
      save(d);
    },
    deleteSubjectForGradeClass: (grade, className, subjectName) => {
      const d = structuredClone(data);
      if (d.gradeLevels[grade]?.classes[className]?.subjects[subjectName]) {
        delete d.gradeLevels[grade].classes[className].subjects[subjectName];
        save(d);
      }
    },
    copySubjectsToClass: (srcGrade, srcClass, destGrade, destClass) => {
      const d = structuredClone(data);
      if (!d.gradeLevels[destGrade]) d.gradeLevels[destGrade] = getDefaultGradeData();
      if (!d.gradeLevels[destGrade].classes[destClass]) d.gradeLevels[destGrade].classes[destClass] = { subjects: {} };
      
      const srcSubjects = d.gradeLevels[srcGrade]?.classes[srcClass]?.subjects || {};
      const destSubjects = d.gradeLevels[destGrade].classes[destClass].subjects;

      Object.entries(srcSubjects).forEach(([subjName, subj]: [string, any]) => {
        if (subj.isFL) {
          const newId = 'SUBJ-' + String(d.nextSubjectId++).padStart(3, '0');
          const languages: any = {};
          FL_LANGUAGES.forEach(lang => {
            const tname = (subj.languages?.[lang]?.teacher || '').trim();
            languages[lang] = { teacher: tname, teacherId: tname ? getOrCreateTeacherId(d, tname) : 'TCH-000' };
          });
          destSubjects['FL'] = { id: newId, isFL: true, sessions: subj.sessions, languages };
        } else if (subj.isArtMusic) {
          const newId = 'SUBJ-' + String(d.nextSubjectId++).padStart(3, '0');
          const subSubjects: any = {};
          ART_MUSIC_SUBJECTS.forEach(am => {
            const tname = (subj.subSubjects?.[am]?.teacher || '').trim();
            subSubjects[am] = { teacher: tname, teacherId: tname ? getOrCreateTeacherId(d, tname) : 'TCH-000' };
          });
          destSubjects['Art/Music'] = { id: newId, isArtMusic: true, sessions: subj.sessions, subSubjects };
        } else if (subj.isElective) {
          const newId = 'SUBJ-' + String(d.nextSubjectId++).padStart(3, '0');
          const electivesData: any = {};
          Object.keys(subj.electives || {}).forEach(el => {
            const tname = (subj.electives?.[el]?.teacher || '').trim();
            electivesData[el] = { teacher: tname, teacherId: tname ? getOrCreateTeacherId(d, tname) : 'TCH-000' };
          });
          destSubjects[subjName] = { id: newId, isElective: true, sessions: subj.sessions, electives: electivesData };
        } else {
          const newId = 'SUBJ-' + String(d.nextSubjectId++).padStart(3, '0');
          const teacherTrimmed = (subj.teacher || '').trim();
          destSubjects[subjName] = {
            id: newId,
            sessions: subj.sessions,
            teacher: teacherTrimmed,
            teacherId: teacherTrimmed ? getOrCreateTeacherId(d, teacherTrimmed) : 'TCH-000'
          };
        }
      });
      save(d);
    },
    copySubjectsToAnotherSchool: (srcGrade, srcClass, destSchoolId, destGrade, destClass) => {
      const srcSubjects = data.gradeLevels[srcGrade]?.classes[srcClass]?.subjects || {};
      const destKey = `eduDashData_v6_react_${destSchoolId}`;
      const raw = localStorage.getItem(destKey);
      
      let destData: AppData = initEmptyData();
      if (raw) {
         try {
            const parsed = JSON.parse(raw);
            if (parsed.gradeLevels?.['K'] && !parsed.gradeLevels?.['K1']) {
               parsed.gradeLevels['K1'] = parsed.gradeLevels['K'];
               delete parsed.gradeLevels['K'];
            }
            const base = initEmptyData();
            const mergedGradeLevels = { ...base.gradeLevels, ...parsed.gradeLevels };
            destData = { ...base, ...parsed, gradeLevels: mergedGradeLevels };
         } catch (e) {}
      }
      
      if (!destData.gradeLevels[destGrade]) destData.gradeLevels[destGrade] = getDefaultGradeData();
      if (!destData.gradeLevels[destGrade].classes[destClass]) destData.gradeLevels[destGrade].classes[destClass] = { subjects: {} };
      
      const destSubjects = destData.gradeLevels[destGrade].classes[destClass].subjects;
      
      Object.entries(srcSubjects).forEach(([subjName, subj]: [string, any]) => {
         if (subj.isFL) {
           const newId = 'SUBJ-' + String(destData.nextSubjectId++).padStart(3, '0');
           const languages: any = {};
           FL_LANGUAGES.forEach(lang => {
             const tname = (subj.languages?.[lang]?.teacher || '').trim();
             languages[lang] = { teacher: tname, teacherId: tname ? getOrCreateTeacherId(destData, tname) : 'TCH-000' };
           });
           destSubjects['FL'] = { id: newId, isFL: true, sessions: subj.sessions, languages };
         } else if (subj.isArtMusic) {
           const newId = 'SUBJ-' + String(destData.nextSubjectId++).padStart(3, '0');
           const subSubjects: any = {};
           ART_MUSIC_SUBJECTS.forEach(am => {
             const tname = (subj.subSubjects?.[am]?.teacher || '').trim();
             subSubjects[am] = { teacher: tname, teacherId: tname ? getOrCreateTeacherId(destData, tname) : 'TCH-000' };
           });
           destSubjects['Art/Music'] = { id: newId, isArtMusic: true, sessions: subj.sessions, subSubjects };
         } else if (subj.isElective) {
           const newId = 'SUBJ-' + String(destData.nextSubjectId++).padStart(3, '0');
           const electivesData: any = {};
           Object.keys(subj.electives || {}).forEach(el => {
             const tname = (subj.electives?.[el]?.teacher || '').trim();
             electivesData[el] = { teacher: tname, teacherId: tname ? getOrCreateTeacherId(destData, tname) : 'TCH-000' };
           });
           destSubjects[subjName] = { id: newId, isElective: true, sessions: subj.sessions, electives: electivesData };
         } else {
           const newId = 'SUBJ-' + String(destData.nextSubjectId++).padStart(3, '0');
           const teacherTrimmed = (subj.teacher || '').trim();
           destSubjects[subjName] = {
             id: newId,
             sessions: subj.sessions,
             teacher: teacherTrimmed,
             teacherId: teacherTrimmed ? getOrCreateTeacherId(destData, teacherTrimmed) : 'TCH-000'
           };
         }
      });
      
      localStorage.setItem(destKey, JSON.stringify(destData));
    },
    getClassesForAnotherSchool: (schoolId, grade) => {
      const destKey = `eduDashData_v6_react_${schoolId}`;
      const raw = localStorage.getItem(destKey);
      if (raw) {
         try {
            const destData: AppData = JSON.parse(raw);
            if (destData.gradeLevels?.['K'] && !destData.gradeLevels?.['K1']) {
               destData.gradeLevels['K1'] = destData.gradeLevels['K'];
               delete destData.gradeLevels['K'];
            }
            return Object.keys(destData.gradeLevels?.[grade]?.classes || {}).sort();
         } catch (e) {}
      }
      return [];
    }
  };

  const getTeacherTotalSessions = (teacherName: string) => {
    let total = 0;
    const gradesToIterate = data?.gradesOrder || Object.keys(data?.gradeLevels || {});
    gradesToIterate.forEach(g => {
      Object.values(data.gradeLevels[g]?.classes || {}).forEach((cls: any) => {
        Object.values(cls.subjects || {}).forEach((subj: any) => {
          if (subj.isFL) {
            Object.values(subj.languages || {}).forEach((lang: any) => {
              if (lang.teacher === teacherName) total += (subj.sessions || 0);
            });
          } else if (subj.isArtMusic) {
            Object.values(subj.subSubjects || {}).forEach((subp: any) => {
              if (subp.teacher === teacherName) total += (subj.sessions || 0);
            });
          } else if (subj.isElective) {
            Object.values(subj.electives || {}).forEach((subp: any) => {
              if (subp.teacher === teacherName) total += (subj.sessions || 0);
            });
          } else {
            if (subj.teacher === teacherName) total += (subj.sessions || 0);
          }
        });
      });
    });
    return total;
  };

  const getTotalSessionsForClass = (grade: string, cls: string) => {
    const subjects = data.gradeLevels[grade]?.classes[cls]?.subjects || {};
    return Object.values(subjects).reduce((s: number, subj: any) => s + (subj.sessions || 0), 0);
  };

  const getClassesForGrade = (grade: string) => {
    return Object.keys(data.gradeLevels[grade]?.classes || {}).sort();
  };

  if (!isLoaded) return null;

  return (
    <AppContext.Provider value={{
      data,
      getTeacherTotalSessions,
      getTotalSessionsForClass,
      getClassesForGrade,
      ...cbs
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
}
