import Sidebar from './components/Sidebar.js';
import GeneratorView from './components/GeneratorView.js';
import HistoryView from './components/HistoryView.js';
import QobuzCheckView from './components/QobuzCheckView.js';

const { createApp, ref, onMounted } = Vue;

const app = createApp({
    setup() {
        const currentView = ref(parseHash());
        const currentProfile = ref('');
        const profiles = ref([]);
        const sidebarOpen = ref(false);
        const theme = ref(typeof getTheme === 'function' ? getTheme() : 'dark');

        function setThemeHandler(t) {
            window.setTheme(t);
            theme.value = t;
        }

        function parseHash() {
            const hash = window.location.hash.slice(2) || 'generator';
            // Map empty or root to 'generator'
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
                console.error('Erreur chargement profils:', error);
            }

            // Listen for theme changes from common.js
            window.addEventListener('theme-changed', (e) => {
                theme.value = e.detail.theme;
            });

            // Listen for theme changes from parent (iframe embed)
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
