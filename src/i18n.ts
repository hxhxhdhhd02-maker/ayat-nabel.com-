
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "login": "Login",
            "start_journey": "Start your journey to excellence in",
            "english_language": "English Language",
            "educational_platform": "Advanced Educational Platform",
            "hero_description": "A unique educational experience combining modern technology with innovative teaching methods. Interactive lessons, continuous follow-up, and content ensuring full marks.",
            "start_now_free": "Start Now for Free",
            "students_count": "+1000 Students",
            "rating": "4.9 Rating",
            "certified_content": "Certified Content",
            "teacher_title": "Dr. Ayat Nabil",
            "teacher_subtitle": "English Language Expert",
            "teacher_exp": "Certified Teacher • +10 Years Experience",
            "create_account": "Create Account",
            "arabic_name": "Full Name (Arabic)",
            "phone_number": "Phone Number",
            "grade": "Grade",
            "password": "Password",
            "enter_name": "Enter your full name",
            "grades": {
                "first_prep": "1st Preparatory",
                "second_prep": "2nd Preparatory",
                "third_prep": "3rd Preparatory",
                "first_sec": "1st Secondary",
                "second_sec": "2nd Secondary",
                "third_sec": "3rd Secondary"
            },
            "loading": "Loading...",
            "platform_desc": "Specialized educational platform for teaching English for preparatory and secondary stages",
            "error_generic": "An error occurred, please try again",
            "error_too_many": "Access temporarily blocked due to too many login attempts. Please try again later.",
            "error_wrong_pass": "Incorrect phone number or password",
            "error_weak_pass": "Weak password. Must be at least 6 characters",
            "error_exists": "This number is already registered. Please login",
            "download_app": "Download App Now",
            "gateway_to_excellence": "Your gateway to excellence in English"
        }
    },
    ar: {
        translation: {
            "login": "تسجيل الدخول",
            "start_journey": "ابدأ رحلة التفوق في",
            "english_language": "اللغة الإنجليزية",
            "educational_platform": "✨ منصة تعليمية متطورة",
            "hero_description": "تجربة تعليمية فريدة تجمع بين التكنولوجيا الحديثة وأساليب التدريس المبتكرة. دروس تفاعلية، متابعة مستمرة، ومحتوى يضمن لك الدرجة النهائية.",
            "start_now_free": "ابدأ الآن مجاناً",
            "students_count": "+1000 طالب",
            "rating": "4.9 تقييم",
            "certified_content": "محتوى معتمد",
            "teacher_title": "Dr/ ايات نبيل",
            "teacher_subtitle": "خبيره اللغة الإنجليزية",
            "teacher_exp": "معلمة معتمدة • +10 سنوات خبرة",
            "create_account": "إنشاء حساب",
            "arabic_name": "الاسم بالعربي",
            "phone_number": "رقم الموبايل",
            "grade": "الصف الدراسي",
            "password": "كلمة المرور",
            "enter_name": "أدخل اسمك الكامل",
            "grades": {
                "first_prep": "اول اعدادي",
                "second_prep": "تاني اعدادي",
                "third_prep": "تالت اعدادي",
                "first_sec": "اول ثانوي",
                "second_sec": "تاني ثانوي",
                "third_sec": "تالت ثانوي"
            },
            "loading": "جاري التحميل...",
            "platform_desc": "منصة تعليمية متخصصة في تدريس اللغة الإنجليزية للمراحل الإعدادية والثانوية",
            "error_generic": "حدث خطأ، الرجاء المحاولة مرة أخرى",
            "error_too_many": "⚠️ تم حظر الوصول مؤقتاً بسبب محاولات تسجيل دخول كثيرة. الرجاء المحاولة بعد قليل (15-60 دقيقة) أو إعادة تعيين كلمة المرور.",
            "error_wrong_pass": "رقم الموبايل أو كلمة المرور غير صحيحة",
            "error_weak_pass": "كلمة المرور ضعيفة. يجب أن تكون 6 أحرف على الأقل",
            "error_exists": "هذا الرقم مسجل بالفعل. الرجاء تسجيل الدخول",
            "download_app": "حمل التطبيق الأن",
            "gateway_to_excellence": "بوابتك للتفوق في اللغة الإنجليزية"
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        lng: "en", // Default language is English as requested
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
