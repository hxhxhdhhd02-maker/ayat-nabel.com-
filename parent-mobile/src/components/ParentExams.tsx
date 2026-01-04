import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useParent } from '../contexts/ParentContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

type ExamResult = {
    id: string;
    student_id: string;
    exam_title: string;
    score: number;
    total_score: number;
    date: string;
};

export default function ParentExams() {
    const { student } = useParent();
    const { colors } = useTheme();
    const [results, setResults] = useState<ExamResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (student) loadExams();
    }, [student]);

    async function loadExams() {
        try {
            // 1. Get Submissions
            const q = query(
                collection(db, 'exam_submissions'),
                where('student_id', '==', student?.id)
            );
            const snapshot = await getDocs(q);
            const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            if (submissions.length === 0) {
                setResults([]);
                setLoading(false);
                return;
            }

            // 2. Get Exam Details
            const examIds = [...new Set(submissions.map((s: any) => s.exam_id))];
            const examsMap: Record<string, any> = {};

            // Fetch exams in batches of 10 (Firestore limit for 'in' query)
            for (let i = 0; i < examIds.length; i += 10) {
                const batch = examIds.slice(i, i + 10);
                if (batch.length > 0) {
                    const examsQ = query(collection(db, 'exams'), where(documentId(), 'in', batch));
                    const examsSnap = await getDocs(examsQ);
                    examsSnap.docs.forEach(doc => {
                        examsMap[doc.id] = doc.data();
                    });
                }
            }

            // 3. Map Results
            const mappedResults: ExamResult[] = submissions.map((sub: any) => {
                const exam = examsMap[sub.exam_id];
                if (!exam) return null;

                const maxScore = exam.questions?.reduce((sum: number, q: any) => sum + (q.score || 0), 0) || 0;

                return {
                    id: sub.id,
                    student_id: sub.student_id,
                    exam_title: exam.title,
                    score: sub.total_score,
                    total_score: maxScore,
                    date: sub.submitted_at
                };
            }).filter((r): r is ExamResult => r !== null);

            // Sort by date descending
            mappedResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setResults(mappedResults);

        } catch (e) {
            console.error('Error loading parent exams:', e);
        } finally {
            setLoading(false);
        }
    }

    const getScoreColor = (score: number, total: number) => {
        const percentage = total > 0 ? (score / total) * 100 : 0;
        if (percentage >= 85) return { color: '#166534', bg: '#dcfce7' }; // Green
        if (percentage >= 50) return { color: '#b45309', bg: '#fef3c7' }; // Orange
        return { color: '#991b1b', bg: '#fee2e2' }; // Red
    };

    if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.header, { color: colors.text }]}>نتائج الامتحانات</Text>
            <FlatList
                data={results}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لم يخض الطالب امتحانات بعد</Text>
                </View>}
                renderItem={({ item }) => {
                    const theme = getScoreColor(item.score, item.total_score);
                    return (
                        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                            <View style={[styles.scoreBox, { backgroundColor: theme.bg }]}>
                                <Text style={[styles.scoreValue, { color: theme.color }]}>
                                    {item.score}
                                </Text>
                                <View style={[styles.divider, { backgroundColor: theme.color }]} />
                                <Text style={[styles.totalScore, { color: theme.color }]}>{item.total_score}</Text>
                            </View>

                            <View style={styles.info}>
                                <Text style={[styles.examTitle, { color: colors.text }]}>{item.exam_title}</Text>
                                <View style={styles.dateRow}>
                                    <Text style={[styles.date, { color: colors.textSecondary }]}>{new Date(item.date).toLocaleDateString('ar-EG')}</Text>
                                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
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
        flexDirection: 'row-reverse',
        padding: 20,
        borderRadius: 20,
        marginBottom: 12,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2
    },
    scoreBox: {
        width: 72, height: 72, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        marginLeft: 20
    },
    scoreValue: { fontSize: 22, fontWeight: '900' },
    divider: { height: 2, width: 20, marginVertical: 2, opacity: 0.3 },
    totalScore: { fontSize: 14, fontWeight: 'bold', opacity: 0.8 },

    info: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
    examTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },

    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    date: { fontSize: 13, fontWeight: '500' },

    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 16 },
    emptyText: { fontSize: 16, fontWeight: '500' }
});
