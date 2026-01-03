import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, PaymentRequest } from '../lib/firebase';
import { collection, doc, runTransaction, Transaction, query, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, Upload, Wallet, Phone, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WalletRecharge() {
    const { profile } = useAuth();
    const [amount, setAmount] = useState('');
    const [senderPhone, setSenderPhone] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const VODAFONE_CASH_NUMBER = '01011765924';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setScreenshot(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setScreenshotPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!screenshot || !amount || !senderPhone || !profile) {
            alert('برجاء ملء جميع البيانات');
            return;
        }

        setLoading(true);

        try {
            // Convert image to base64 for storage
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Image = reader.result as string;

                try {
                    const paymentRequest: Omit<PaymentRequest, 'id'> = {
                        student_id: profile.id,
                        student_name: profile.full_name_arabic,
                        amount: parseFloat(amount),
                        sender_phone: senderPhone,
                        screenshot_url: base64Image,
                        status: 'pending',
                        created_at: new Date().toISOString(),
                    };

                    const requestRef = doc(collection(db, 'payment_requests'));
                    await runTransaction(db, async (transaction: Transaction) => {
                        transaction.set(requestRef, paymentRequest);
                    });

                    // Send Push Notification to Admin
                    try {
                        const q = query(collection(db, 'profiles'), where('role', '==', 'teacher'));
                        const snapshot = await getDocs(q);

                        snapshot.forEach(doc => {
                            const data = doc.data();
                            if (data.expoPushToken) {
                                fetch('https://exp.host/--/api/v2/push/send', {
                                    method: 'POST',
                                    headers: {
                                        'Accept': 'application/json',
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        to: data.expoPushToken,
                                        sound: 'default',
                                        title: 'طلب شحن جديد! 💰',
                                        body: `الطالب ${profile.full_name_arabic} طلب شحن بمبلغ ${amount} جنيه`,
                                        data: { requestId: requestRef.id },
                                    }),
                                });
                            }
                        });
                    } catch (e) {
                        console.error('Error sending push notification', e);
                    }

                    setSuccess(true);
                    setAmount('');
                    setSenderPhone('');
                    setScreenshot(null);
                    setScreenshotPreview('');

                    setTimeout(() => {
                        window.history.back();
                    }, 2000);
                } catch (err) {
                    console.error("Failed to submit payment request", err);
                    alert('حدث خطأ أثناء إرسال الطلب. برجاء المحاولة مرة أخرى.');
                }
            };
            reader.readAsDataURL(screenshot);

        } catch (error) {
            console.error('Error submitting payment request:', error);
            alert('حدث خطأ أثناء إرسال الطلب');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center max-w-md"
                >
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3" dir="rtl">
                        تم إرسال الطلب بنجاح!
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300" dir="rtl">
                        سيتم مراجعة طلبك وإضافة الرصيد خلال دقائق
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-6">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => window.history.back()}
                        className="p-2 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                    <div dir="rtl">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">شحن المحفظة</h1>
                        <p className="text-slate-500 dark:text-slate-400">أضف رصيد لشراء الكورسات</p>
                    </div>
                </div>

                {/* Current Balance */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 mb-8 text-white relative overflow-hidden"
                >
                    <div className="flex items-center justify-between relative z-10" dir="rtl">
                        <div>
                            <p className="text-blue-100 mb-2">رصيدك الحالي</p>
                            <p className="text-4xl font-black">{profile?.wallet_balance || 0} جنيه</p>
                        </div>
                        <Wallet className="w-16 h-16 text-blue-300" />
                    </div>
                    {/* Decorative pattern */}
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
                </motion.div>

                {/* Payment Instructions - Simplified for better UX */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-slate-800 rounded-3xl p-6 mb-8 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4" dir="rtl">
                        خطوات الشحن السريع
                    </h2>
                    <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800" dir="rtl">
                        <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">حول المبلغ لمحفظة فودافون كاش:</p>
                            <p className="font-bold text-xl text-blue-600 dark:text-blue-400 font-english mt-1">{VODAFONE_CASH_NUMBER}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Form */}
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onSubmit={handleSubmit}
                    className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none"
                >
                    <div className="space-y-6" dir="rtl">

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                المبلغ المحول (جنيه)
                            </label>
                            <div className="relative group">
                                <DollarSign className="absolute right-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="مثال: 100"
                                    required
                                    min="1"
                                    disabled={loading}
                                    className="w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 dark:text-white transition-all"
                                />
                            </div>
                        </div>

                        {/* Sender Phone */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                رقم الموبايل المرسل منه
                            </label>
                            <div className="relative group">
                                <Phone className="absolute right-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="tel"
                                    value={senderPhone}
                                    onChange={(e) => setSenderPhone(e.target.value)}
                                    placeholder="01xxxxxxxxx"
                                    required
                                    disabled={loading}
                                    className="w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 dark:text-white transition-all"
                                />
                            </div>
                        </div>

                        {/* Screenshot Upload */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                صورة التحويل (سكرين شوت)
                            </label>

                            {!screenshotPreview ? (
                                <label className={`block cursor - pointer transition - all ${loading ? 'opacity-50 pointer-events-none' : ''} `}>
                                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Upload className="w-8 h-8 text-blue-500" />
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300 font-bold mb-1">اضغط لرفع الصورة</p>
                                        <p className="text-sm text-slate-400">تأكد من وضوح الصورة وتفاصيل التحويل</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        required
                                        disabled={loading}
                                    />
                                </label>
                            ) : (
                                <div className="relative group">
                                    <img
                                        src={screenshotPreview}
                                        alt="Screenshot preview"
                                        className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 aspect-video object-cover"
                                    />
                                    {!loading && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setScreenshot(null);
                                                setScreenshotPreview('');
                                            }}
                                            className="absolute top-4 left-4 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-xl backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={loading || !screenshot}
                            whileHover={{ scale: loading ? 1 : 1.02 }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                            className={`
                                relative w-full py-4 px-6 rounded-2xl font-bold text-lg 
                                transition-all duration-300 flex items-center justify-center gap-3
                                overflow-hidden group
                                ${loading || !screenshot
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 hover:from-blue-700 hover:via-blue-800 hover:to-blue-700 text-white shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40'
                                }
                            `}
                        >
                            {/* Animated background effect */}
                            {!loading && screenshot && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            )}

                            {/* Button content */}
                            <div className="relative z-10 flex items-center gap-3">
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-6 w-6 border-3 border-slate-300 border-t-transparent"></div>
                                        <span>جاري الإرسال...</span>
                                    </>
                                ) : (
                                    <>
                                        <Wallet className="w-6 h-6" />
                                        <span>تأكيد وشحن</span>
                                        <svg
                                            className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </div>
                        </motion.button>

                        <p className="text-center text-xs text-slate-400 mt-3">
                            سيتم مراجعة طلبك من قبل الإدارة وإضافة الرصيد خلال دقائق
                        </p>

                    </div>
                </motion.form>

            </div>
        </div>
    );
}

function X({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}
