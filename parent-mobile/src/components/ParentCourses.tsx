import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { useParent } from '../contexts/ParentContext';
import { db, Course } from '../lib/firebase';
import { collection, query, where, getDocs, documentId, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface CourseWithProgress extends Course {
    totalLectures: number;
    completedCount: number;
}

export default function ParentCourses() {
    const { student } = useParent();
    const { colors } = useTheme();
    const [courses, setCourses] = useState<CourseWithProgress[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!student) return;

        let unsubEnroll: () => void;
        let unsubProgress: () => void;

        const setupListeners = () => {
            // 1. Listen for Enrollments
            const enrollQ = query(collection(db, 'student_enrollments'), where('student_id', '==', student.id));
            unsubEnroll = onSnapshot(enrollQ, async (enrollSnap) => {
                const courseIds = enrollSnap.docs.map(d => d.data().course_id);

                if (courseIds.length === 0) {
                    setCourses([]);
                    setLoading(false);
                    return;
                }

                // Fetch Courses (One-time fetch usually sufficient)
                const coursesQ = query(collection(db, 'courses'), where(documentId(), 'in', courseIds.slice(0, 10)));
                const coursesSnap = await getDocs(coursesQ);
                const coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

                // 2. Listen for Progress (Real-time)
                const progressQ = query(
                    collection(db, 'lecture_progress'),
                    where('student_id', '==', student.id)
                );

                if (unsubProgress) unsubProgress();

                unsubProgress = onSnapshot(progressQ, async (progressSnap) => {
                    const completedLectureIds = new Set(
                        progressSnap.docs
                            .filter(d => d.data().completed === true)
                            .map(d => d.data().lecture_id)
                    );

                    const coursesWithStats = await Promise.all(coursesData.map(async (c) => {
                        const lecturesQ = query(collection(db, 'lectures'), where('course_id', '==', c.id));
                        const lecturesSnap = await getDocs(lecturesQ);
                        const total = lecturesSnap.size;

                        let completed = 0;
                        lecturesSnap.docs.forEach(doc => {
                            if (completedLectureIds.has(doc.id)) completed++;
                        });

                        return { ...c, totalLectures: total, completedCount: completed };
                    }));

                    coursesWithStats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    setCourses(coursesWithStats);
                    setLoading(false);
                });
            });
        };

        setupListeners();

        return () => {
            if (unsubEnroll) unsubEnroll();
            if (unsubProgress) unsubProgress();
        };
    }, [student]);

    if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.header, { color: colors.text }]}>اشتراكات الكورسات</Text>
            <FlatList
                data={courses}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<View style={styles.emptyContainer}>
                    <Ionicons name="school-outline" size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>الطالب غير مشترك في أي كورسات حالياً</Text>
                </View>}
                renderItem={({ item }) => {
                    const progressPercent = item.totalLectures > 0 ? item.completedCount / item.totalLectures : 0;
                    return (
                        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                            <Image source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/150' }} style={styles.image} />

                            <View style={styles.contentContainer}>
                                <View style={styles.headerRow}>
                                    <Text style={[styles.price, { color: colors.success }]}>{item.price} ج.م</Text>
                                    <Text style={[styles.grade, { color: colors.primary, backgroundColor: colors.cardHighlight }]}>{item.grade.replace(/_/g, ' ')}</Text>
                                </View>

                                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>

                                <View style={styles.progressSection}>
                                    <View style={styles.progressInfo}>
                                        <Text style={[styles.progressPercentage, { color: colors.primary }]}>{Math.round(progressPercent * 100)}%</Text>
                                        <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                                            {item.completedCount} من {item.totalLectures} درس
                                        </Text>
                                    </View>

                                    <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                                        <View style={[styles.progressBarFill, { width: `${progressPercent * 100}%`, backgroundColor: colors.primary }]} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { fontSize: 20, fontWeight: 'bold', margin: 20, marginBottom: 10, textAlign: 'right' },

    card: {
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 3,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    image: { width: '100%', height: 160, backgroundColor: '#e2e8f0' },

    contentContainer: { padding: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    grade: {
        fontSize: 12, fontWeight: 'bold',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden'
    },
    price: { fontSize: 16, fontWeight: '800' },

    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'right', lineHeight: 26 },

    progressSection: { marginTop: 4 },
    progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
    progressLabel: { fontSize: 12 },
    progressPercentage: { fontSize: 14, fontWeight: 'bold' },

    progressBarBg: { height: 8, borderRadius: 4, width: '100%', overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },

    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 16 },
    emptyText: { fontSize: 16, fontWeight: '500' }
});
