# QCraft — AI-Powered Playlist Generator for Qobuz

Describe a mood in natural language, and QCraft uses Claude AI to generate track suggestions, verifies availability on Qobuz, scores each track on quality + relevance (threshold 7/10), and automatically creates the playlist in your Qobuz account.

## Features

- **AI-powered generation** — Claude analyzes your prompt and suggests tracks matching your vibe
- **Double scoring** — Each track is scored on musical quality AND contextual relevance (both must be >= 7/10)
- **12 mood presets** — One-click moods: Morning Calm, Electro Chill, Vintage Rock, Funky Night, Urban Jazz, Rainy Cafe, Dark Techno, Tropical Chill, Night Drive, Positive Energy, Nostalgic Ballad, Acoustic Evening
- **10 tag filter groups** — Voice type, language, version, mood, content, mindset, origin, era, scene, production quality
- **Parameter sliders** — Track count (10-50), year range (1950-2025), chillness, energy level
- **Multi-profile** — Multiple Qobuz accounts with profile switcher
- **Autopilot cron** — Weekly automatic playlist generation (Monday 6am)
- **History** — Grid and list views with album covers, Qobuz deep links, profile badges
- **Hero section** — Featured last playlist with blurred album art backdrop
- **5 themes** — Dark, Light, OLED, Neon, Ember (persisted in localStorage)
- **PWA-ready** — Mobile-optimized with touch-friendly UI

## How It Works

```
1. You describe a mood       →  "Chill jazz for a rainy afternoon"
2. Claude AI generates        →  20-30 track suggestions per attempt
3. Qobuz search              →  Verifies each track is available for streaming
4. AI double-scoring          →  Quality: 8/10, Relevance: 9/10 → Score: 8/10
5. Threshold filter           →  Only tracks scoring >= 7/10 are kept
6. Playlist creation          →  Auto-created in your Qobuz account
```

Up to 5 generation attempts to reach the target track count.

## Screenshots

*Coming soon*

## Installation

### Docker (recommended)

```bash
git clone https://github.com/great-horn/qcraft.git
cd qcraft
cp .env.example .env
# Edit .env with your API keys (see Configuration below)
docker compose up -d
```

The app will be available at `http://localhost:9898`.

Alternatively, use the provided `docker-compose.example.yml`:

```bash
cp docker-compose.example.yml docker-compose.yml
docker compose up -d
```

### Python (direct)

```bash
git clone https://github.com/great-horn/qcraft.git
cd qcraft
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
python app.py
```

The app will be available at `http://localhost:5000`.

## Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```env
# Required
ANTHROPIC_API_KEY=your-anthropic-api-key
QOBUZ_APP_ID=your-qobuz-app-id

# Profiles (comma-separated names)
QOBUZ_PROFILES=default
QOBUZ_USER_TOKEN_DEFAULT=your-qobuz-user-auth-token

# Optional: multiple profiles
# QOBUZ_PROFILES=alice,bob
# QOBUZ_USER_TOKEN_ALICE=token-for-alice
# QOBUZ_USER_TOKEN_BOB=token-for-bob

# Optional
FLASK_SECRET_KEY=change-me-to-a-random-string
TZ=Europe/Zurich
```

### Multiple Profiles

To set up multiple Qobuz profiles:

1. List profile names in `QOBUZ_PROFILES` (comma-separated)
2. Add a `QOBUZ_USER_TOKEN_<NAME>` variable for each profile (uppercase)
3. The first profile in the list becomes the default

Profiles appear in the sidebar dropdown and are saved per-playlist in the history.

## Getting Qobuz Credentials

### App ID

The Qobuz App ID can be found by inspecting network requests in the Qobuz web player. Look for `app_id` in API calls to `www.qobuz.com/api.json/`.

### User Auth Token

1. Log into [play.qobuz.com](https://play.qobuz.com)
2. Open browser DevTools → Network tab
3. Look for any API request to `www.qobuz.com/api.json/`
4. Find the `user_auth_token` parameter in the request

> **Note:** Qobuz requires an active subscription (Studio/Sublime) for streaming access.

## Shared CSS/JS

QCraft ships with a `shared/` directory containing all required CSS and JS assets (themes, layout, components, animations). Everything works out of the box — no extra configuration needed.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Main SPA |
| POST | `/generate` | Generate a playlist from a prompt |
| GET | `/api/history` | Playlist history (JSON) |
| GET | `/api/profiles` | Configured profiles list |
| GET | `/api/qobuz-check` | Test Qobuz API connection |
| GET | `/api/dashboard-stats` | Stats for external dashboards |
| GET | `/last-playlist` | Last generated playlist |
| GET | `/get-profile` | Current active profile |
| GET | `/set-profile/<name>` | Switch active profile |

## Tech Stack

- **Backend**: Flask + Gunicorn
- **AI**: Anthropic Claude (configurable model)
- **Music**: Qobuz API (search + playlist creation)
- **Frontend**: Vue.js 3 (CDN) + noUiSlider
- **Database**: SQLite
- **Container**: Docker with weekly cron autopilot

## Roadmap

- [ ] GPT/OpenAI support as alternative AI provider
- [ ] Spotify integration
- [ ] Multi-language prompt support
- [ ] Playlist sharing / export
- [ ] Track preview playback

## License

[GPL-3.0](LICENSE)
