import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { db, Course, Lecture } from '../lib/firebase';
import { collection, query, getDocs, addDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function CoursesTab() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [courseLectures, setCourseLectures] = useState<Lecture[]>([]);
    const [showLectureModal, setShowLectureModal] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [grade, setGrade] = useState('اول_ثانوي');
    const [price, setPrice] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');

    // Lecture Form
    const [lecTitle, setLecTitle] = useState('');
    const [lecDesc, setLecDesc] = useState('');
    const [lecYoutube, setLecYoutube] = useState('');
    const [lecPdf, setLecPdf] = useState('');
    const [lecDuration, setLecDuration] = useState('');

    useEffect(() => {
        loadCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            loadLectures(selectedCourse.id);
        }
    }, [selectedCourse]);

    async function loadCourses() {
        try {
            const q = query(collection(db, 'courses'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setCourses(data);
        } catch (error) {
            console.error(error);
            Alert.alert('خطأ', 'حدث خطأ أثناء تحميل الكورسات');
        } finally {
            setLoading(false);
        }
    }

    async function loadLectures(courseId: string) {
        try {
            const q = query(collection(db, 'lectures'), where('course_id', '==', courseId));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture));
            data.sort((a, b) => a.order_index - b.order_index);
            setCourseLectures(data);
        } catch (error) {
            console.error(error);
        }
    }

    async function handleCreateCourse() {
        if (!title || !price || !grade) {
            Alert.alert('تنبيه', 'يرجى ملء الحقول الأساسية');
            return;
        }

        try {
            await addDoc(collection(db, 'courses'), {
                title,
                description,
                grade,
                price: parseFloat(price),
                thumbnail_url: thumbnailUrl,
                teacher_id: user?.uid,
                created_at: new Date().toISOString()
            });
            setShowAddModal(false);
            resetForm();
            loadCourses();
            Alert.alert('نجاح', 'تم إنشاء الكورس بنجاح');
        } catch (error) {
            Alert.alert('خطأ', 'فشل في إنشاء الكورس');
        }
    }

    async function handleCreateLecture() {
        if (!lecTitle || !lecYoutube || !selectedCourse) return;

        try {
            await addDoc(collection(db, 'lectures'), {
                course_id: selectedCourse.id,
                title: lecTitle,
                description: lecDesc,
                youtube_url: lecYoutube,
                pdf_url: lecPdf,
                order_index: courseLectures.length,
                duration_seconds: parseInt(lecDuration) || 0,
                created_at: new Date().toISOString()
            });
            setShowLectureModal(false);
            // reset lecture form
            setLecTitle(''); setLecDesc(''); setLecYoutube(''); setLecPdf(''); setLecDuration('');
            loadLectures(selectedCourse.id);
            Alert.alert('نجاح', 'تم إضافة المحاضرة');
        } catch (error) {
            Alert.alert('خطأ', 'فشل إضافة المحاضرة');
        }
    }

    function resetForm() {
        setTitle(''); setDescription(''); setPrice(''); setThumbnailUrl('');
    }

    async function handleDeleteCourse(id: string) {
        Alert.alert('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الكورس؟', [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: 'حذف', style: 'destructive', onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'courses', id));
                        loadCourses();
                    } catch (error) {
                        Alert.alert('خطأ', 'فشل الحذف');
                    }
                }
            }
        ]);
    }

    async function handleDeleteLecture(id: string) {
        try {
            await deleteDoc(doc(db, 'lectures', id));
            if (selectedCourse) loadLectures(selectedCourse.id);
        } catch (error) {
            Alert.alert('خطأ', 'فشل الحذف');
        }
    }

    if (selectedCourse) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => setSelectedCourse(null)} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1e40af" />
                    </TouchableOpacity>
                    <Text style={styles.sectionTitle}>{selectedCourse.title}</Text>
                    <TouchableOpacity onPress={() => setShowLectureModal(true)} style={styles.addButtonInfo}>
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={courseLectures}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item, index }) => (
                        <View style={styles.lectureCard}>
                            <View style={styles.lectureIcon}>
                                <Text style={styles.lectureIndex}>{index + 1}</Text>
                            </View>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.itemTitle}>{item.title}</Text>
                                <Text style={styles.itemSubtitle}>مدة: {Math.floor(item.duration_seconds / 60)} دقيقة</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteLecture(item.id)}>
                                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                />

                {/* Add Lecture Modal */}
                <Modal visible={showLectureModal} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>إضافة محاضرة جديدة</Text>
                            <TextInput style={styles.input} placeholder="عنوان المحاضرة" value={lecTitle} onChangeText={setLecTitle} />
                            <TextInput style={styles.input} placeholder="رابط يوتيوب" value={lecYoutube} onChangeText={setLecYoutube} />
                            <TextInput style={styles.input} placeholder="المدة (ثواني)" value={lecDuration} onChangeText={setLecDuration} keyboardType="numeric" />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setShowLectureModal(false)} style={styles.cancelBtn}>
                                    <Text style={styles.btnText}>إلغاء</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleCreateLecture} style={styles.confirmBtn}>
                                    <Text style={[styles.btnText, { color: 'white' }]}>يتم إضافة</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>الكورسات الحالية</Text>
                <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
                    <Text style={styles.addButtonText}>جديد +</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={courses}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 10 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.courseCard}
                        onPress={() => setSelectedCourse(item)}
                    >
                        <Image
                            source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/150' }}
                            style={styles.courseImage}
                        />
                        <View style={styles.courseInfo}>
                            <Text style={styles.courseTitle}>{item.title}</Text>
                            <Text style={styles.courseGrade}>{item.grade.replace(/_/g, ' ')}</Text>
                            <Text style={styles.coursePrice}>{item.price} ج.م</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteCourse(item.id)} style={styles.deleteBtn}>
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
            />

            {/* Add Course Modal */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalScroll}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>إنشاء كورس جديد</Text>

                            <Text style={styles.label}>العنوان</Text>
                            <TextInput style={styles.input} value={title} onChangeText={setTitle} />

                            <Text style={styles.label}>السعر</Text>
                            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />

                            <Text style={styles.label}>الصورة (رابط)</Text>
                            <TextInput style={styles.input} value={thumbnailUrl} onChangeText={setThumbnailUrl} />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.cancelBtn}>
                                    <Text style={styles.btnText}>إلغاء</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleCreateCourse} style={styles.confirmBtn}>
                                    <Text style={[styles.btnText, { color: 'white' }]}>إنشاء</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
    addButton: { backgroundColor: '#1e40af', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    addButtonText: { color: 'white', fontWeight: 'bold' },
    addButtonInfo: { backgroundColor: '#1e40af', padding: 8, borderRadius: 8 },
    backButton: { padding: 8 },
    courseCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 12, overflow: 'hidden', flexDirection: 'row-reverse', elevation: 2 },
    courseImage: { width: 100, height: 100, backgroundColor: '#ddd' },
    courseInfo: { flex: 1, padding: 12, justifyContent: 'center', alignItems: 'flex-end' },
    courseTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    courseGrade: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
    coursePrice: { fontSize: 14, fontWeight: 'bold', color: '#1e40af' },
    deleteBtn: { padding: 12, justifyContent: 'center' },

    lectureCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, elevation: 1, marginBottom: 8 },
    lectureIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    lectureIndex: { color: '#1e40af', fontWeight: 'bold' },
    itemTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
    itemSubtitle: { fontSize: 13, color: 'gray', textAlign: 'right' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalScroll: { flexGrow: 1, justifyContent: 'center' },
    modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { marginBottom: 5, fontWeight: 'bold', textAlign: 'right', color: '#374151' },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, marginBottom: 15, textAlign: 'right' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    cancelBtn: { padding: 12, flex: 1, alignItems: 'center', marginRight: 10, backgroundColor: '#f3f4f6', borderRadius: 8 },
    confirmBtn: { padding: 12, flex: 1, alignItems: 'center', backgroundColor: '#1e40af', borderRadius: 8 },
    btnText: { fontWeight: 'bold' }
});
