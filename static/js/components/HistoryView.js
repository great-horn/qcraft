export default {
    template: `
    <div>
        <h1 style="font-size: 1.875rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1.5rem;">Historique</h1>

        <!-- Loading -->
        <div v-if="loading" style="text-align: center; padding: 40px; color: var(--text-secondary);">
            Chargement...
        </div>

        <template v-else>
            <!-- Stats -->
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-label">Total playlists</div>
                    <div class="stat-value">{{ filteredPlaylists.length }}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total morceaux</div>
                    <div class="stat-value">{{ totalTracks }}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Duree totale</div>
                    <div class="stat-value">{{ totalDuration }}h</div>
                </div>
            </div>

            <!-- Filter + View Toggle -->
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
                <select class="profile-selector" v-model="filterProfile" style="width: auto; min-width: 160px;">
                    <option value="tous">All profiles</option>
                    <option v-for="p in profiles" :key="p" :value="p">{{ p.charAt(0).toUpperCase() + p.slice(1) }}</option>
                </select>
                <div style="display: flex; gap: 8px;">
                    <button @click="viewMode = 'grid'"
                            class="view-toggle-btn"
                            :style="viewMode === 'grid' ? 'background: var(--accent-primary); border-color: var(--accent-primary); color: white;' : ''">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block; pointer-events: none;">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                        </svg>
                    </button>
                    <button @click="viewMode = 'list'"
                            class="view-toggle-btn"
                            :style="viewMode === 'list' ? 'background: var(--accent-primary); border-color: var(--accent-primary); color: white;' : ''">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block; pointer-events: none;">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Grid View -->
            <div v-if="viewMode === 'grid'" class="playlists-grid">
                <a v-for="(playlist, index) in filteredPlaylists"
                   :key="index"
                   :href="'https://open.qobuz.com/playlist/' + playlist.qobuz_playlist_id"
                   target="_blank"
                   class="playlist-grid-card">
                    <img v-if="playlist.tracks.length > 0 && playlist.tracks[0].album_cover"
                         :src="playlist.tracks[0].album_cover"
                         :alt="playlist.title"
                         class="playlist-cover"
                         loading="lazy">
                    <div v-else class="playlist-cover-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary); opacity: 0.3;">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                    </div>
                    <div class="playlist-grid-info">
                        <div class="playlist-grid-title">{{ playlist.title }}</div>
                        <div class="playlist-grid-meta">
                            <span class="playlist-badge">{{ playlist.profile }}</span>
                            <span>{{ playlist.tracks.length }} morceaux</span>
                        </div>
                    </div>
                </a>
            </div>

            <!-- List View -->
            <div v-if="viewMode === 'list'">
                <div v-for="(playlist, index) in filteredPlaylists" :key="index" class="playlist-card">
                    <div class="playlist-header-list">
                        <div>
                            <div class="playlist-title">{{ playlist.title }}</div>
                            <div class="playlist-meta">
                                {{ playlist.date }} &bull; {{ playlist.profile }} &bull; {{ playlist.tracks.length }} morceaux &bull; {{ playlist.duration }} min
                            </div>
                        </div>
                        <div class="playlist-actions">
                            <button class="btn btn-secondary" @click="toggleTracks(index)">
                                {{ openPlaylists.includes(index) ? 'Masquer' : 'Voir morceaux' }}
                            </button>
                            <a v-if="playlist.qobuz_playlist_id"
                               :href="'https://open.qobuz.com/playlist/' + playlist.qobuz_playlist_id"
                               target="_blank"
                               class="btn btn-primary">
                                Ouvrir
                            </a>
                        </div>
                    </div>

                    <div v-if="playlist.prompt" class="prompt-text">
                        <strong>Prompt:</strong> {{ playlist.prompt }}
                    </div>

                    <div class="track-list" :class="{ open: openPlaylists.includes(index) }">
                        <a v-for="(track, trackIndex) in playlist.tracks"
                           :key="trackIndex"
                           :href="'https://open.qobuz.com/track/' + track.id"
                           target="_blank"
                           class="track-item">
                            <div class="track-number">{{ trackIndex + 1 }}</div>
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
            </div>

            <div v-if="filteredPlaylists.length === 0" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                Aucune playlist trouvee.
            </div>
        </template>
    </div>
    `,
    data() {
        return {
            playlists: [],
            profiles: [],
            filterProfile: 'tous',
            openPlaylists: [],
            viewMode: localStorage.getItem('qcraft_view_mode') || 'grid',
            loading: true
        };
    },
    watch: {
        viewMode(newVal) {
            localStorage.setItem('qcraft_view_mode', newVal);
        },
        filterProfile() {
            this.openPlaylists = [];
        }
    },
    computed: {
        filteredPlaylists() {
            if (this.filterProfile === 'tous') return this.playlists;
            return this.playlists.filter(p => p.profile === this.filterProfile);
        },
        totalTracks() {
            return this.filteredPlaylists.reduce((sum, p) => sum + p.tracks.length, 0);
        },
        totalDuration() {
            return Math.round(this.filteredPlaylists.reduce((sum, p) => sum + p.duration, 0) / 60);
        }
    },
    async mounted() {
        try {
            const [historyRes, profilesRes] = await Promise.all([
                fetch('/api/history'),
                fetch('/api/profiles')
            ]);
            this.playlists = await historyRes.json();
            const profilesData = await profilesRes.json();
            this.profiles = profilesData.profiles || [];
        } catch (error) {
            console.error('Erreur chargement historique:', error);
        } finally {
            this.loading = false;
        }
    },
    methods: {
        toggleTracks(index) {
            const idx = this.openPlaylists.indexOf(index);
            if (idx > -1) {
                this.openPlaylists.splice(idx, 1);
            } else {
                this.openPlaylists.push(index);
            }
        }
    }
};
