import BaseSidebar from '/shared/js/BaseSidebar.js';

export default {
    components: { BaseSidebar },
    props: ['currentView', 'currentProfile', 'profiles', 'sidebarOpen', 'theme'],
    emits: ['update:sidebarOpen', 'update:currentProfile', 'profile-changed', 'set-theme', 'toggle-sidebar'],
    inject: ['t', 'lang', 'setLang', 'languages'],
    template: `
        <BaseSidebar
            appName="Qcraft"
            icon="M9 18V5l12-2v13 M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
            :theme="theme"
            :sidebarOpen="sidebarOpen"
            @set-theme="$emit('set-theme', $event)"
            @toggle-sidebar="$emit('toggle-sidebar')">

            <!-- Profil -->
            <div class="nav-section">
                <div class="nav-section-title">{{ t('sidebar.profile') }}</div>
                <select class="profile-selector" :value="currentProfile" @change="onProfileChange($event.target.value)">
                    <option v-for="p in profiles" :key="p" :value="p">{{ p.charAt(0).toUpperCase() + p.slice(1) }}</option>
                </select>
            </div>

            <!-- Langue -->
            <div class="nav-section">
                <div class="nav-section-title">{{ t('sidebar.language') }}</div>
                <select class="profile-selector" :value="lang" @change="setLang($event.target.value)">
                    <option v-for="(name, code) in languages" :key="code" :value="code">{{ name }}</option>
                </select>
            </div>

            <!-- Navigation -->
            <div class="nav-section">
                <div class="nav-section-title">{{ t('sidebar.navigation') }}</div>
                <a href="#/"
                   @click="$emit('update:sidebarOpen', false)"
                   class="sidebar-nav-item"
                   :class="{ 'active': currentView === 'generator' }">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    {{ t('sidebar.generator') }}
                </a>
                <a href="#/history"
                   @click="$emit('update:sidebarOpen', false)"
                   class="sidebar-nav-item"
                   :class="{ 'active': currentView === 'history' }">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                    </svg>
                    {{ t('sidebar.history') }}
                </a>
                <a href="#/qobuz-check"
                   @click="$emit('update:sidebarOpen', false)"
                   class="sidebar-nav-item"
                   :class="{ 'active': currentView === 'qobuz-check' }">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    {{ t('sidebar.checkQobuz') }}
                </a>
            </div>
        </BaseSidebar>
    `,
    methods: {
        async onProfileChange(profile) {
            this.$emit('update:currentProfile', profile);
            try {
                const response = await fetch(`/set-profile/${profile}`);
                const data = await response.json();
                if (data.success) {
                    this.$emit('profile-changed', profile);
                }
            } catch (error) {
                console.error('Error changing profile:', error);
            }
        }
    }
};
