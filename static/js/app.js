import Sidebar from './components/Sidebar.js';
import GeneratorView from './components/GeneratorView.js';
import HistoryView from './components/HistoryView.js';
import QobuzCheckView from './components/QobuzCheckView.js';
import { languages, translations } from './i18n.js';

const { createApp, ref, provide, onMounted } = Vue;

const app = createApp({
    setup() {
        const currentView = ref(parseHash());
        const currentProfile = ref('');
        const profiles = ref([]);
        const sidebarOpen = ref(false);
        const theme = ref(typeof getTheme === 'function' ? getTheme() : 'dark');

        // i18n — detect browser language, fallback to English
        const supportedLangs = Object.keys(languages);
        const defaultLang = (() => {
            const stored = localStorage.getItem('qcraft_lang');
            if (stored && supportedLangs.includes(stored)) return stored;
            const browser = navigator.language.slice(0, 2);
            return supportedLangs.includes(browser) ? browser : 'en';
        })();
        const lang = ref(defaultLang);

        function t(key) {
            return translations[lang.value]?.[key] || translations['en']?.[key] || key;
        }

        function setLang(l) {
            lang.value = l;
            localStorage.setItem('qcraft_lang', l);
        }

        provide('t', t);
        provide('lang', lang);
        provide('setLang', setLang);
        provide('languages', languages);

        function setThemeHandler(th) {
            window.setTheme(th);
            theme.value = th;
        }

        function parseHash() {
            const hash = window.location.hash.slice(2) || 'generator';
            return hash === '' ? 'generator' : hash;
        }

        window.addEventListener('hashchange', () => {
            currentView.value = parseHash();
        });

        onMounted(async () => {
            try {
                const [profileRes, profilesRes] = await Promise.all([
                    fetch('/get-profile'),
                    fetch('/api/profiles')
                ]);
                const profileData = await profileRes.json();
                const profilesData = await profilesRes.json();
                profiles.value = profilesData.profiles || [];
                currentProfile.value = profileData.profile || profilesData.default || profiles.value[0] || 'default';
            } catch (error) {
                console.error('Error loading profiles:', error);
            }

            window.addEventListener('theme-changed', (e) => {
                theme.value = e.detail.theme;
            });

            window.addEventListener('message', (event) => {
                if (event.data.type === 'theme-change') {
                    const theme = event.data.theme;
                    const currentTheme = getTheme();
                    if (theme !== currentTheme) {
                        cycleTheme();
                    }
                }
            });
        });

        return { currentView, currentProfile, profiles, sidebarOpen, theme, setThemeHandler };
    },
    template: `
        <Sidebar
            :currentView="currentView"
            v-model:currentProfile="currentProfile"
            :profiles="profiles"
            :sidebarOpen="sidebarOpen"
            :theme="theme"
            @profile-changed="() => {}"
            @set-theme="setThemeHandler"
            @toggle-sidebar="sidebarOpen = !sidebarOpen"
            @update:sidebarOpen="v => sidebarOpen = v"
        />
        <div class="main-content">
            <div class="container">
                <GeneratorView v-if="currentView === 'generator'" :currentProfile="currentProfile" />
                <HistoryView v-if="currentView === 'history'" />
                <QobuzCheckView v-if="currentView === 'qobuz-check'" />
            </div>
        </div>
    `
});

app.component('Sidebar', Sidebar);
app.component('GeneratorView', GeneratorView);
app.component('HistoryView', HistoryView);
app.component('QobuzCheckView', QobuzCheckView);

app.mount('#app');
