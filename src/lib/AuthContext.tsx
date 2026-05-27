import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs, limit, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isTechnician: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, displayName: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth status from LocalStorage
  useEffect(() => {
    async function loadSession() {
      try {
        const stored = localStorage.getItem('calibra_auth_session');
        if (stored) {
          const parsedUser = JSON.parse(stored) as AuthUser;
          setUser(parsedUser);
          
          // Fetch profile from Firestore
          const docRef = doc(db, 'users', parsedUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile(data);
            // Sync user state display name if it changed
            if (data.displayName !== parsedUser.displayName || data.role !== parsedUser.role) {
              const updatedUser = { 
                ...parsedUser, 
                displayName: data.displayName || parsedUser.displayName, 
                role: data.role || parsedUser.role 
              };
              setUser(updatedUser);
              localStorage.setItem('calibra_auth_session', JSON.stringify(updatedUser));
            }
          } else {
            // Document doesn't exist yet but user is in local storage
            setProfile({
              uid: parsedUser.uid,
              displayName: parsedUser.displayName,
              email: parsedUser.email,
              role: parsedUser.role || (parsedUser.email === 'abdurrahman.muh23@gmail.com' ? 'admin' : 'technician')
            });
          }
        }
      } catch (err) {
        console.error("Failed to load custom auth session:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (email: string, password: string) => {
    const emailStandard = email.toLowerCase().trim();
    const q = query(
      collection(db, 'users'),
      where('email', '==', emailStandard),
      limit(1)
    );
    
    let querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      // Auto-register the user if they are not registered yet
      const defaultName = emailStandard.split('@')[0].toUpperCase();
      await register(emailStandard, password, defaultName);
      querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        throw new Error('Kredensial salah atau tidak terdaftar.');
      }
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // If migrating/updating a profile that doesn't have a password yet or if there's a password change, auto-update it
    if (!userData.password || userData.password !== password) {
      await setDoc(doc(db, 'users', userDoc.id), { password: password, updatedAt: serverTimestamp() }, { merge: true });
      userData.password = password;
    }

    const authUser: AuthUser = {
      uid: userData.uid || userDoc.id,
      email: userData.email,
      displayName: userData.displayName || userData.email.split('@')[0],
      role: userData.role,
    };

    localStorage.setItem('calibra_auth_session', JSON.stringify(authUser));
    setUser(authUser);
    setProfile(userData);

    return authUser;
  };

  const register = async (email: string, password: string, displayName: string) => {
    const emailStandard = email.toLowerCase().trim();
    const q = query(
      collection(db, 'users'),
      where('email', '==', emailStandard),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    let uid = 'user_' + Math.random().toString(36).substring(2, 15);
    const isFirstAdmin = emailStandard === 'abdurrahman.muh23@gmail.com';
    const role = isFirstAdmin ? 'admin' : 'technician';

    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      const existingData = existingDoc.data();
      if (existingData.password) {
        throw new Error('Alamat email tersebut sudah terdaftar.');
      } else {
        // Update user profile previously migrated from Firebase Auth setup
        uid = existingData.uid || existingDoc.id;
        const assignedRole = existingData.role || role;
        
        await setDoc(doc(db, 'users', uid), {
          password,
          displayName,
          role: assignedRole,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        const authUser: AuthUser = {
          uid,
          email: emailStandard,
          displayName,
          role: assignedRole,
        };

        localStorage.setItem('calibra_auth_session', JSON.stringify(authUser));
        setUser(authUser);
        setProfile({
          ...existingData,
          password,
          displayName,
          role: assignedRole,
        });

        return authUser;
      }
    }

    const newUser = {
      uid,
      email: emailStandard,
      password,
      displayName,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', uid), newUser);

    const authUser: AuthUser = {
      uid,
      email: emailStandard,
      displayName,
      role,
    };

    localStorage.setItem('calibra_auth_session', JSON.stringify(authUser));
    setUser(authUser);
    setProfile(newUser);

    return authUser;
  };

  const logout = async () => {
    localStorage.removeItem('calibra_auth_session');
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' || user?.email === 'abdurrahman.muh23@gmail.com' || user?.role === 'admin',
    isSupervisor: profile?.role === 'supervisor' || profile?.role === 'admin' || user?.email === 'abdurrahman.muh23@gmail.com' || user?.role === 'supervisor' || user?.role === 'admin',
    isTechnician: profile?.role === 'technician' || profile?.role === 'admin' || user?.email === 'abdurrahman.muh23@gmail.com' || user?.role === 'technician' || user?.role === 'admin',
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
