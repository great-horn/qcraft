export default {
    inject: ['t', 'lang'],
    template: `
    <div>
        <h1 style="font-size: 1.875rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1.5rem;">{{ t('qobuz.title') }}</h1>

        <!-- Loading -->
        <div v-if="loading" style="text-align: center; padding: 40px; color: var(--text-secondary);">
            {{ t('qobuz.checking') }}
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
                <div class="status-title">{{ statusTitle }}</div>
                <div class="status-message">{{ statusMessage }}</div>
            </div>

            <!-- Info Grid -->
            <div v-if="infoItems.length > 0" class="info-grid">
                <div v-for="item in infoItems" :key="item.label" class="info-item">
                    <div class="info-label">{{ item.label }}</div>
                    <div class="info-value">{{ item.value }}</div>
                </div>
            </div>

            <!-- Retest button -->
            <div style="text-align: center; margin-top: 30px;">
                <button class="btn btn-primary" @click="checkQobuz" :disabled="loading">
                    {{ t('qobuz.retest') }}
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
    computed: {
        statusTitle() {
            if (!this.result.status) return '';
            if (this.result.status === 'success') return this.t('qobuz.success');
            const errorMap = {
                'config': 'qobuz.errorConfig',
                'api': 'qobuz.errorApi',
                'network': 'qobuz.errorNetwork',
                'unknown': 'qobuz.errorUnexpected'
            };
            return this.t(errorMap[this.result.error_type] || 'qobuz.errorUnexpected');
        },
        statusMessage() {
            if (!this.result.status) return '';
            if (this.result.status === 'success') return this.t('qobuz.successMsg');
            if (this.result.error_type === 'config') return this.t('qobuz.errorConfigMsg');
            if (this.result.error_type === 'network') return this.t('qobuz.errorNetworkMsg');
            return this.result.error_message || this.t('qobuz.errorNetworkMsg');
        },
        infoItems() {
            if (!this.result.status || this.result.status !== 'success') return [];
            const items = [];
            if (this.result.http_code) items.push({ label: this.t('qobuz.httpCode'), value: this.result.http_code });
            if (this.result.profile) items.push({ label: this.t('qobuz.profileLabel'), value: this.result.profile });
            if (this.result.tracks_found !== undefined) items.push({ label: this.t('qobuz.testResults'), value: `${this.result.tracks_found} ${this.t('qobuz.tracksFound')}` });
            return items;
        }
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
                    error_type: 'network'
                };
            } finally {
                this.loading = false;
            }
        }
    }
};
