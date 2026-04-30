import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SystemData, UserAccount, SchoolInfo, AUTH_STORAGE_KEY } from './types';
import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface AuthContextType {
  systemData: SystemData;
  currentUser: UserAccount | null;
  activeSchoolId: string | null;
  login: (username: string, passwordText: string) => boolean;
  logout: () => void;
  setActiveSchoolId: (id: string | null) => void;
  createSchool: (name: string) => string;
  updateSchool: (id: string, name: string) => void;
  createUser: (user: Omit<UserAccount, 'id'>) => void;
  updateUser: (id: string, user: Partial<Omit<UserAccount, 'id'>>) => void;
  deleteUser: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_SYSTEM_DATA: SystemData = {
  users: [
    {
      id: 'USR-ADMIN',
      username: 'Admin',
      passwordText: 'Admin@123',
      permissions: { isAdmin: true },
      assignedSchools: ['ALL']
    }
  ],
  schools: []
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [systemData, setSystemData] = useState<SystemData>(DEFAULT_SYSTEM_DATA);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let unmounted = false;
    const unsub = onSnapshot(doc(db, 'systemData', 'global'), (docSnap) => {
      if (unmounted) return;
      if (docSnap.exists()) {
        const parsed = docSnap.data() as SystemData;
        if (parsed.users) {
           parsed.users.forEach((u: any) => {
              if (u.permissions?.canEditGrades?.includes('K')) {
                  u.permissions.canEditGrades = u.permissions.canEditGrades.filter((g: string) => g !== 'K');
                  if (!u.permissions.canEditGrades.includes('K1')) u.permissions.canEditGrades.push('K1');
                  if (!u.permissions.canEditGrades.includes('K2')) u.permissions.canEditGrades.push('K2');
              }
              if (u.permissions?.canViewGrades?.includes('K')) {
                  u.permissions.canViewGrades = u.permissions.canViewGrades.filter((g: string) => g !== 'K');
                  if (!u.permissions.canViewGrades.includes('K1')) u.permissions.canViewGrades.push('K1');
                  if (!u.permissions.canViewGrades.includes('K2')) u.permissions.canViewGrades.push('K2');
              }
           });
        }
        setSystemData(parsed);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
      } else {
        // Run migration if exists in local storage
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        let initialData = DEFAULT_SYSTEM_DATA;
        if (raw) {
          try {
            initialData = JSON.parse(raw);
          } catch(e){}
        }
        setDoc(doc(db, 'systemData', 'global'), initialData);
        setSystemData(initialData);
      }
      setIsLoaded(true);
    }, (error) => {
       console.error("Firebase AuthStore error", error);
       // Fallback to local
       const raw = localStorage.getItem(AUTH_STORAGE_KEY);
       if(raw) {
           try{ setSystemData(JSON.parse(raw)); } catch(e){}
       }
       setIsLoaded(true);
    });

    return () => {
      unmounted = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    // Check session
    const savedSession = sessionStorage.getItem('edudash_current_user');
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      const realUser = systemData.users.find((u: UserAccount) => u.id === parsedSession.id);
      if (realUser) {
        setCurrentUser(realUser);
        const schoolSession = sessionStorage.getItem('edudash_active_school');
        if (schoolSession) setActiveSchoolId(schoolSession);
      }
    }
  }, [isLoaded, systemData]);

  const saveSystemData = (newData: SystemData) => {
    // Optimistic update
    setSystemData(newData);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newData));
    // Persist to firebase
    setDoc(doc(db, 'systemData', 'global'), newData).catch(e => console.error("Firebase save error", e));
  };

  const cbs: Omit<AuthContextType, 'systemData' | 'currentUser' | 'activeSchoolId'> = {
    login: (username, password) => {
       const user = systemData.users.find(u => u.username === username && u.passwordText === password);
       if (user) {
         setCurrentUser(user);
         sessionStorage.setItem('edudash_current_user', JSON.stringify(user));
         
         // auto-select school if not ALL
         if (!user.permissions.isAdmin && user.assignedSchools.length > 0 && user.assignedSchools[0] !== 'ALL') {
             cbs.setActiveSchoolId(user.assignedSchools[0]);
         }
         return true;
       }
       return false;
    },
    logout: () => {
       setCurrentUser(null);
       setActiveSchoolId(null);
       sessionStorage.removeItem('edudash_current_user');
       sessionStorage.removeItem('edudash_active_school');
    },
    setActiveSchoolId: (id) => {
       setActiveSchoolId(id);
       if (id) {
           sessionStorage.setItem('edudash_active_school', id);
       } else {
           sessionStorage.removeItem('edudash_active_school');
       }
    },
    createSchool: (name) => {
       const newId = 'SCH-' + Math.random().toString(36).substr(2, 9).toUpperCase();
       
       const newData = { ...systemData, schools: [...systemData.schools, { id: newId, name }] };
       saveSystemData(newData);
       return newId;
    },
    updateSchool: (id, name) => {
       const newData = {
         ...systemData,
         schools: systemData.schools.map(s => s.id === id ? { ...s, name } : s)
       };
       saveSystemData(newData);
    },
    createUser: (userObj) => {
       const newId = 'USR-' + Math.random().toString(36).substr(2, 9).toUpperCase();
       const newData = { ...systemData, users: [...systemData.users, { ...userObj, id: newId }] };
       saveSystemData(newData);
    },
    updateUser: (id, partialUser) => {
       const newData = {
         ...systemData,
         users: systemData.users.map(u => u.id === id ? { ...u, ...partialUser } : u)
       };
       saveSystemData(newData);
       if (currentUser?.id === id) {
           const updatedUser = newData.users.find(u => u.id === id)!;
           setCurrentUser(updatedUser);
           sessionStorage.setItem('edudash_current_user', JSON.stringify(updatedUser));
       }
    },
    deleteUser: (id) => {
       const newData = {
         ...systemData,
         users: systemData.users.filter(u => u.id !== id)
       };
       saveSystemData(newData);
    }
  };

  if (!isLoaded) return null;

  return (
    <AuthContext.Provider value={{ systemData, currentUser, activeSchoolId, ...cbs }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthStore() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthStore must be used within AuthProvider');
  return context;
}
