import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, Alert, ActivityIndicator } from 'react-native';
import { db, PaymentRequest } from '../lib/firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc, where, addDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function PaymentsTab() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, []);

    async function loadRequests() {
        try {
            const q = query(
                collection(db, 'payment_requests'),
                orderBy('created_at', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRequest));
            setRequests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(request: PaymentRequest) {
        Alert.alert(
            'تأكيد القبول',
            `قبول شحن ${request.amount} جنيه للطالب ${request.student_name}؟`,
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'قبول',
                    onPress: async () => {
                        try {
                            // Update request
                            await updateDoc(doc(db, 'payment_requests', request.id), {
                                status: 'approved',
                                processed_at: new Date().toISOString(),
                                processed_by: user?.uid
                            });

                            // Update wallet
                            const studentQ = query(collection(db, 'profiles'), where('__name__', '==', request.student_id));
                            const studentSnap = await getDocs(studentQ);
                            if (!studentSnap.empty) {
                                const studentData = studentSnap.docs[0].data();
                                const newBalance = (studentData.wallet_balance || 0) + request.amount;
                                await updateDoc(doc(db, 'profiles', request.student_id), { wallet_balance: newBalance });

                                // Notify
                                await addDoc(collection(db, 'notifications'), {
                                    student_id: request.student_id,
                                    type: 'wallet_credited',
                                    title: 'تم شحن محفظتك',
                                    message: `تم إضافة ${request.amount} جنيه`,
                                    amount: request.amount,
                                    read: false,
                                    created_at: new Date().toISOString()
                                });
                            }
                            Alert.alert('نجاح', 'تم شحن المحفظة');
                            loadRequests();
                        } catch (e) {
                            Alert.alert('خطأ', 'حدث خطأ ما');
                        }
                    }
                }
            ]
        );
    }

    async function handleReject(request: PaymentRequest) {
        Alert.alert(
            'تأكيد الرفض',
            'هل أنت متأكد من رفض الطلب؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'رفض', style: 'destructive',
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, 'payment_requests', request.id), {
                                status: 'rejected',
                                processed_at: new Date().toISOString(),
                                processed_by: user?.uid
                            });
                            loadRequests();
                        } catch (e) { Alert.alert('خطأ'); }
                    }
                }
            ]
        );
    }

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const processedRequests = requests.filter(r => r.status !== 'pending');

    return (
        <View style={styles.container}>
            {loading ? <ActivityIndicator size="large" color="#1e40af" style={{ marginTop: 20 }} /> : (
                <FlatList
                    contentContainerStyle={{ padding: 16 }}
                    data={[...pendingRequests, ...processedRequests]} // Manual sectioning via header in render? No, just list all but distinguishing visually
                    keyExtractor={item => item.id}
                    ListHeaderComponent={() => (
                        <Text style={styles.header}>الطلبات المعلقة ({pendingRequests.length})</Text>
                    )}
                    renderItem={({ item }) => {
                        const isPending = item.status === 'pending';
                        return (
                            <View style={[styles.card, !isPending && styles.processedCard]}>
                                <View style={styles.row}>
                                    <TouchableOpacity onPress={() => setSelectedImage(item.screenshot_url)}>
                                        <Image source={{ uri: item.screenshot_url }} style={styles.screenshot} />
                                    </TouchableOpacity>
                                    <View style={styles.info}>
                                        <Text style={styles.name}>{item.student_name}</Text>
                                        <Text style={styles.amount}>{item.amount} ج.م</Text>
                                        <Text style={styles.phone}>{item.sender_phone}</Text>
                                        {!isPending && (
                                            <Text style={[styles.status, { color: item.status === 'approved' ? 'green' : 'red' }]}>
                                                {item.status === 'approved' ? 'تم القبول' : 'مرفوض'}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {isPending && (
                                    <View style={styles.actions}>
                                        <TouchableOpacity onPress={() => handleReject(item)} style={[styles.btn, styles.rejectBtn]}>
                                            <Text style={styles.btnText}>رفض</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleApprove(item)} style={[styles.btn, styles.approveBtn]}>
                                            <Text style={styles.btnText}>قبول</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    }}
                />
            )}

            <Modal visible={!!selectedImage} transparent={true} animationType="fade">
                <View style={styles.modalBg}>
                    <TouchableOpacity style={styles.closeModal} onPress={() => setSelectedImage(null)}>
                        <Ionicons name="close-circle" size={40} color="white" />
                    </TouchableOpacity>
                    {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'right', color: '#1f2937' },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 12, elevation: 2, marginBottom: 12 },
    processedCard: { opacity: 0.7, backgroundColor: '#f9fafb' },
    row: { flexDirection: 'row-reverse', gap: 12 },
    screenshot: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
    info: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
    name: { fontWeight: 'bold', fontSize: 16, color: '#111827' },
    amount: { fontSize: 18, fontWeight: 'bold', color: '#059669', marginVertical: 4 },
    phone: { color: '#6b7280' },
    status: { fontWeight: 'bold', marginTop: 4 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    btn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
    rejectBtn: { backgroundColor: '#fee2e2' },
    approveBtn: { backgroundColor: '#dcfce7' },
    btnText: { fontWeight: 'bold', color: '#374151' },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: '100%', height: '80%' },
    closeModal: { position: 'absolute', top: 40, right: 20, zIndex: 10 }
});
