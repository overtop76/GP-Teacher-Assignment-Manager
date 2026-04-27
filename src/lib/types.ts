export const GRADE_LABELS = ['K1', 'K2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
export const MAX_CLASS_SESSIONS = 40;
export const TEACHER_MIN_SESSIONS = 16;
export const TEACHER_MAX_SESSIONS = 25;
export const FL_LANGUAGES = ['French', 'Spanish', 'German'] as const;
export const FL_FLAGS: Record<string, string> = { French: '🇫🇷', Spanish: '🇪🇸', German: '🇩🇪' };
export const ART_MUSIC_SUBJECTS = ['Art', 'Music'] as const;

export type FL_LANG = typeof FL_LANGUAGES[number];
export type AM_SUBJ = typeof ART_MUSIC_SUBJECTS[number];

export interface LanguageData {
  teacher: string;
  teacherId: string;
}

export interface Subject {
  id: string;
  sessions: number;
  teacher?: string;
  teacherId?: string;
  isFL?: boolean;
  isArtMusic?: boolean;
  isElective?: boolean;
  languages?: Record<string, LanguageData>;
  subSubjects?: Record<string, LanguageData>; // reuse LanguageData structure for ArtMusic
  electives?: Record<string, LanguageData>; // user defined parallel electives
}

export interface ClassData {
  subjects: Record<string, Subject>;
}

export interface GradeData {
  classes: Record<string, ClassData>;
}

export type Permission = 'admin' | 'edit_assignments' | 'view_only';

export interface UserPermissions {
  isAdmin?: boolean;
  canEditGrades?: string[];
  canViewGrades?: string[];
  canPrintExport?: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordText: string;
  permissions: UserPermissions;
  assignedSchools: string[]; // IDs or "ALL"
}

export interface SchoolInfo {
  id: string;
  name: string;
}

export const AUTH_STORAGE_KEY = 'eduDashAuth_v1';
export interface SystemData {
  users: UserAccount[];
  schools: SchoolInfo[];
}

export interface AppData {
  schoolName: string;
  gradeLevels: Record<string, GradeData>;
  nextSubjectId: number;
  nextTeacherId: number;
  teachers: Record<string, string>;
}
