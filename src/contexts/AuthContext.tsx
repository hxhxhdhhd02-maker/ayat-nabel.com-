import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, Profile } from '../lib/firebase';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signUp: (phone: string, password: string, fullName: string, grade: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await loadProfile(user.uid);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setProfile(docSnap.data() as Profile);
      } else {
        const currentUser = auth.currentUser;
        if (currentUser?.email?.startsWith('01228495250')) {
          console.log('⚠️ Admin profile missing, recreating...');
          const adminProfile: Profile = {
            id: userId,
            phone_number: '01228495250',
            full_name_arabic: 'د/ آيات نبيل',
            grade: 'all',
            role: 'teacher',
            wallet_balance: 0,
            created_at: new Date().toISOString()
          };
          await setDoc(docRef, adminProfile);
          setProfile(adminProfile);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(phone: string, password: string) {
    const email = `${phone}@platform.local`;
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(phone: string, password: string, fullName: string, grade: string) {
    const email = `${phone}@platform.local`;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    const newProfile: Profile = {
      id: userId,
      phone_number: phone,
      full_name_arabic: fullName,
      grade: grade,
      role: 'student',
      wallet_balance: 0,
      created_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'profiles', userId), newProfile);
    setProfile(newProfile);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
