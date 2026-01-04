
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, Profile } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

type ParentContextType = {
    student: Profile | null;
    loading: boolean;
    login: (phone: string) => Promise<void>;
    logout: () => Promise<void>;
    error: string | null;
};

const ParentContext = createContext<ParentContextType>({} as ParentContextType);

export const useParent = () => useContext(ParentContext);

export const ParentProvider = ({ children }: { children: React.ReactNode }) => {
    const [student, setStudent] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkLogin();
    }, []);

    const checkLogin = async () => {
        try {
            const storedPhone = await AsyncStorage.getItem('parent_phone');
            if (storedPhone) {
                await login(storedPhone);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const login = async (phone: string) => {
        setLoading(true);
        setError(null);
        const cleanPhone = phone.trim();
        try {
            // Find student by parent_phone
            const q = query(collection(db, 'profiles'), where('parent_phone', '==', cleanPhone));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                // Fallback: check if the phone matches the student's phone directly (maybe parent entered student phone?)
                const q2 = query(collection(db, 'profiles'), where('phone_number', '==', cleanPhone));
                const snapshot2 = await getDocs(q2);

                if (snapshot2.empty) {
                    setError('رقم الهاتف غير مسجل كولي أمر أو طالب');
                    setLoading(false);
                    return;
                }

                const doc = snapshot2.docs[0];
                setStudent({ id: doc.id, ...doc.data() } as Profile);
                await AsyncStorage.setItem('parent_phone', cleanPhone);
            } else {
                // Found by parent phone. If multiple, take the first one for now.
                const doc = snapshot.docs[0];
                setStudent({ id: doc.id, ...doc.data() } as Profile);
                await AsyncStorage.setItem('parent_phone', cleanPhone);
            }
        } catch (err: any) {
            setError(err.message || 'حدث خطأ في تسجيل الدخول');
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('parent_phone');
        setStudent(null);
    };

    return (
        <ParentContext.Provider value={{ student, loading, login, logout, error }}>
            {children}
        </ParentContext.Provider>
    );
};
