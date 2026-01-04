import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, Exam, ExamSubmission } from '../lib/firebase';
import { doc, getDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, CheckCircle, Upload, X, Loader2, Save, Clock } from 'lucide-react';

export default function TakeExam() {
    const { profile } = useAuth();
    const [exam, setExam] = useState<Exam | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [accessDenied, setAccessDenied] = useState<{ reason: 'attempts' | 'expired', message: string, score?: number } | null>(null);

    // State for answers
    // Map questionId -> { selected_options: number[], essay_file: File | null, essay_preview: string | null }
    const [answers, setAnswers] = useState<Record<string, {
        selected_options: number[];
        essay_file: File | null;
        essay_preview: string | null;
    }>>({});

    useEffect(() => {
        const pathParts = window.location.pathname.split('/');
        const id = pathParts[pathParts.length - 1];
        if (id) {
            loadExam(id);
        }
    }, []);

    async function loadExam(id: string) {
        try {
            const docRef = doc(db, 'exams', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setExam({ id: docSnap.id, ...docSnap.data() } as Exam);
                // Initialize answers state
                const initialAnswers: any = {};
                const examData = docSnap.data() as Exam;
                examData.questions.forEach(q => {
                    initialAnswers[q.id] = {
                        selected_options: [],
                        essay_file: null,
                        essay_preview: null
                    };
                });
                setAnswers(initialAnswers);

                // Check Expiration
                const currentExamData = docSnap.data() as Exam;
                if (currentExamData.expires_at && new Date(currentExamData.expires_at) < new Date()) {
                    setAccessDenied({
                        reason: 'expired',
                        message: 'عفواً، لقد انتهى وقت هذا الامتحان ولم يعد متاحاً.'
                    });
                    setLoading(false);
                    return;
                }

                // Check attempts
                const submissionsQ = query(
                    collection(db, 'exam_submissions'),
                    where('exam_id', '==', id),
                    where('student_id', '==', profile?.id)
                );
                const submissionsSnap = await getDocs(submissionsQ);
                const submissions = submissionsSnap.docs.map(d => d.data() as ExamSubmission);

                const attempts = submissions.length;
                const maxAttempts = currentExamData.max_attempts || 1;

                if (attempts >= maxAttempts) {
                    const lastSubmission = submissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];
                    setAccessDenied({
                        reason: 'attempts',
                        message: `لقد استنفذت عدد المحاولات المسموحة لهذا الامتحان (${maxAttempts} محاولات).`,
                        score: lastSubmission?.total_score
                    });
                    setLoading(false);
                    return;
                }

            } else {
                alert('الامتحان غير موجود');
                window.location.href = '/dashboard';
            }
        } catch (error) {
            console.error('Error loading exam:', error);
            alert('حدث خطأ أثناء تحميل الامتحان');
        } finally {
            setLoading(false);
        }
    }

    const handleOptionToggle = (questionId: string, optionIndex: number) => {
        setAnswers(prev => {
            const current = prev[questionId].selected_options;
            let newSelected;

            if (current.includes(optionIndex)) {
                newSelected = current.filter(i => i !== optionIndex);
            } else {
                // If it's single select (based on assumption or logic), normally we'd clear others.
                // But user requirement says "some questions have two correct answers".
                // We'll allow multiple selection for all to be safe, or we could strict it if we knew for sure.
                // Let's allow multiple selection for all MCQs as a safe default for now, 
                // or maybe strictly restrict if we want to mimic "Single Choice".
                // Given the prompt "Is there two correct answers", Checkbox behavior is best.
                newSelected = [...current, optionIndex];
            }

            return {
                ...prev,
                [questionId]: {
                    ...prev[questionId],
                    selected_options: newSelected
                }
            };
        });
    };

    const handleFileChange = (questionId: string, file: File) => {
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setAnswers(prev => ({
                ...prev,
                [questionId]: {
                    ...prev[questionId],
                    essay_file: file,
                    essay_preview: previewUrl
                }
            }));
        }
    };

    const handleSubmit = async () => {
        if (!exam || !profile) return;

        if (!confirm('هل أنت متأكد من إنهاء الامتحان وتسليم الإجابات؟')) return;

        setSubmitting(true);
        try {
            const submissionAnswers: any[] = [];
            let totalAutoScore = 0;

            for (const q of exam.questions) {
                const ans = answers[q.id];
                let essayUrl: string | null = null;

                // Upload Essay Image if exists
                if (q.type === 'essay' && ans.essay_file) {
                    try {
                        const storageRef = ref(storage, `exam_submissions/${profile.id}/${exam.id}/${q.id}_${Date.now()}`);
                        const snapshot = await uploadBytes(storageRef, ans.essay_file);
                        essayUrl = await getDownloadURL(snapshot.ref);
                    } catch (uploadError) {
                        console.error('Image upload failed:', uploadError);
                        throw new Error('فشل رفع صورة الإجابة. تأكد من اتصال الإنترنت وحاول مرة أخرى.');
                    }
                }

                let questionScore = 0;
                if (q.type === 'mcq') {
                    const selectedSorted = [...ans.selected_options].sort();
                    const correctSorted = [...(q.correct_options || [])].sort();
                    // Basic equality check for arrays
                    const isCorrect = JSON.stringify(selectedSorted) === JSON.stringify(correctSorted);

                    if (isCorrect) {
                        questionScore = q.score;
                        totalAutoScore += q.score;
                    }
                }

                // Construct answer object strictly without undefined values
                const answerEntry: any = {
                    question_id: q.id
                };

                if (q.type === 'mcq') {
                    answerEntry.selected_options = ans.selected_options;
                    answerEntry.score = questionScore;
                }

                if (essayUrl) {
                    answerEntry.essay_image_url = essayUrl;
                }

                submissionAnswers.push(answerEntry);
            }

            // Create Submission Record
            const submissionData = {
                exam_id: exam.id,
                student_id: profile.id,
                answers: submissionAnswers,
                status: 'pending',
                total_score: totalAutoScore,
                submitted_at: new Date().toISOString()
            };

            await addDoc(collection(db, 'exam_submissions'), submissionData);

            alert('تم تسليم الامتحان بنجاح!');
            window.location.href = '/dashboard';

        } catch (error: any) {
            console.error('Error submitting exam:', error);
            alert(`حدث خطأ أثناء تسليم الامتحان: ${error.message || 'خطأ غير معروف'}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl text-center border border-slate-200 dark:border-slate-700">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        {accessDenied.reason === 'expired' ? <Clock className="w-10 h-10 text-red-600" /> : <X className="w-10 h-10 text-red-600" />}
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4">
                        {accessDenied.reason === 'expired' ? 'انتهى الوقت' : 'تم أداء الامتحان'}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-8 font-medium">
                        {accessDenied.message}
                    </p>

                    {accessDenied.score !== undefined && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 mb-8">
                            <p className="text-sm text-slate-500 mb-1">درجتك السابقة</p>
                            <p className="text-4xl font-black text-blue-600">{accessDenied.score}</p>
                        </div>
                    )}

                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        العودة للرئيسية
                    </button>
                </div>
            </div>
        );
    }

    if (!exam) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between" dir="rtl">
                    <div className="flex items-center gap-4">
                        <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                        </button>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white truncate max-w-[200px] md:max-w-md">
                            {exam.title}
                        </h1>
                    </div>
                    {/* Timer could go here */}
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-8" dir="rtl">
                {exam.questions.map((q, index) => (
                    <div key={q.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex gap-4 mb-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold">
                                {index + 1}
                            </span>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{q.text}</h3>
                                {q.image_url && (
                                    <img src={q.image_url} alt="Question" className="max-w-full rounded-xl mb-4 border border-slate-200 dark:border-slate-700" />
                                )}
                                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                    {q.score} درجة
                                </span>
                            </div>
                        </div>

                        <div className="mr-12">
                            {q.type === 'mcq' && (
                                <div className="space-y-3">
                                    {q.options?.map((option, optIndex) => (
                                        <label
                                            key={optIndex}
                                            className={`flex items-center gap-3 p-4 rounded-xl bordercursor-pointer transition-all ${answers[q.id]?.selected_options.includes(optIndex)
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500'
                                                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${answers[q.id]?.selected_options.includes(optIndex)
                                                ? 'bg-blue-600 border-blue-600'
                                                : 'border-slate-400 bg-white'
                                                }`}>
                                                {answers[q.id]?.selected_options.includes(optIndex) && (
                                                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                                                )}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={answers[q.id]?.selected_options.includes(optIndex)}
                                                onChange={() => handleOptionToggle(q.id, optIndex)}
                                            />
                                            <span className="text-slate-700 dark:text-slate-200 font-medium">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {q.type === 'essay' && (
                                <div className="space-y-4">
                                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center transition-colors hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => e.target.files?.[0] && handleFileChange(q.id, e.target.files[0])}
                                            className="hidden"
                                            id={`file-${q.id}`}
                                        />
                                        <label htmlFor={`file-${q.id}`} className="cursor-pointer flex flex-col items-center gap-2">
                                            <Upload className="w-8 h-8 text-slate-400" />
                                            <span className="text-slate-600 dark:text-slate-300 font-bold">ارفاق صورة الإجابة</span>
                                            <span className="text-xs text-slate-400">اضغط لرفع صورة من جهازك</span>
                                        </label>
                                    </div>

                                    {answers[q.id]?.essay_preview && (
                                        <div className="relative inline-block">
                                            <img
                                                src={answers[q.id].essay_preview!}
                                                alt="Preview"
                                                className="max-h-60 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                                            />
                                            <button
                                                onClick={() => setAnswers(prev => ({
                                                    ...prev,
                                                    [q.id]: { ...prev[q.id], essay_file: null, essay_preview: null }
                                                }))}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </main>

            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shadow-lg z-20">
                <div className="max-w-3xl mx-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>جاري التسليم...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                <span>إنهاء الامتحان وتسليم الإجابات</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
