import { useState } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, CheckCircle, HelpCircle, Clock, RotateCcw } from 'lucide-react';
import { Course, Question, QuestionType } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore'; // We might handle saving here or pass it up
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

type CreateExamModalProps = {
    onClose: () => void;
    onSuccess: () => void;
    courses: Course[];
};

export default function CreateExamModal({ onClose, onSuccess, courses }: CreateExamModalProps) {
    const { profile } = useAuth();
    const [title, setTitle] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [price, setPrice] = useState<string>('0');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [maxAttempts, setMaxAttempts] = useState(1);
    const [expiresAt, setExpiresAt] = useState('');
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [loading, setLoading] = useState(false);

    const addQuestion = (type: QuestionType) => {
        const newQuestion: Partial<Question> = {
            id: crypto.randomUUID(),
            type,
            text: '',
            score: 1,
            options: type === 'mcq' ? ['', '', '', ''] : undefined,
            correct_options: type === 'mcq' ? [] : undefined,
        };
        setQuestions([...questions, newQuestion]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, updates: Partial<Question>) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], ...updates };
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].options) {
            newQuestions[qIndex].options![oIndex] = value;
        }
        setQuestions(newQuestions);
    };

    const toggleCorrectOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        const currentCorrect = newQuestions[qIndex].correct_options || [];

        if (currentCorrect.includes(oIndex)) {
            newQuestions[qIndex].correct_options = currentCorrect.filter((i: number) => i !== oIndex);
        } else {
            newQuestions[qIndex].correct_options = [...currentCorrect, oIndex];
        }
        setQuestions(newQuestions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validation
        if (!title.trim()) return alert('برجاء كتابة عنوان الامتحان');
        if (questions.length === 0) return alert('برجاء إضافة سؤال واحد على الأقل');
        if (isPaid && Number(price) <= 0) return alert('برجاء تحديد سعر الامتحان');

        // Questions Validation and Sanitization
        const sanitizedQuestions: Question[] = [];

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            // Validate Text
            if (!q.text || !q.text.trim()) {
                return alert(`السؤال رقم ${i + 1} فارغ`);
            }

            // Validate MCQ Structure
            if (q.type === 'mcq') {
                const options = q.options || [];
                // Check if options exist and are not empty strings
                if (options.some((o: string) => !o || !o.trim())) {
                    return alert(`جميع الاختيارات مطلوبة في السؤال رقم ${i + 1}`);
                }
                if (!q.correct_options || q.correct_options.length === 0) {
                    return alert(`اختر إجابة صحيحة واحدة على الأقل للسؤال رقم ${i + 1}`);
                }
            }

            // Create clean question object (removing any potential undefined keys)
            sanitizedQuestions.push({
                id: q.id || crypto.randomUUID(),
                type: q.type || 'mcq',
                text: q.text,
                score: Number(q.score) || 1,
                image_url: q.image_url || '', // Use empty string instead of undefined
                options: q.type === 'mcq' ? (q.options || []) : [],
                correct_options: q.type === 'mcq' ? (q.correct_options || []) : []
            });
        }

        setLoading(true);
        try {
            // Prepare Exam Data
            // Note: Firestore doesn't like 'undefined', so we use null or specific values
            const examData = {
                title: title.trim(),
                teacher_id: profile?.id!,
                course_id: selectedCourseId || null, // Convert empty string to null
                grade: (!selectedCourseId && selectedGrade) ? selectedGrade : null,
                is_paid: isPaid,
                price: isPaid ? Number(price) : 0,
                questions: sanitizedQuestions,
                max_attempts: Number(maxAttempts) || 1,
                expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
                created_at: new Date().toISOString()
            };

            await addDoc(collection(db, 'exams'), examData);
            alert('تم إنشاء الامتحان بنجاح');
            onSuccess();
        } catch (error: any) {
            console.error('Full Error:', error);
            alert(`حدث خطأ أثناء حفظ الامتحان: ${error.message || 'خطأ غير معروف'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">امتحان جديد</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8" dir="rtl">
                    {/* Exam Details */}
                    <div className="grid md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">عنوان الامتحان</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 dark:text-white"
                                placeholder="مثال: امتحان شامل على الوحدة الأولى"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">تابع لكورس (اختياري)</label>
                            <select
                                value={selectedCourseId}
                                onChange={e => {
                                    setSelectedCourseId(e.target.value);
                                    if (e.target.value) setSelectedGrade(''); // Clear grade if course selected
                                }}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 dark:text-white"
                            >
                                <option value="">-- امتحان منفصل --</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </div>

                        {!selectedCourseId && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">الصف الدراسي</label>
                                <select
                                    value={selectedGrade}
                                    onChange={e => setSelectedGrade(e.target.value)}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 dark:text-white"
                                >
                                    <option value="">-- اختر الصف --</option>
                                    <option value="first_prep">اول اعدادي</option>
                                    <option value="second_prep">تاني اعدادي</option>
                                    <option value="third_prep">تالت اعدادي</option>
                                    <option value="first_sec">اول ثانوي</option>
                                    <option value="second_sec">تاني ثانوي</option>
                                    <option value="third_sec">تالت ثانوي</option>
                                </select>
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPaid}
                                    onChange={e => setIsPaid(e.target.checked)}
                                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-600"
                                />
                                <span className="font-bold text-slate-700 dark:text-slate-300">امتحان مدفوع؟</span>
                            </label>

                            {isPaid && (
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 dark:text-white"
                                        placeholder="السعر"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Additional Settings */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-blue-500" />
                                عدد المحاولات المسموحة
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={maxAttempts}
                                onChange={e => setMaxAttempts(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-red-500" />
                                تاريخ الحذف التلقائي (اختياري)
                            </label>
                            <input
                                type="datetime-local"
                                value={expiresAt}
                                onChange={e => setExpiresAt(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Questions Builder */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xl font-black text-slate-800 dark:text-white">الأسئلة ({questions.length})</h4>
                        <div className="flex gap-2">
                            <button
                                onClick={() => addQuestion('mcq')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-bold transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>سؤال اختياري</span>
                            </button>
                            <button
                                onClick={() => addQuestion('essay')}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-bold transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>سؤال مقالي</span>
                            </button>
                        </div>
                    </div>

                    {questions.map((q, qIndex) => (
                        <div key={qIndex} className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6 relative group">
                            <button
                                onClick={() => removeQuestion(qIndex)}
                                className="absolute top-4 left-4 p-2 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>

                            <div className="flex items-start gap-4 mb-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                    {qIndex + 1}
                                </span>
                                <div className="flex-1 grid gap-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={q.text}
                                                onChange={e => updateQuestion(qIndex, { text: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white font-medium"
                                                placeholder="نص السؤال..."
                                            />
                                        </div>
                                        <div className="w-24">
                                            <input
                                                type="number"
                                                value={q.score}
                                                onChange={e => updateQuestion(qIndex, { score: Number(e.target.value) })}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white text-center font-bold"
                                                placeholder="الدرجة"
                                            />
                                        </div>
                                    </div>

                                    {/* Image URL (Optional) */}
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-5 h-5 text-slate-400" />
                                        <input
                                            type="url"
                                            value={q.image_url || ''}
                                            onChange={e => updateQuestion(qIndex, { image_url: e.target.value })}
                                            className="flex-1 px-3 py-2 text-sm bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none dark:text-slate-300"
                                            placeholder="رابط صورة للسؤال (اختياري)"
                                        />
                                    </div>

                                    {q.type === 'mcq' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                            {q.options?.map((option: string, oIndex: number) => (
                                                <div key={oIndex} className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => toggleCorrectOption(qIndex, oIndex)}
                                                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${q.correct_options?.includes(oIndex)
                                                            ? 'bg-green-500 border-green-500 text-white'
                                                            : 'border-slate-300 hover:border-green-400'
                                                            }`}
                                                    >
                                                        {q.correct_options?.includes(oIndex) && <CheckCircle className="w-4 h-4" />}
                                                    </button>
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                                                        className={`flex-1 px-4 py-2 rounded-xl border transition-all ${q.correct_options?.includes(oIndex)
                                                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                                            } dark:text-white`}
                                                        placeholder={`الاختيار ${oIndex + 1}`}
                                                    />
                                                </div>
                                            ))}
                                            <p className="text-xs text-slate-500 col-span-2 flex items-center gap-1">
                                                <HelpCircle className="w-3 h-3" />
                                                يمكنك تحديد أكثر من إجابة صحيحة
                                            </p>
                                        </div>
                                    )}

                                    {q.type === 'essay' && (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                                            <p className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                                                <HelpCircle className="w-4 h-4" />
                                                سيقوم الطالب برفع صورة للإجابة، وسيحتاج المعلم لتصحيحها يدوياً.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'جاري الحفظ...' : 'حفظ الامتحان'}
                    </button>
                </div>
            </div>
        </div>
    );
}
