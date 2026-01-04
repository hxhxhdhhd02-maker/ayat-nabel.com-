import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useParent } from '../contexts/ParentContext';
import { db, PaymentRequest } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function ParentWallet() {
    const { student } = useParent();
    const { colors } = useTheme();
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!student) return;

        const q = query(
            collection(db, 'payment_requests'),
            where('student_id', '==', student.id),
            orderBy('created_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRequest)));
            setLoading(false);
        }, (error) => {
            console.error(error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [student]);

    const renderStatus = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                        <Ionicons name="checkmark-circle" size={14} color="#166534" />
                        <Text style={[styles.statusText, { color: '#166534' }]}>مقبول</Text>
                    </View>
                );
            case 'rejected':
                return (
                    <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
                        <Ionicons name="close-circle" size={14} color="#991b1b" />
                        <Text style={[styles.statusText, { color: '#991b1b' }]}>مرفوض</Text>
                    </View>
                );
            default:
                return (
                    <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
                        <Ionicons name="time" size={14} color="#92400e" />
                        <Text style={[styles.statusText, { color: '#92400e' }]}>قيد المراجعة</Text>
                    </View>
                );
        }
    };

    if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Balance Card - Always Dark for aesthetic appeal */}
            <LinearGradient
                colors={['#0f172a', '#334155']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.balanceCard}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cardLabel}>الرصيد المتاح</Text>
                    <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.5)" style={{ transform: [{ rotate: '90deg' }] }} />
                </View>

                <Text style={styles.balanceValue}>{student?.wallet_balance || 0} <Text style={styles.currency}>ج.م</Text></Text>

                <View style={styles.cardFooter}>
                    <Text style={styles.cardNumber}>**** **** **** {student?.phone_number?.slice(-4) || '0000'}</Text>
                    <View style={styles.mastercardCircle}>
                        <View style={[styles.circle, { backgroundColor: '#eb001b' }]} />
                        <View style={[styles.circle, { backgroundColor: '#f79e1b', marginLeft: -12 }]} />
                    </View>
                </View>
            </LinearGradient>

            <Text style={[styles.historyTitle, { color: colors.text }]}>سجل العمليات</Text>

            <FlatList
                data={requests}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لا توجد عمليات سابقة</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={[styles.itemCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.cardHighlight }]}>
                            <Ionicons
                                name={item.status === 'approved' ? "arrow-down" : "refresh"}
                                size={20}
                                color={item.status === 'approved' ? colors.success : colors.primary}
                            />
                        </View>

                        <View style={styles.itemDetails}>
                            <View style={styles.rowTop}>
                                <Text style={[styles.amount, { color: colors.text }]}>+ {item.amount} ج.م</Text>
                                <Text style={[styles.date, { color: colors.textSecondary }]}>{new Date(item.created_at).toLocaleDateString('ar-EG')}</Text>
                            </View>

                            <View style={styles.rowBottom}>
                                {renderStatus(item.status)}
                                <Text style={[styles.sender, { color: colors.textSecondary }]}> {item.sender_phone}</Text>
                            </View>
                        </View>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },

    // Credit Card Style
    balanceCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
        minHeight: 180,
        justifyContent: 'space-between'
    },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
    balanceValue: { color: 'white', fontSize: 40, fontWeight: 'bold', marginVertical: 10, textAlign: 'right' },
    currency: { fontSize: 20, fontWeight: '400', color: '#cbd5e1' },
    cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    cardNumber: { color: '#94a3b8', fontSize: 16, letterSpacing: 2 },
    mastercardCircle: { flexDirection: 'row' },
    circle: { width: 24, height: 24, borderRadius: 12, opacity: 0.8 },

    historyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'right' },

    itemCard: {
        flexDirection: 'row-reverse',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
    },
    iconContainer: {
        width: 48, height: 48, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center',
        marginLeft: 16
    },
    itemDetails: { flex: 1 },
    rowTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 6 },
    amount: { fontSize: 16, fontWeight: 'bold' },
    date: { fontSize: 12 },
    rowBottom: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    sender: { fontSize: 12 },

    statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    statusText: { fontSize: 12, fontWeight: 'bold' },

    emptyState: { alignItems: 'center', marginTop: 40, gap: 10 },
    emptyText: { fontSize: 16 }
});
