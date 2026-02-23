export default {
    props: ['currentProfile'],
    inject: ['t', 'lang'],
    template: `
    <div>
        <!-- Titre principal -->
        <h1 style="font-size: 1.875rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1.5rem;">{{ t('generator.title') }}</h1>

        <!-- Hero Section - Derniere playlist -->
        <div v-if="lastPlaylist && lastPlaylist.playlist" class="hero-section">
            <div class="hero-blur-backdrop"
                 v-if="lastPlaylist.tracks_added && lastPlaylist.tracks_added.length > 0 && lastPlaylist.tracks_added[0].album_cover"
                 :style="'background-image: url(' + lastPlaylist.tracks_added[0].album_cover + ')'">
            </div>
            <div class="hero-content">
                <img v-if="lastPlaylist.tracks_added && lastPlaylist.tracks_added.length > 0 && lastPlaylist.tracks_added[0].album_cover"
                     :src="lastPlaylist.tracks_added[0].album_cover"
                     :alt="lastPlaylist.playlist"
                     class="hero-cover">
                <div v-else class="hero-cover-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary); opacity: 0.5;">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                </div>
                <div class="hero-info">
                    <div class="hero-label">{{ t('generator.lastPlaylist') }}</div>
                    <div class="hero-title">{{ lastPlaylist.playlist }}</div>
                    <div class="hero-meta">
                        {{ lastPlaylist.tracks_added ? lastPlaylist.tracks_added.length : 0 }} {{ t('generator.tracks') }}
                        &bull; ~{{ lastPlaylist.tracks_added ? Math.round(lastPlaylist.tracks_added.length * 3.5) : 0 }} {{ t('generator.minutes') }}
                    </div>
                    <div class="hero-actions">
                        <a v-if="lastPlaylist.qobuz_playlist_id"
                           :href="'https://open.qobuz.com/playlist/' + lastPlaylist.qobuz_playlist_id"
                           target="_blank"
                           class="hero-btn hero-btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polygon points="10 8 16 12 10 16 10 8"></polygon>
                            </svg>
                            {{ t('generator.openInQobuz') }}
                        </a>
                        <a href="#/history" class="hero-btn hero-btn-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                            </svg>
                            {{ t('generator.viewHistory') }}
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Section Prompt -->
        <div class="section">
            <label for="prompt">{{ t('generator.describeVibe') }}</label>
            <textarea
                id="prompt"
                v-model="prompt"
                :placeholder="t('generator.placeholder')"
                @keydown.ctrl.enter="generatePlaylist">
            </textarea>

            <div v-if="finalPrompt" class="prompt-preview">
                <strong>{{ t('generator.finalPrompt') }}:</strong> {{ finalPrompt }}
            </div>
        </div>

        <!-- Onglets -->
        <div class="section">
            <div class="tabs tabs--pill">
                <button class="tab-btn" :class="{ active: activeTab === 'params' }" @click="activeTab = 'params'">
                    {{ t('generator.parameters') }}
                </button>
                <button class="tab-btn" :class="{ active: activeTab === 'moods' }" @click="activeTab = 'moods'">
                    {{ t('generator.moods') }}
                </button>
                <button class="tab-btn" :class="{ active: activeTab === 'filters' }" @click="activeTab = 'filters'">
                    {{ t('generator.advancedFilters') }}
                </button>
            </div>

            <!-- Onglet Parametres -->
            <div class="tab-content" :class="{ active: activeTab === 'params' }">
                <div class="controls">
                    <div class="control-group">
                        <label>
                            {{ t('generator.trackCount') }}: <span class="range-value">{{ trackCount }}</span>
                        </label>
                        <div class="slider-container" id="trackCountSlider"></div>
                    </div>

                    <div class="control-group">
                        <label>
                            {{ t('generator.years') }}: <span class="range-value">{{ yearRange[0] }} - {{ yearRange[1] }}</span>
                        </label>
                        <div class="slider-container" id="yearRangeSlider"></div>
                    </div>

                    <div class="control-group">
                        <label>
                            {{ t('generator.chillness') }}: <span class="range-value">{{ chill }}/10</span>
                        </label>
                        <div class="slider-container" id="chillSlider"></div>
                    </div>

                    <div class="control-group">
                        <label>
                            {{ t('generator.energy') }}: <span class="range-value">{{ energy }}/10</span>
                        </label>
                        <div class="slider-container" id="energySlider"></div>
                    </div>
                </div>
            </div>

            <!-- Onglet Ambiances -->
            <div class="tab-content" :class="{ active: activeTab === 'moods' }">
                <div class="moods-grid">
                    <button v-for="mood in moodKeys" :key="mood"
                            @click="selectMood(mood)"
                            class="mood-btn"
                            :class="{ active: selectedMood === mood }">
                        {{ t('mood.' + mood) }}
                    </button>
                </div>
            </div>

            <!-- Onglet Filtres avances -->
            <div class="tab-content" :class="{ active: activeTab === 'filters' }">
                <div class="tag-groups">
                    <div class="tag-group" v-for="group in tagGroups" :key="group.key">
                        <h3>{{ t('tagGroup.' + group.key) }}</h3>
                        <div>
                            <span v-for="tag in group.tags" :key="tag"
                                  @click="toggleTag(tag)"
                                  class="tag-btn"
                                  :class="{ active: selectedTags.includes(tag) }">
                                {{ t('tag.' + tag) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="actions">
            <button class="btn btn-primary" @click="generatePlaylist" :disabled="isGenerating || !prompt.trim()">
                <div v-if="isGenerating" class="spinner"></div>
                <span v-if="isGenerating">{{ t('generator.generating') }}</span>
                <span v-else>{{ t('generator.generate') }}</span>
            </button>
            <button class="btn btn-secondary" @click="resetFilters">
                {{ t('generator.reset') }}
            </button>
        </div>

        <!-- Resultat playlist -->
        <div v-if="lastPlaylist && lastPlaylist.playlist" class="playlist-result">
            <div class="playlist-header">
                <h2 class="playlist-title">{{ lastPlaylist.playlist }}</h2>
                <a v-if="lastPlaylist.qobuz_playlist_id"
                   :href="'https://open.qobuz.com/playlist/' + lastPlaylist.qobuz_playlist_id"
                   target="_blank"
                   class="btn btn-primary">
                    {{ t('generator.openInQobuz') }}
                </a>
            </div>

            <div v-if="lastPlaylist.tracks_added && lastPlaylist.tracks_added.length > 0">
                <p style="color: var(--text-secondary); margin-bottom: 15px;">
                    {{ lastPlaylist.tracks_added.length }} {{ t('generator.tracks') }} &bull; ~{{ Math.round(lastPlaylist.tracks_added.length * 3.5) }} {{ t('generator.minutes') }}
                </p>
                <div style="max-height: 500px; overflow-y: auto;">
                    <a v-for="(track, index) in lastPlaylist.tracks_added"
                       :key="index"
                       :href="'https://open.qobuz.com/track/' + track.track_id"
                       target="_blank"
                       class="track-item">
                        <div class="track-number">{{ index + 1 }}</div>
                        <img v-if="track.album_cover"
                             :src="track.album_cover"
                             :alt="track.album_title"
                             class="track-album-cover"
                             loading="lazy">
                        <div v-else class="track-album-cover" style="background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary); opacity: 0.5;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </div>
                        <div class="track-info">
                            <div class="track-title">{{ track.title }}</div>
                            <div class="track-artist">{{ track.artist }}</div>
                            <div v-if="track.album_title" class="track-album">{{ track.album_title }}</div>
                        </div>
                    </a>
                </div>
            </div>
            <div v-else style="text-align: center; padding: 20px; color: var(--text-secondary);">
                {{ t('generator.noTracksFound') }}
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            activeTab: 'params',
            prompt: '',
            trackCount: 20,
            yearRange: [1950, 2025],
            chill: 5,
            energy: 5,
            selectedTags: [],
            selectedMood: '',
            isGenerating: false,
            lastPlaylist: null,
            sliders: {},
            moodKeys: [
                'morningCalm', 'electroChill', 'vintageRock', 'funkyNight',
                'urbanJazz', 'rainyCafe', 'darkTechno', 'tropicalChill',
                'nightDrive', 'positiveEnergy', 'nostalgicBallad', 'acousticEvening'
            ],
            tagGroups: [
                { key: 'voice', tags: ['female', 'male', 'noVocals'] },
                { key: 'language', tags: ['langEnglish', 'langFrench', 'langSpanish', 'langPortuguese', 'langJapanese', 'langInstrumental'] },
                { key: 'version', tags: ['liveOnly', 'acoustic', 'remix', 'original', 'cover'] },
                { key: 'mood', tags: ['rainy', 'warm', 'experimental', 'vintage', 'bassForward'] },
                { key: 'content', tags: ['knownClassics', 'underground', 'world', 'allAudiences', 'minimalist'] },
                { key: 'mindset', tags: ['hypnotic', 'nostalgic', 'feelGood', 'floating', 'energizing', 'dreamy'] },
                { key: 'origin', tags: ['usa', 'europe', 'africa', 'asia', 'latinAmerica', 'middleEast'] },
                { key: 'era', tags: ['era60s70s', 'era80s', 'era90s', 'era2000s', 'era2010s', 'contemporary'] },
                { key: 'scene', tags: ['mainstream', 'independent', 'majorLabels', 'selfProduced', 'localScene', 'international'] },
                { key: 'production', tags: ['hifiAudiophile', 'lofiVintage', 'modernProduction', 'liveRecording', 'homeStudio'] }
            ]
        };
    },
    computed: {
        formattedTags() {
            return this.selectedTags.map(tag => {
                const group = this.tagGroups.find(g => g.tags.includes(tag));
                return group ? `${this.t('tagGroup.' + group.key)}: ${this.t('tag.' + tag)}` : this.t('tag.' + tag);
            });
        },
        finalPrompt() {
            const parts = [this.prompt.trim()];
            if (this.trackCount !== 20) parts.push(`${this.trackCount} ${this.t('generator.tracks')}`);
            if (this.yearRange[0] !== 1950 || this.yearRange[1] !== 2025) {
                parts.push(`${this.yearRange[0]} - ${this.yearRange[1]}`);
            }
            if (this.chill !== 5) parts.push(`${this.t('generator.chillness')} ${this.chill}/10`);
            if (this.energy !== 5) parts.push(`${this.t('generator.energy')} ${this.energy}/10`);
            if (this.formattedTags.length > 0) {
                parts.push(this.formattedTags.join(', '));
            }
            return parts.filter(p => p).join(', ');
        }
    },
    watch: {
        yearRange: {
            handler(newVal) {
                if (newVal[0] > newVal[1]) {
                    if (newVal[0] !== this.yearRange[0]) {
                        this.yearRange[1] = newVal[0];
                    } else {
                        this.yearRange[0] = newVal[1];
                    }
                }
            },
            deep: true
        }
    },
    async mounted() {
        this.loadLastPlaylist();
        this.$nextTick(() => {
            this.initSliders();
        });
    },
    beforeUnmount() {
        Object.values(this.sliders).forEach(slider => {
            if (slider && slider.destroy) slider.destroy();
        });
    },
    methods: {
        selectMood(moodKey) {
            this.prompt = this.t('mood.' + moodKey + '.prompt');
            this.selectedMood = moodKey;
            setTimeout(() => { this.selectedMood = ''; }, 2000);
        },
        toggleTag(tag) {
            const index = this.selectedTags.indexOf(tag);
            if (index > -1) {
                this.selectedTags.splice(index, 1);
            } else {
                this.selectedTags.push(tag);
            }
        },
        resetFilters() {
            this.prompt = '';
            this.trackCount = 20;
            this.yearRange = [1950, 2025];
            this.chill = 5;
            this.energy = 5;
            this.selectedTags = [];
            this.selectedMood = '';
            if (this.sliders.trackCount) this.sliders.trackCount.set(20);
            if (this.sliders.yearRange) this.sliders.yearRange.set([1950, 2025]);
            if (this.sliders.chill) this.sliders.chill.set(5);
            if (this.sliders.energy) this.sliders.energy.set(5);
        },
        initSliders() {
            const vm = this;
            const fmt = { to: v => Math.round(v), from: v => Number(v) };

            const trackCountEl = document.getElementById('trackCountSlider');
            if (!trackCountEl) return;

            this.sliders.trackCount = noUiSlider.create(trackCountEl, {
                start: [this.trackCount], step: 5,
                range: { 'min': 10, 'max': 50 }, format: fmt
            });
            this.sliders.trackCount.on('update', (values) => { vm.trackCount = parseInt(values[0]); });

            const yearRangeEl = document.getElementById('yearRangeSlider');
            this.sliders.yearRange = noUiSlider.create(yearRangeEl, {
                start: [this.yearRange[0], this.yearRange[1]], connect: true,
                range: { 'min': 1950, 'max': 2025 }, format: fmt
            });
            this.sliders.yearRange.on('update', (values) => { vm.yearRange = [parseInt(values[0]), parseInt(values[1])]; });

            const chillEl = document.getElementById('chillSlider');
            this.sliders.chill = noUiSlider.create(chillEl, {
                start: [this.chill], step: 1,
                range: { 'min': 1, 'max': 10 }, format: fmt
            });
            this.sliders.chill.on('update', (values) => { vm.chill = parseInt(values[0]); });

            const energyEl = document.getElementById('energySlider');
            this.sliders.energy = noUiSlider.create(energyEl, {
                start: [this.energy], step: 1,
                range: { 'min': 1, 'max': 10 }, format: fmt
            });
            this.sliders.energy.on('update', (values) => { vm.energy = parseInt(values[0]); });
        },
        async loadLastPlaylist() {
            try {
                const response = await fetch('/last-playlist');
                const data = await response.json();
                if (data.playlist) {
                    this.lastPlaylist = data;
                }
            } catch (error) {
                console.error('Error loading playlist:', error);
            }
        },
        async generatePlaylist() {
            if (this.isGenerating || !this.prompt.trim()) return;
            this.isGenerating = true;
            try {
                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: this.finalPrompt })
                });
                const data = await response.json();
                if (data.tracks_added && data.tracks_added.length > 0) {
                    this.lastPlaylist = data;
                }
            } catch (error) {
                console.error('Error generating:', error);
            } finally {
                this.isGenerating = false;
            }
        }
    }
};
