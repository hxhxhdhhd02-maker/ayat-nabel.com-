import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { db, Profile } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function StudentsTab() {
    const [students, setStudents] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadStudents();
    }, []);

    async function loadStudents() {
        try {
            const q = query(
                collection(db, 'profiles'),
                where('role', '==', 'student')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
            // Sort in memory
            data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setStudents(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const filteredStudents = students.filter(s =>
        s.full_name_arabic.includes(searchTerm) ||
        s.phone_number.includes(searchTerm)
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="بحث عن طالب..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    textAlign="right"
                />
            </View>

            <Text style={styles.countText}>الطلاب ({filteredStudents.length})</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#1e40af" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredStudents}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.row}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{item.full_name_arabic.charAt(0)}</Text>
                                </View>
                                <View style={styles.info}>
                                    <Text style={styles.name}>{item.full_name_arabic}</Text>
                                    <Text style={styles.grade}>{item.grade.replace(/_/g, ' ')}</Text>
                                </View>
                            </View>

                            <View style={styles.detailsRow}>
                                <View style={styles.detailItem}>
                                    <Ionicons name="call-outline" size={16} color="#6b7280" />
                                    <Text style={styles.detailText}>{item.phone_number}</Text>
                                </View>
                                {item.parent_phone && (
                                    <View style={styles.detailItem}>
                                        <Ionicons name="people-outline" size={16} color="#059669" />
                                        <Text style={[styles.detailText, { color: '#059669' }]}>{item.parent_phone}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                    contentContainerStyle={{ padding: 16 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    searchContainer: { margin: 16, backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', height: 50, elevation: 2 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontSize: 16 },
    countText: { marginRight: 20, marginBottom: 8, textAlign: 'right', fontWeight: 'bold', color: '#374151' },
    card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1 },
    row: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: '#1e40af' },
    info: { alignItems: 'flex-end', flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    grade: { fontSize: 14, color: '#6b7280', marginTop: 2 },
    detailsRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', gap: 12 },
    detailItem: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f9fafb', padding: 6, borderRadius: 8, paddingHorizontal: 10, marginLeft: 8 },
    detailText: { marginRight: 6, fontSize: 13, color: '#4b5563' }
});
