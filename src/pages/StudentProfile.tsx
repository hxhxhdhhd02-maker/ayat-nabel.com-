import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, Course, Lecture, LectureProgress, Exam, ExamSubmission } from '../lib/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { BookOpen, Calendar, ArrowLeft, Star, Trophy, Target, CheckCircle, GraduationCap, ClipboardList, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingLetters from '../components/FloatingLetters';
import ProfileImage from '../components/ProfileImage';

type CourseWithProgress = Course & {
    totalLectures: number;
    completedLectures: number;
};

type ExamHistory = {
    examTitle: string;
    totalScore: number;
    studentScore: number;
    wrongAnswers: number; // Count of wrong answers (for MCQs only)
    submittedAt: string;
    status: 'pending' | 'graded';
    maxScore: number;
};

export default function StudentProfile() {
    const { profile, signOut } = useAuth();
    const [enrolledCourses, setEnrolledCourses] = useState<CourseWithProgress[]>([]);
    const [examHistory, setExamHistory] = useState<ExamHistory[]>([]);
    const [totalCourses, setTotalCourses] = useState(0);
    const [completedCourses, setCompletedCourses] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) {
            loadStats();
        }
    }, [profile]);

    async function loadStats() {
        try {
            const enrollmentsQ = query(
                collection(db, 'student_enrollments'),
                where('student_id', '==', profile?.id)
            );
            const enrollmentsSnap = await getDocs(enrollmentsQ);
            const courseIds = enrollmentsSnap.docs.map(doc => doc.data().course_id);

            setTotalCourses(courseIds.length);

            if (courseIds.length > 0) {
                const coursesQ = query(collection(db, 'courses'), where(documentId(), 'in', courseIds));
                const coursesSnap = await getDocs(coursesQ);
                const coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

                // Load progress for each course
                const coursesWithProgress = await Promise.all(
                    coursesData.map(async (course) => {
                        const lecturesQ = query(collection(db, 'lectures'), where('course_id', '==', course.id));
                        const lecturesSnap = await getDocs(lecturesQ);
                        const lecturesData = lecturesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture));
                        const lectureIds = lecturesData.map(l => l.id);

                        let completedCount = 0;
                        if (lectureIds.length > 0) {
                            const progressQ = query(
                                collection(db, 'lecture_progress'),
                                where('student_id', '==', profile?.id),
                                where('completed', '==', true)
                            );
                            const progressSnap = await getDocs(progressQ);
                            const progressData = progressSnap.docs
                                .map(doc => doc.data() as LectureProgress)
                                .filter(p => lectureIds.includes(p.lecture_id));

                            completedCount = progressData.length;
                        }

                        return {
                            ...course,
                            totalLectures: lecturesData.length,
                            completedLectures: completedCount
                        };
                    })
                );

                setEnrolledCourses(coursesWithProgress);
                setCompletedCourses(coursesWithProgress.filter(c => c.completedLectures === c.totalLectures && c.totalLectures > 0).length);
            }

            // Load Exam Submissions
            const submissionsQ = query(
                collection(db, 'exam_submissions'),
                where('student_id', '==', profile?.id)
            );
            const submissionsSnap = await getDocs(submissionsQ);
            const submissions = submissionsSnap.docs.map(doc => doc.data() as ExamSubmission);

            if (submissions.length > 0) {
                const examIds = [...new Set(submissions.map(s => s.exam_id))];
                const examsQ = query(collection(db, 'exams'), where(documentId(), 'in', examIds));
                const examsSnap = await getDocs(examsQ);
                const examsMap = new Map();
                examsSnap.docs.forEach(doc => examsMap.set(doc.id, doc.data() as Exam));

                const history: ExamHistory[] = submissions.map(sub => {
                    const exam = examsMap.get(sub.exam_id) as Exam;
                    if (!exam) return null;

                    const maxScore = exam.questions.reduce((sum, q) => sum + (q.score || 0), 0);

                    const wrongCount = sub.answers.filter(a => {
                        const q = exam.questions.find(eq => eq.id === a.question_id);
                        if (q?.type === 'mcq') {
                            return (a.score || 0) < q.score;
                        }
                        return false;
                    }).length;

                    return {
                        examTitle: exam.title,
                        totalScore: sub.total_score,
                        studentScore: sub.total_score,
                        wrongAnswers: wrongCount,
                        submittedAt: sub.submitted_at,
                        status: sub.status,
                        maxScore
                    };
                }).filter(Boolean) as ExamHistory[];

                history.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                setExamHistory(history);
            }

        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    }

    function handleCourseClick() {
        window.history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const achievements = [
        { icon: <Trophy className="w-6 h-6" />, title: 'طالب متميز', description: 'أكمل 5 كورسات', color: 'from-amber-400 to-orange-500' },
        { icon: <Star className="w-6 h-6" />, title: 'نجم الشهر', description: 'الأكثر نشاطاً', color: 'from-blue-400 to-indigo-500' },
        { icon: <Target className="w-6 h-6" />, title: 'هداف', description: 'وصل للدرجة النهائية', color: 'from-emerald-400 to-teal-500' },
    ];

    const progressPercentage = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative pb-20 overflow-x-hidden">
            <FloatingLetters />

            {/* Header / Cover */}
            <div className="relative h-80 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-slate-900/50 to-transparent"></div>

                {/* Back Button */}
                <button
                    onClick={() => window.history.back()}
                    className="absolute top-8 right-8 z-20 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all border border-white/20"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-bold">رجوع</span>
                </button>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 -mt-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl p-6 md:p-10 border border-slate-100 dark:border-slate-700 backdrop-blur-xl"
                >
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative">
                                <ProfileImage size="xl" showInfo={false} />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-right space-y-4" dir="rtl">
                            <div className="flex flex-col md:flex-row md:justify-between items-center gap-4">
                                <div>
                                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                                        {profile?.full_name_arabic}
                                    </h1>
                                    <div className="flex items-center justify-center md:justify-start gap-3">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-bold">
                                            <GraduationCap className="w-4 h-4" />
                                            {profile?.grade?.replace(/_/g, ' ')}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-bold">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                            طالب نشط
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        signOut().then(() => {
                                            window.location.href = '/';
                                        });
                                    }}
                                    className="px-6 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold transition-all border border-red-100 dark:border-red-900/30"
                                >
                                    تسجيل الخروج
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-2">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                    <Calendar className="w-5 h-5 text-blue-500" />
                                    <span>انضم {new Date(profile?.created_at || '').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                    <TrendingUp className="w-5 h-5 text-purple-500" />
                                    <span>مستوى التقدم: ممتاز</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="flex gap-4">
                            <motion.div
                                whileHover={{ y: -5 }}
                                className="flex flex-col items-center justify-center w-28 h-28 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-800 rounded-2xl border border-blue-200 dark:border-slate-600 shadow-sm"
                            >
                                <span className="text-4xl font-black text-blue-600 dark:text-blue-400">{totalCourses}</span>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">Courses</span>
                            </motion.div>
                            <motion.div
                                whileHover={{ y: -5 }}
                                className="flex flex-col items-center justify-center w-28 h-28 bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-700 dark:to-slate-800 rounded-2xl border border-green-200 dark:border-slate-600 shadow-sm"
                            >
                                <span className="text-4xl font-black text-green-600 dark:text-green-400">{completedCourses}</span>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">Completed</span>
                            </motion.div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3" dir="rtl">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">التقدم الإجمالي</span>
                            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{progressPercentage}%</span>
                        </div>
                        <div className="w-full h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full"
                            ></motion.div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8 mt-8">

                    {/* Left Column: Exam History & Achievements */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Exam History Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-100 dark:border-slate-700"
                        >
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3" dir="rtl">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                    <ClipboardList className="w-6 h-6" />
                                </div>
                                <span>سجل الامتحانات</span>
                            </h2>

                            {examHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                                    <ClipboardList className="w-16 h-16 mb-4 opacity-20" />
                                    <p>لم تقم بأداء أي امتحانات بعد</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {examHistory.map((exam, index) => {
                                        const percentage = Math.round((exam.studentScore / exam.maxScore) * 100);
                                        const isPassed = percentage >= 50;
                                        return (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 * index }}
                                                className="group bg-slate-50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 rounded-2xl p-4 transition-all hover:shadow-md border border-slate-100 dark:border-slate-600"
                                            >
                                                <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                                                    {/* Score Circle & Title */}
                                                    <div className="flex items-center gap-4 w-full md:w-auto" dir="rtl">
                                                        <div className="relative">
                                                            <svg className="w-16 h-16 transform -rotate-90">
                                                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-200 dark:text-slate-600" />
                                                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent"
                                                                    strokeDasharray={175.93}
                                                                    strokeDashoffset={175.93 - (175.93 * percentage) / 100}
                                                                    className={`${isPassed ? 'text-green-500' : 'text-red-500'} transition-all duration-1000`}
                                                                />
                                                            </svg>
                                                            <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300">
                                                                {percentage}%
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                                {exam.examTitle}
                                                            </h3>
                                                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(exam.submittedAt).toLocaleDateString('ar-EG')}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Details Badges */}
                                                    <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end flex-wrap">
                                                        <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 text-center min-w-[80px]">
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">الدرجة</p>
                                                            <p className="font-bold text-slate-800 dark:text-white">
                                                                {exam.studentScore}<span className="text-slate-400 text-xs">/{exam.maxScore}</span>
                                                            </p>
                                                        </div>
                                                        <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 text-center min-w-[80px]">
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">الخطأ</p>
                                                            <p className="font-bold text-red-500">
                                                                {exam.wrongAnswers}
                                                            </p>
                                                        </div>
                                                        <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${exam.status === 'graded'
                                                            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                                                            : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400'
                                                            }`}>
                                                            {exam.status === 'graded' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                            <span className="font-bold text-sm">{exam.status === 'graded' ? 'مصحح' : 'مراجعة'}</span>
                                                        </div>
                                                    </div>

                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>

                        {/* Enrolled Courses Highlights */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3" dir="rtl">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <span>كورساتي</span>
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {enrolledCourses.map((course) => (
                                    <div
                                        key={course.id}
                                        onClick={() => handleCourseClick()}
                                        className="cursor-pointer group bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-lg flex items-center gap-4"
                                    >
                                        <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                            {course.thumbnail_url ? (
                                                <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <BookOpen className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1" dir="rtl">
                                            <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">{course.title}</h3>
                                            <div className="mt-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${course.totalLectures > 0 ? (course.completedLectures / course.totalLectures) * 100 : 0}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Achievements & Badges */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border border-slate-100 dark:border-slate-700">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2" dir="rtl">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                <span>لوحة الشرف</span>
                            </h2>

                            <div className="space-y-4">
                                {achievements.map((achievement, i) => (
                                    <div key={i} className={`p-4 rounded-2xl bg-gradient-to-r ${achievement.color} text-white shadow-lg transform hover:scale-105 transition-transform`}>
                                        <div className="flex items-center gap-3" dir="rtl">
                                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                                {achievement.icon}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm opacity-90">{achievement.title}</p>
                                                <p className="text-xs font-medium opacity-75">{achievement.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Motivation Card */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white text-center shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -ml-10 -mb-10"></div>

                            <Star className="w-12 h-12 text-yellow-300 mx-auto mb-4 animate-spin-slow" />
                            <h3 className="text-2xl font-black mb-2">استمر في التقدم!</h3>
                            <p className="text-white/80 text-sm mb-6">أنت تحقق نتائج مذهلة. أكمل الكورسات للحصول على المزيد من الشهادات.</p>
                            <button onClick={() => window.history.back()} className="w-full py-3 bg-white text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 transition-colors">
                                تابع التعلم
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
