import os

# Anthropic Configuration (Claude AI)
ANTHROPIC_MODEL = "claude-sonnet-4-6"
SCORE_THRESHOLD = 7
MAX_GENERATION_ATTEMPTS = 5

# Qobuz Configuration
QOBUZ_BASE_URL = "https://www.qobuz.com/api.json/0.2"
QOBUZ_APP_ID = os.getenv("QOBUZ_APP_ID")

# Dynamic profiles from environment
QOBUZ_PROFILES = [p.strip() for p in os.getenv("QOBUZ_PROFILES", "default").split(",") if p.strip()]
QOBUZ_USER_TOKENS = {}
for _p in QOBUZ_PROFILES:
    _token = os.getenv(f"QOBUZ_USER_TOKEN_{_p.upper()}")
    if _token:
        QOBUZ_USER_TOKENS[_p] = _token
DEFAULT_PROFILE = QOBUZ_PROFILES[0] if QOBUZ_PROFILES else "default"

# Default token (for compatibility)
QOBUZ_USER_TOKEN = QOBUZ_USER_TOKENS.get(DEFAULT_PROFILE)

# Playlist Configuration
DEFAULT_TRACK_COUNT = 30
DEFAULT_TRACK_DURATION = 180  # 3 minutes en secondes
MAX_TRACKS_LIMIT = 100

# Database Configuration
DB_PATH = os.path.join("data", "playlist_history.db")

# System prompts
PLAYLIST_SYSTEM_PROMPT = """Tu es un générateur de playlists. Quand on te donne une ambiance ou un style, tu dois renvoyer exactement 1 ligne par morceau, au format : Nom de l'artiste – Titre du morceau. Aucun commentaire, aucune introduction, aucun guillemet. Donne uniquement des morceaux disponibles sur Qobuz, et idéalement en streaming. Maximum de morceaux 100, sauf si j'en demande moins dans le prompt."""

TITLE_GENERATION_PROMPT = """Génère un titre de playlist court et accrocheur (maximum 5 mots) pour cette demande : "{prompt}"

Le titre doit être:
- Simple et compréhensible
- Évocateur de l'ambiance demandée
- Sans guillemets ni ponctuation excessive
- En français

Exemples de bons titres:
- "Chill Électronique"
- "Jazz Café Parisien"
- "Rock Vintage 70s"
- "Détente Acoustique"
- "Énergie Matinale"

Réponds UNIQUEMENT par le titre, rien d'autre."""

SCORING_PROMPT = """Évalue '{title}' de {artist} pour la playlist : "{context}"

Critères (1-10) :
- QUALITÉ : valeur esthétique musicale
- PERTINENCE : correspondance au contexte

Réponds UNIQUEMENT avec ce JSON, RIEN d'autre :
{{"qualite": X, "pertinence": Y}}

Exemples de réponses COMPLÈTES (pas de texte avant/après) :
{{"qualite": 9, "pertinence": 3}}
{{"qualite": 7, "pertinence": 9}}
{{"qualite": 10, "pertinence": 10}}"""