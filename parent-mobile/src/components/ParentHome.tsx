import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useParent } from '../contexts/ParentContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function ParentHome() {
    const { student } = useParent();
    const { colors } = useTheme();

    if (!student) return null;

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Header Card with Gradient */}
            <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerCard}
            >
                <View style={styles.avatarContainer}>
                    <View style={[styles.avatar, { backgroundColor: colors.card }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>{student.full_name_arabic.charAt(0)}</Text>
                    </View>
                    <View style={[styles.onlineBadge, { borderColor: colors.primary }]} />
                </View>

                <Text style={styles.welcomeText}>مرحباً بك!</Text>
                <Text style={styles.studentName}>{student.full_name_arabic}</Text>

                <View style={styles.gradeTag}>
                    <Ionicons name="school" size={16} color="#dbeafe" />
                    <Text style={styles.gradeText}>{student.grade.replace(/_/g, ' ')}</Text>
                </View>
            </LinearGradient>

            {/* Quick Stats Grid */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <View style={[styles.iconBox, { backgroundColor: colors.cardHighlight }]}>
                        <Ionicons name="wallet" size={24} color={colors.success} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{student.wallet_balance || 0} ج.م</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>رصيد المحفظة</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <View style={[styles.iconBox, { backgroundColor: colors.cardHighlight }]}>
                        <Ionicons name="library" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>نشط</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>حالة الطالب</Text>
                </View>
            </View>

            {/* Info Section */}
            <View style={[styles.infoSection, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>نظرة عامة</Text>
                    <Ionicons name="stats-chart" size={20} color={colors.textSecondary} />
                </View>

                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    أهلاً بك في تطبيق ولي الأمر. يمكنك هنا متابعة المستوى الدراسي، درجات الامتحانات، ومتابعة المحفظة المالية للطالب بكل سهولة.
                </Text>

                <View style={styles.actionRow}>
                    <View style={styles.actionItem}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>بيانات محدثة</Text>
                    </View>
                    <View style={styles.actionItem}>
                        <Ionicons name="notifications" size={20} color={colors.warning} />
                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>تنبيهات فورية</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerCard: {
        padding: 24,
        paddingTop: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
        marginBottom: 20
    },
    avatarContainer: { position: 'relative', marginBottom: 12 },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
    },
    avatarText: { fontSize: 32, fontWeight: 'bold' },
    onlineBadge: {
        position: 'absolute', bottom: 2, right: 2, width: 20, height: 20,
        backgroundColor: '#10b981', borderRadius: 10, borderWidth: 3
    },
    welcomeText: { color: '#dbeafe', fontSize: 16, marginBottom: 4 },
    studentName: { fontSize: 26, fontWeight: '800', color: 'white', marginBottom: 12, textAlign: 'center' },
    gradeTag: {
        flexDirection: 'row-reverse', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 6,
        borderRadius: 20, gap: 6
    },
    gradeText: { color: 'white', fontSize: 14, fontWeight: '600' },

    statsContainer: {
        flexDirection: 'row-reverse',
        paddingHorizontal: 16,
        marginTop: -30, // Overlap effect
        gap: 12
    },
    statCard: {
        flex: 1,
        borderRadius: 20, padding: 16,
        alignItems: 'center',
        shadowOpacity: 0.05, shadowRadius: 10, elevation: 4
    },
    iconBox: {
        width: 48, height: 48, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center', marginBottom: 12
    },
    statValue: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
    statLabel: { fontSize: 12 },

    infoSection: {
        margin: 16, borderRadius: 20, padding: 20,
        shadowOpacity: 0.03, shadowRadius: 5, elevation: 2,
        marginTop: 20
    },
    sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold' },
    infoText: { fontSize: 14, lineHeight: 24, textAlign: 'right', marginBottom: 20 },
    actionRow: { flexDirection: 'row-reverse', gap: 16 },
    actionItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    actionText: { fontSize: 13, fontWeight: '500' }
});
