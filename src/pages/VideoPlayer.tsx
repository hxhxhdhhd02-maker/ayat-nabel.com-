import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, Lecture } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { ArrowLeft, FileText } from 'lucide-react';

export default function VideoPlayer() {
  const { profile } = useAuth();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const lectureId = window.location.pathname.split('/').pop();

  useEffect(() => {
    if (lectureId) {
      loadLecture(lectureId);
    }
  }, [lectureId]);

  useEffect(() => {
    if (lecture && profile) {
      startProgressTracking();
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [lecture, profile]);

  async function loadLecture(id: string) {
    try {
      const docRef = doc(db, 'lectures', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setLecture({ id: docSnap.id, ...docSnap.data() } as Lecture);
      }
    } catch (error) {
      console.error('Error loading lecture:', error);
    } finally {
      setLoading(false);
    }
  }

  function startProgressTracking() {
    progressIntervalRef.current = setInterval(() => {
      updateProgress();
    }, 10000);
  }

  async function updateProgress() {
    if (!lecture || !profile) return;

    try {
      const currentTime = getCurrentVideoTime();

      const q = query(
        collection(db, 'lecture_progress'),
        where('student_id', '==', profile.id),
        where('lecture_id', '==', lecture.id)
      );

      const snapshot = await getDocs(q);
      const existingDoc = !snapshot.empty ? snapshot.docs[0] : null;

      const existingData = existingDoc ? existingDoc.data() : null;
      const watchedSeconds = Math.max(existingData?.watched_seconds || 0, currentTime);
      const completed = lecture.duration_seconds > 0 && watchedSeconds >= lecture.duration_seconds * 0.9;

      if (existingDoc) {
        await updateDoc(doc(db, 'lecture_progress', existingDoc.id), {
          watched_seconds: watchedSeconds,
          completed: completed,
          last_watched_at: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'lecture_progress'), {
          student_id: profile.id,
          lecture_id: lecture.id,
          watched_seconds: watchedSeconds,
          completed: completed,
          last_watched_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  function getCurrentVideoTime(): number {
    return 0; // Implementation depends on player API
  }

  function getYouTubeVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  function getEmbedUrl(url: string): string {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return url;

    // Remove controls=0 or similar restrictive params to let default Youtube player controls work if desired,
    // but the user specifically asked to remove OUR custom settings icon.
    // We'll keep standard params but ensure the experience is good.
    const params = new URLSearchParams({
      autoplay: '0',
      controls: '1',
      rel: '0',
      modestbranding: '1',
    });

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">المحاضرة غير موجودة</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 text-indigo-400 hover:text-indigo-300 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>العودة</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 font-sans selection:bg-indigo-500/30">
      {/* Navbar / Top Bar */}
      <div className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>رجوع للدروس</span>
          </button>
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-cyan-400 hidden sm:block">
            {lecture.title}
          </h2>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Video Player Container */}
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10 bg-black border border-white/5 relative group">
              <div className="aspect-video w-full bg-slate-900">
                <iframe
                  ref={playerRef}
                  src={getEmbedUrl(lecture.youtube_url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            {/* Title & Description */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5 backdrop-blur-sm">
              <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-white text-right font-display leading-tight">
                {lecture.title}
              </h1>
              {lecture.description && (
                <div className="prose prose-invert max-w-none text-right">
                  <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-line">
                    {lecture.description}
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">

            {/* Attachments Card */}
            {lecture.pdf_url && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-1 border border-white/10 shadow-lg">
                <div className="bg-slate-900/80 rounded-xl p-5 backdrop-blur-sm h-full flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white mb-1">ملفات مرفقة</h3>
                  <p className="text-sm text-gray-400 mb-6">احصل على نسخة PDF من الشرح والمراجع</p>

                  <a
                    href={lecture.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 group"
                  >
                    <span>تحميل الملف</span>
                    <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </a>
                </div>
              </div>
            )}

            {/* Tips Card */}
            <div className="bg-slate-900/30 rounded-2xl p-6 border border-white/5">
              <h4 className="font-semibold text-indigo-300 mb-4 text-right flex items-center justify-end gap-2">
                <span>معلومات ونصائح</span>
                <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
              </h4>
              <ul className="space-y-3 text-sm text-gray-400 text-right" dir="rtl">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500/50 mt-1">•</span>
                  <span>يتم حفظ تقدمك في المشاهدة تلقائياً كل 10 ثوان.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500/50 mt-1">•</span>
                  <span>لأفضل تجربة، استخدم متصفح كروم أو سفاري.</span>
                </li>
                {lecture.pdf_url && (
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-500/50 mt-1">•</span>
                    <span>لا تنس مراجعة الملف المرفق بعد الانتهاء.</span>
                  </li>
                )}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
