import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useParent } from '../contexts/ParentContext';
import { Ionicons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import ParentHome from '../components/ParentHome';
import ParentWallet from '../components/ParentWallet';
import ParentCourses from '../components/ParentCourses';
import ParentExams from '../components/ParentExams';
import { useTheme } from '../contexts/ThemeContext';

type Tab = 'home' | 'courses' | 'exams' | 'wallet';

export default function ParentDashboardScreen() {
    const { logout } = useParent();
    const { theme, toggleTheme, colors } = useTheme();
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const pagerRef = useRef<PagerView>(null);

    const tabs: { key: Tab, label: string, icon: any }[] = [
        { key: 'wallet', label: 'المحفظة', icon: 'wallet-outline' },
        { key: 'exams', label: 'الامتحانات', icon: 'document-text-outline' },
        { key: 'courses', label: 'الكورسات', icon: 'school-outline' },
        { key: 'home', label: 'الرئيسية', icon: 'home-outline' },
    ];

    const handleTabPress = (tab: Tab) => {
        const index = tabs.findIndex(t => t.key === tab);
        pagerRef.current?.setPage(index);
        setActiveTab(tab);
    };

    const handlePageScroll = (e: any) => {
        const index = e.nativeEvent.position;
        setActiveTab(tabs[index].key);
    };

    const getHeaderTitle = () => {
        const tab = tabs.find(t => t.key === activeTab);
        return tab ? tab.label : 'الرئيسية';
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 30 : 0 }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={logout} style={styles.iconBtn}>
                    <Ionicons name="log-out-outline" size={24} color={colors.error} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: colors.text }]}>{getHeaderTitle()}</Text>

                <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
                    <Ionicons
                        name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                        size={24}
                        color={colors.primary}
                    />
                </TouchableOpacity>
            </View>

            <PagerView
                style={styles.content}
                initialPage={3}
                ref={pagerRef}
                onPageSelected={handlePageScroll}
            >
                <View key="wallet"><ParentWallet /></View>
                <View key="exams"><ParentExams /></View>
                <View key="courses"><ParentCourses /></View>
                <View key="home"><ParentHome /></View>
            </PagerView>

            <View style={[styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.tabItem}
                            onPress={() => handleTabPress(tab.key)}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={24}
                                color={isActive ? colors.primary : colors.textSecondary}
                            />
                            <Text style={[
                                styles.tabLabel,
                                { color: isActive ? colors.primary : colors.textSecondary, fontWeight: isActive ? 'bold' : 'normal' }
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    iconBtn: { padding: 8 },

    content: { flex: 1 },

    tabBar: {
        flexDirection: 'row', paddingVertical: 10,
        borderTopWidth: 1, elevation: 8
    },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabLabel: { fontSize: 12, marginTop: 4 },
});
