import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useParent } from '../contexts/ParentContext';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ParentLoginScreen() {
    const [phone, setPhone] = useState('');
    const { login, loading, error } = useParent();
    const { colors, theme } = useTheme();

    // Animation Values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance Animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true,
            })
        ]).start();

        // Floating Animation for Circles
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    const handleLogin = async () => {
        if (!phone) {
            Alert.alert('تنبيه', 'يرجى إدخال رقم الهاتف');
            return;
        }
        await login(phone);
    };

    const translateY = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -20]
    });

    const rotate = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '10deg']
    });

    return (
        <View style={styles.container}>
            {/* Background Gradient */}
            <LinearGradient
                colors={theme === 'dark' ? ['#0f172a', '#1e3a8a'] : ['#eff6ff', '#bfdbfe']}
                style={StyleSheet.absoluteFill}
            />

            {/* Decorative Floating Circles */}
            <Animated.View style={[styles.circle, {
                backgroundColor: theme === 'dark' ? 'rgba(30, 64, 175, 0.3)' : 'rgba(59, 130, 246, 0.15)',
                top: -100, right: -100,
                transform: [{ translateY }, { rotate }]
            }]} />
            <Animated.View style={[styles.circle, {
                backgroundColor: theme === 'dark' ? 'rgba(30, 64, 175, 0.3)' : 'rgba(59, 130, 246, 0.15)',
                bottom: -50, left: -50,
                transform: [{ translateY: translateY.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }]
            }]} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>

                {/* Logo Section */}
                <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.logoCircle}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="cover"
                        />
                    </View>
                    <Text style={[styles.schoolName, { color: colors.text }]}>مدرسة مس آيات نبيل</Text>
                    <Text style={[styles.appName, { color: colors.primary }]}>تطبيق ولي الأمر</Text>
                </Animated.View>

                {/* Login Form */}
                <Animated.View style={[
                    styles.formContainer,
                    {
                        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'white',
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>رقم الهاتف</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="01xxxxxxxxx"
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                    </View>

                    {error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={16} color={colors.error} />
                            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <Text style={styles.buttonText}>جاري التحقق...</Text>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.buttonText}>تسجيل الدخول</Text>
                                <Ionicons name="arrow-back" size={20} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>بياناتك محمية ومشفرة</Text>
                    </View>
                </Animated.View>

            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', padding: 24 },

    circle: {
        position: 'absolute', width: 300, height: 300, borderRadius: 150
    },

    logoContainer: { alignItems: 'center', marginBottom: 40 },
    logoCircle: {
        width: 150, height: 150, borderRadius: 75,
        backgroundColor: 'white',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#3b82f6', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 4, borderColor: 'rgba(255,255,255,0.8)'
    },
    logo: { width: '120%', height: '120%' },
    schoolName: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    appName: { fontSize: 18, fontWeight: '500', opacity: 0.9 },

    formContainer: {
        borderRadius: 24, padding: 30,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5
    },

    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, marginBottom: 8, textAlign: 'right', fontWeight: '500' },
    inputWrapper: {
        flexDirection: 'row-reverse', alignItems: 'center',
        borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 56
    },
    input: { flex: 1, fontSize: 16, textAlign: 'right', height: '100%' },

    errorContainer: {
        flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 12
    },
    error: { fontWeight: '500' },

    button: {
        height: 56, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
        marginBottom: 20
    },
    buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

    footer: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 6, opacity: 0.8 },
    footerText: { fontSize: 12 }
});
