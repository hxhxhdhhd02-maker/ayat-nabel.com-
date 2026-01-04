import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, AppState } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../lib/firebase';
import { collection, getCountFromServer, query, where, getDocs, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { registerForPushNotificationsAsync, sendLocalNotification } from '../lib/notifications';

// Components
import CoursesTab from '../components/CoursesTab';
import StudentsTab from '../components/StudentsTab';
import PaymentsTab from '../components/PaymentsTab';

import PagerView from 'react-native-pager-view';

// ... (keep imports)

export default function DashboardScreen() {
    const { signOut, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'home' | 'courses' | 'students' | 'payments'>('home');
    const notificationListener = useRef<any>(null);
    const pagerRef = useRef<PagerView>(null);
    const tabs: ('home' | 'courses' | 'students' | 'payments')[] = ['home', 'courses', 'students', 'payments'];

    // Dashboard Stats
    const [stats, setStats] = useState({
        students: 0,
        payments: 0,
        courses: 0,
        lectures: 0
    });

    useEffect(() => {
        // Register for notifications
        registerForPushNotificationsAsync().then(token => {
            if (token && user) {
                // Save token to admin profile
                const userRef = doc(db, 'profiles', user.uid); // Assuming admin uses same collection
                updateDoc(userRef, { expoPushToken: token }).catch(e => console.log('Error saving token', e));
            }
        });

        // Listen for NEW payment requests in real-time
        const q = query(
            collection(db, 'payment_requests'),
            where('status', '==', 'pending'),
            orderBy('created_at', 'desc'),
            limit(10)
        );

        let isFirstLoad = true;
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Update stats count locally
            const pendingCount = snapshot.size;
            setStats(prev => ({ ...prev, payments: pendingCount }));

            // Detect new additions (skip first load)
            if (!isFirstLoad) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        sendLocalNotification(
                            'طلب شحن جديد! 💰',
                            `الطالب ${data.student_name} طلب شحن بمبلغ ${data.amount} جنيه`
                        );
                    }
                });
            }
            isFirstLoad = false;
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (activeTab === 'home') loadStats();
    }, [activeTab]);

    async function loadStats() {
        try {
            const studentSnap = await getCountFromServer(query(collection(db, 'profiles'), where('role', '==', 'student')));
            const paymentSnap = await getCountFromServer(query(collection(db, 'payment_requests'), where('status', '==', 'pending')));
            const courseSnap = await getCountFromServer(collection(db, 'courses'));
            const lectureSnap = await getCountFromServer(collection(db, 'lectures'));

            setStats({
                students: studentSnap.data().count,
                payments: paymentSnap.data().count,
                courses: courseSnap.data().count,
                lectures: lectureSnap.data().count
            });
        } catch (e) {
            console.error(e);
        }
    }

    function handlePageSelected(e: any) {
        setActiveTab(tabs[e.nativeEvent.position]);
    }

    function handleTabPress(index: number) {
        pagerRef.current?.setPage(index);
        setActiveTab(tabs[index]);
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => signOut()} style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>لوحة التحكم</Text>
            </View>

            <PagerView
                style={{ flex: 1 }}
                initialPage={0}
                ref={pagerRef}
                onPageSelected={handlePageSelected}
            >
                <View key="0" style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.welcomeCard}>
                            <Text style={styles.welcomeText}>مرحباً بك، د/ آيات</Text>
                            <Text style={styles.subText}>إحصائيات اليوم</Text>
                        </View>

                        <View style={styles.statsGrid}>
                            {[
                                { title: 'الطلاب', value: stats.students, color: '#3b82f6', icon: 'people' },
                                { title: 'طلبات الشحن', value: stats.payments, color: '#f59e0b', icon: 'wallet' },
                                { title: 'الكورسات', value: stats.courses, color: '#10b981', icon: 'book' },
                                { title: 'المحاضرات', value: stats.lectures, color: '#8b5cf6', icon: 'videocam' },
                            ].map((stat, index) => (
                                <View key={index} style={styles.statCard}>
                                    <View style={[styles.iconBox, { backgroundColor: `${stat.color}20` }]}>
                                        <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                                    </View>
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statTitle}>{stat.title}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
                <View key="1" style={{ flex: 1 }}>
                    <CoursesTab />
                </View>
                <View key="2" style={{ flex: 1 }}>
                    <StudentsTab />
                </View>
                <View key="3" style={{ flex: 1 }}>
                    <PaymentsTab />
                </View>
            </PagerView>

            {/* Bottom Tab Bar */}
            <View style={styles.tabBar}>
                <TabButton icon="home" label="الرئيسية" active={activeTab === 'home'} onPress={() => handleTabPress(0)} />
                <TabButton icon="book" label="الكورسات" active={activeTab === 'courses'} onPress={() => handleTabPress(1)} />
                <TabButton icon="people" label="الطلاب" active={activeTab === 'students'} onPress={() => handleTabPress(2)} />
                <TabButton icon="wallet" label="المدفوعات" active={activeTab === 'payments'} onPress={() => handleTabPress(3)} badge={stats.payments > 0 ? stats.payments : undefined} />
            </View>
        </SafeAreaView>
    );
}

function TabButton({ icon, label, active, onPress, badge }: any) {
    return (
        <TouchableOpacity onPress={onPress} style={styles.tabButton}>
            <View>
                <Ionicons name={active ? icon : `${icon}-outline`} size={24} color={active ? '#1e40af' : '#9ca3af'} />
                {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
            </View>
            <Text style={[styles.tabLabel, { color: active ? '#1e40af' : '#9ca3af' }]}>{label}</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        marginTop: 30 // Safe Area top roughly
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    logoutButton: {
        padding: 8,
    },
    content: {
        padding: 20,
    },
    welcomeCard: {
        backgroundColor: '#1e40af',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        elevation: 4
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
        textAlign: 'right',
    },
    subText: {
        color: '#bfdbfe',
        textAlign: 'right',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },
    statCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        width: '48%',
        alignItems: 'center',
        elevation: 2,
        marginBottom: 12
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    statTitle: {
        fontSize: 14,
        color: '#6b7280',
    },

    // Tab Bar
    tabBar: {
        flexDirection: 'row-reverse',
        backgroundColor: 'white',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        elevation: 8
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLabel: {
        fontSize: 10,
        marginTop: 4,
        fontWeight: 'bold'
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -10,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'white'
    },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});
