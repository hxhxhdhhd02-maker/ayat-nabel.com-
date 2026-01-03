import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyAB57tFOgnL0SeQ569m-uyKAYP3HDWd1eg",
    authDomain: "project-4889379974501144933.firebaseapp.com",
    databaseURL: "https://project-4889379974501144933-default-rtdb.firebaseio.com",
    projectId: "project-4889379974501144933",
    storageBucket: "project-4889379974501144933.firebasestorage.app",
    messagingSenderId: "979822187752",
    appId: "1:979822187752:web:d4b1233c176af988e4e55d",
    measurementId: "G-F2TBQM7FBJ"
};

const app = initializeApp(firebaseConfig);

let auth: Auth;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
} catch (e) {
    // In case likely already initialized in hot reload
    const { getAuth } = require("firebase/auth");
    auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);

export type Profile = {
    id: string;
    phone_number: string;
    parent_phone?: string;
    full_name_arabic: string;
    grade: string;
    role: 'student' | 'teacher';
    wallet_balance: number;
    profile_image?: string;
    created_at: string;
};

export type Course = {
    id: string;
    title: string;
    description: string;
    grade: string;
    price: number;
    thumbnail_url: string;
    teacher_id: string;
    created_at: string;
};

export type Lecture = {
    id: string;
    course_id: string;
    title: string;
    description: string;
    youtube_url: string;
    pdf_url: string;
    order_index: number;
    duration_seconds: number;
    created_at: string;
};

export type PaymentRequest = {
    id: string;
    student_id: string;
    student_name: string;
    amount: number;
    sender_phone: string;
    screenshot_url: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    processed_at?: string;
    processed_by?: string;
};
