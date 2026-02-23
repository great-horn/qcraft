export default {
    template: `
    <div>
        <h1 style="font-size: 1.875rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1.5rem;">Verification Connexion Qobuz</h1>

        <!-- Loading -->
        <div v-if="loading" style="text-align: center; padding: 40px; color: var(--text-secondary);">
            Verification en cours...
        </div>

        <template v-else>
            <!-- Status Card -->
            <div class="status-card" :class="result.status === 'success' ? 'status-success' : 'status-error'">
                <div class="status-icon">
                    <svg v-if="result.status === 'success'" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <div class="status-title">{{ result.title }}</div>
                <div class="status-message">{{ result.message }}</div>
            </div>

            <!-- Info Grid -->
            <div v-if="result.details" class="info-grid">
                <div v-for="(value, key) in result.details" :key="key" class="info-item">
                    <div class="info-label">{{ key }}</div>
                    <div class="info-value">{{ value }}</div>
                </div>
            </div>

            <!-- Retest button -->
            <div style="text-align: center; margin-top: 30px;">
                <button class="btn btn-primary" @click="checkQobuz" :disabled="loading">
                    Retester la connexion
                </button>
            </div>
        </template>
    </div>
    `,
    data() {
        return {
            result: {},
            loading: true
        };
    },
    async mounted() {
        await this.checkQobuz();
    },
    methods: {
        async checkQobuz() {
            this.loading = true;
            try {
                const response = await fetch('/api/qobuz-check');
                this.result = await response.json();
            } catch (error) {
                this.result = {
                    status: 'error',
                    title: 'Erreur reseau',
                    message: 'Impossible de contacter le serveur.',
                    details: null
                };
            } finally {
                this.loading = false;
            }
        }
    }
};
