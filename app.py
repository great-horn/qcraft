import os
import sqlite3
import datetime
import requests
import json
import signal
import sys
import re
import random
import time
from flask import Flask, request, jsonify, send_file, session, send_from_directory
from anthropic import Anthropic
from functools import partial
from config import *

print = partial(print, flush=True)

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "qcraft-secret-key-change-in-production")
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def get_current_token():
    """Récupère le token Qobuz selon le profil actif en session"""
    profile = session.get('qcraft_profile', DEFAULT_PROFILE)
    return QOBUZ_USER_TOKENS.get(profile, QOBUZ_USER_TOKENS.get(DEFAULT_PROFILE))

def get_current_profile():
    """Récupère le profil actif en session"""
    return session.get('qcraft_profile', DEFAULT_PROFILE)

def ensure_tables():
    """Initialise la base de données et s'assure que toutes les colonnes existent"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Créer la table principale
    c.execute("""CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY,
        date TEXT,
        title TEXT,
        qobuz_playlist_id TEXT,
        duration INTEGER
    )""")

    # Ajouter les colonnes manquantes si nécessaire
    c.execute("PRAGMA table_info(history)")
    columns = [col[1] for col in c.fetchall()]

    if "tracks_json" not in columns:
        c.execute("ALTER TABLE history ADD COLUMN tracks_json TEXT")
    if "prompt" not in columns:
        c.execute("ALTER TABLE history ADD COLUMN prompt TEXT")
    if "profile" not in columns:
        c.execute("ALTER TABLE history ADD COLUMN profile TEXT DEFAULT 'default'")

    conn.commit()
    conn.close()

ensure_tables()

@app.route('/shared/<path:filename>')
def serve_shared(filename):
    """Serve shared assets"""
    return send_from_directory('/app/shared', filename)

@app.route("/")
def index():
    """Page principale"""
    return send_file("static/index.html")

@app.route("/set-profile/<profile>")
def set_profile(profile):
    """Change le profil actif"""
    if profile in QOBUZ_USER_TOKENS:
        session['qcraft_profile'] = profile
        return jsonify({"success": True, "profile": profile})
    return jsonify({"success": False, "error": "Profil invalide"}), 400

@app.route("/get-profile")
def get_profile():
    """Récupère le profil actif"""
    return jsonify({"profile": get_current_profile()})

@app.route("/api/profiles")
def api_profiles():
    """Retourne la liste des profils configurés"""
    return jsonify({"profiles": list(QOBUZ_USER_TOKENS.keys()), "default": DEFAULT_PROFILE})

@app.route("/api/history")
def api_history():
    """Retourne l'historique des playlists en JSON"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT date, title, qobuz_playlist_id, duration, tracks_json, prompt, profile
        FROM history ORDER BY id DESC
    """)
    rows = c.fetchall()
    conn.close()

    playlists = []
    for row in rows:
        playlists.append({
            'date': row[0],
            'title': row[1],
            'qobuz_playlist_id': row[2],
            'duration': row[3],
            'tracks': json.loads(row[4]) if row[4] else [],
            'prompt': row[5],
            'profile': row[6]
        })

    return jsonify(playlists)

@app.route("/api/qobuz-check")
def api_qobuz_check():
    """Test de connexion à l'API Qobuz — retourne JSON"""
    user_token = get_current_token()
    profile = get_current_profile()

    if not QOBUZ_APP_ID or not user_token:
        return jsonify({
            "status": "error",
            "title": "Configuration incomplète",
            "message": "App ID ou token manquant dans les variables d'environnement.",
            "profile": profile,
            "details": None
        })

    try:
        test_url = f"{QOBUZ_BASE_URL}/track/search"
        r = requests.get(test_url, params={
            "query": "test",
            "app_id": QOBUZ_APP_ID,
            "user_auth_token": user_token
        }, timeout=10)

        result = r.json()

        if "error" in result:
            return jsonify({
                "status": "error",
                "title": "Erreur API Qobuz",
                "message": result['error'].get('message', 'Erreur inconnue'),
                "profile": profile,
                "details": {
                    "Code HTTP": r.status_code,
                    "Profil": profile
                }
            })
        else:
            tracks_count = len(result.get('tracks', {}).get('items', []))
            return jsonify({
                "status": "success",
                "title": "Connexion réussie",
                "message": "L'API Qobuz répond correctement. Ton profil est bien configuré.",
                "profile": profile,
                "details": {
                    "Code HTTP": r.status_code,
                    "Profil": profile,
                    "Résultats test": f"{tracks_count} morceaux trouvés"
                }
            })

    except requests.RequestException as e:
        return jsonify({
            "status": "error",
            "title": "Erreur de connexion",
            "message": f"Impossible de contacter l'API Qobuz : {str(e)}",
            "profile": profile,
            "details": None
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "title": "Erreur inattendue",
            "message": str(e),
            "profile": profile,
            "details": None
        })

def search_qobuz_track(query, user_token):
    """Recherche un morceau sur Qobuz"""
    try:
        response = requests.get(f"{QOBUZ_BASE_URL}/track/search", params={
            "query": query,
            "app_id": QOBUZ_APP_ID,
            "user_auth_token": user_token
        }, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Erreur API Qobuz: {response.status_code}")
            return None
            
        return response.json()
    except requests.RequestException as e:
        print(f"❌ Erreur réseau Qobuz: {e}")
        return None

def call_claude_with_retry(func, max_retries=3, initial_delay=2):
    """Appelle Claude avec retry exponentiel en cas d'overload"""
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            error_msg = str(e)
            if "529" in error_msg or "overloaded" in error_msg.lower():
                if attempt < max_retries - 1:
                    delay = initial_delay * (2 ** attempt)
                    print(f"⏳ API overloaded, retry dans {delay}s (tentative {attempt + 1}/{max_retries})")
                    time.sleep(delay)
                    continue
            raise
    raise Exception("Max retries atteint après surcharge API")

def score_track_with_ai(title, artist, context=""):
    """Score un morceau avec l'IA (qualité + pertinence) avec parsing robuste"""
    try:
        def call_api():
            return client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=150,
                messages=[{"role": "user", "content": SCORING_PROMPT.format(title=title, artist=artist, context=context)}]
            )

        scoring = call_claude_with_retry(call_api)
        score_text = scoring.content[0].text.strip()
        print(f'🎯 Réponse brute IA pour "{title}": "{score_text}"')

        # Nettoyer les backticks markdown si présents
        if score_text.startswith('```'):
            # Extraire le JSON entre les backticks
            lines = score_text.split('\n')
            json_lines = [line for line in lines if line and not line.startswith('```')]
            score_text = '\n'.join(json_lines).strip()

        # Méthode 1: Parser le JSON
        try:
            scores = json.loads(score_text)
            qualite = int(scores.get('qualite', 5))
            pertinence = int(scores.get('pertinence', 5))
            print(f'🎵 Qualité: {qualite}/10 | 🎯 Pertinence: {pertinence}/10')
            # Retourner la moyenne des deux scores
            score_final = (qualite + pertinence) // 2
            print(f'✅ Score final: {score_final}/10')
            return score_final
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            print(f'⚠️ Erreur parsing JSON: {e}, fallback sur ancien système')

        # Fallback: Méthode 2: Chercher le premier nombre dans la réponse
        import re
        numbers = re.findall(r'\b([1-9]|10)\b', score_text)
        if numbers:
            score = int(numbers[0])
            print(f'🧠 Score extrait (fallback): {score}/10')
            return score
        
        # Méthode 2: Chercher n'importe quel chiffre/nombre
        all_digits = re.findall(r'\d+', score_text)
        if all_digits:
            potential_score = int(all_digits[0])
            # Valider que c'est dans la plage 1-10
            if 1 <= potential_score <= 10:
                print(f'🧠 Score extrait (méthode 2): {potential_score}/10')
                return potential_score
            # Si > 10, peut-être format "8/10" ou "80%"
            elif potential_score > 10:
                if potential_score <= 100:  # Pourcentage probable
                    normalized = max(1, min(10, potential_score // 10))
                    print(f'🧠 Score normalisé depuis {potential_score}%: {normalized}/10')
                    return normalized
        
        # Méthode 3: Mots-clés de fallback
        score_text_lower = score_text.lower()
        if any(word in score_text_lower for word in ['excellent', 'parfait', 'exceptionnel', 'magnifique']):
            print('🧠 Score déduit (excellent): 9/10')
            return 9
        elif any(word in score_text_lower for word in ['très bon', 'très bien', 'superbe', 'formidable']):
            print('🧠 Score déduit (très bon): 8/10')
            return 8
        elif any(word in score_text_lower for word in ['bon', 'bien', 'correct', 'décent']):
            print('🧠 Score déduit (bon): 7/10')
            return 7
        elif any(word in score_text_lower for word in ['moyen', 'passable', 'ok']):
            print('🧠 Score déduit (moyen): 5/10')
            return 5
        elif any(word in score_text_lower for word in ['mauvais', 'nul', 'horrible', 'terrible']):
            print('🧠 Score déduit (mauvais): 2/10')
            return 2
            
        # Si aucune méthode ne fonctionne, score conservateur
        print(f'⚠️ Impossible d\'extraire un score de: "{score_text}" - Score par défaut: 5/10')
        return 5
        
    except Exception as e:
        print(f"❌ Erreur scoring IA: {e}")
        return 5  # Score neutre au lieu de 0 pour ne pas pénaliser

def generate_playlist_title(prompt, track_titles):
    """Génère un titre de playlist avec l'IA - version simplifiée"""
    try:
        def call_api():
            return client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=100,
                messages=[{
                    "role": "user",
                    "content": TITLE_GENERATION_PROMPT.format(prompt=prompt)
                }]
            )

        response = call_claude_with_retry(call_api)
        title = response.content[0].text.strip().strip('"').strip("'")
        
        # Nettoyer le titre
        title = re.sub(r'[^\w\s\-àáâãäåçèéêëìíîïñòóôõöùúûüýÿ]', '', title)
        title = ' '.join(title.split())  # Normaliser les espaces
        
        # Limiter la longueur
        if len(title) > 50:
            title = title[:47] + "..."
            
        # Fallbacks si le titre est vide ou trop court
        if len(title.strip()) < 3:
            title = generate_fallback_title(prompt)
            
        print(f'🏷️ Titre généré: "{title}"')
        return title
        
    except Exception as e:
        print(f"❌ Erreur génération titre: {e}")
        return generate_fallback_title(prompt)

def generate_fallback_title(prompt):
    """Génère un titre de fallback basé sur des mots-clés du prompt"""
    prompt_lower = prompt.lower()
    
    # Détection de genre/style
    if any(word in prompt_lower for word in ['jazz', 'swing', 'bebop']):
        return "Session Jazz"
    elif any(word in prompt_lower for word in ['rock', 'guitar', 'grunge']):
        return "Rock Sélection"
    elif any(word in prompt_lower for word in ['électro', 'techno', 'house', 'edm']):
        return "Électro Mix"
    elif any(word in prompt_lower for word in ['chill', 'relax', 'cool', 'tranquille']):
        return "Ambiance Chill"
    elif any(word in prompt_lower for word in ['classique', 'orchestra', 'symphon']):
        return "Classique Sélection"
    elif any(word in prompt_lower for word in ['funk', 'groove', 'soul']):
        return "Groove Session"
    elif any(word in prompt_lower for word in ['pop', 'mainstream', 'hit']):
        return "Pop Hits"
    elif any(word in prompt_lower for word in ['indie', 'alternatif', 'indé']):
        return "Indie Vibes"
    elif any(word in prompt_lower for word in ['reggae', 'ska', 'dub']):
        return "Reggae Vibes"
    elif any(word in prompt_lower for word in ['metal', 'hard', 'heavy']):
        return "Metal Power"
    
    # Détection d'ambiance/moment
    elif any(word in prompt_lower for word in ['matin', 'morning', 'réveil']):
        return "Playlist Matinale"
    elif any(word in prompt_lower for word in ['soir', 'nuit', 'evening']):
        return "Soirée Musicale"
    elif any(word in prompt_lower for word in ['travail', 'bureau', 'focus']):
        return "Focus Musique"
    elif any(word in prompt_lower for word in ['sport', 'workout', 'fitness']):
        return "Énergie Sport"
    elif any(word in prompt_lower for word in ['voyage', 'route', 'road']):
        return "Route Playlist"
    elif any(word in prompt_lower for word in ['café', 'coffee', 'bistro']):
        return "Café Ambiance"
    
    # Fallback ultime
    return f"Playlist {datetime.datetime.now().strftime('%d/%m')}"

def create_qobuz_playlist(title, track_ids, user_token):
    """Crée une playlist sur Qobuz et y ajoute les morceaux"""
    try:
        # Créer la playlist
        playlist_response = requests.get(f"{QOBUZ_BASE_URL}/playlist/create", params={
            "name": title,
            "user_auth_token": user_token,
            "app_id": QOBUZ_APP_ID
        }, timeout=10)

        if playlist_response.status_code != 200:
            print(f"❌ Erreur création playlist: {playlist_response.status_code}")
            return None

        playlist_data = playlist_response.json()
        playlist_id = playlist_data.get("id")

        if not playlist_id:
            print("❌ Pas d'ID de playlist retourné")
            return None

        # Ajouter les morceaux
        add_response = requests.post(f"{QOBUZ_BASE_URL}/playlist/addTracks", data={
            "playlist_id": playlist_id,
            "track_ids": ",".join(map(str, track_ids)),
            "user_auth_token": user_token,
            "app_id": QOBUZ_APP_ID
        }, timeout=15)
        
        print(f"📡 Réponse ajout morceaux: {add_response.status_code}")
        return playlist_id
        
    except requests.RequestException as e:
        print(f"❌ Erreur réseau Qobuz: {e}")
        return None

def save_to_history(title, playlist_id, duration, tracks, prompt, profile):
    """Sauvegarde la playlist dans l'historique"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        tracks_json = json.dumps([
            {
                "title": track.get("title"),
                "artist": (
                    track["artist"]["name"]
                    if isinstance(track.get("artist"), dict) and "name" in track["artist"]
                    else track.get("artist") or track.get("performer", {}).get("name") or ""
                ),
                "id": track.get("id"),
                "album_cover": track.get("album_cover"),
                "album_title": track.get("album_title", "")
            }
            for track in tracks if track.get("title") and track.get("id")
        ])

        c.execute("""
            INSERT INTO history (date, title, qobuz_playlist_id, duration, tracks_json, prompt, profile)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            title,
            playlist_id,
            duration,
            tracks_json,
            prompt,
            profile
        ))

        conn.commit()
        conn.close()
        print(f"💾 Sauvegardé en base: {title} (profil: {profile})")

    except sqlite3.Error as e:
        print(f"❌ Erreur base de données: {e}")

def generate_from_prompt(prompt, user_token):
    """Génère une playlist complète à partir d'un prompt"""
    print(f'🎬 Début génération avec prompt: {prompt}')

    # Extraire le nombre de morceaux demandé
    match = re.search(r'(\d+)\s*(morceaux|tracks|titres)', prompt.lower())
    nb_requested = int(match.group(1)) if match else DEFAULT_TRACK_COUNT
    print(f"🎯 Objectif: {nb_requested} morceaux avec score ≥{SCORE_THRESHOLD}")

    selected_tracks = []
    used_ids = set()
    total_duration = 0
    attempts = 0

    while len(selected_tracks) < nb_requested and attempts < MAX_GENERATION_ATTEMPTS:
        attempts += 1
        current_prompt = prompt if attempts == 1 else f"{prompt} Encore 5 morceaux dans le même style."

        print(f"🔁 Tentative {attempts}/{MAX_GENERATION_ATTEMPTS}")

        try:
            # Générer des suggestions avec Claude
            def call_api():
                return client.messages.create(
                    model=ANTHROPIC_MODEL,
                    max_tokens=2000,
                    system=PLAYLIST_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": current_prompt}]
                )

            response = call_claude_with_retry(call_api)
            raw_response = response.content[0].text
            suggested_tracks = [line.strip("- ") for line in raw_response.splitlines() if line.strip()]
            print(f'📝 {len(suggested_tracks)} suggestions reçues')

            # Traiter chaque suggestion
            for suggestion in suggested_tracks:
                if len(selected_tracks) >= nb_requested:
                    break

                print(f'🎶 Analyse: {suggestion}')

                # Rechercher sur Qobuz
                search_result = search_qobuz_track(suggestion, user_token)
                if not search_result:
                    continue
                    
                tracks = search_result.get("tracks", {}).get("items", [])
                if not tracks:
                    continue
                    
                track = tracks[0]  # Premier résultat
                track_id = track.get("id")
                
                # Vérifications de base
                if not track_id or track_id in used_ids:
                    continue
                    
                if not track.get("title") or not track.get("streamable", False):
                    continue
                    
                # Extraire l'artiste
                artist = track.get("artist") or track.get("performer")
                if not isinstance(artist, dict) or not artist.get("name"):
                    continue

                # Scorer avec l'IA (avec contexte du prompt)
                score = score_track_with_ai(track["title"], artist["name"], context=prompt)
                print(f'🧠 Score "{track["title"]}": {score}/10')

                # Ajouter si le score est suffisant
                if score >= SCORE_THRESHOLD:
                    # Enrichir le track avec l'URL de la pochette d'album
                    album = track.get("album", {})
                    track["album_cover"] = album.get("image", {}).get("large") or album.get("image", {}).get("small")
                    track["album_title"] = album.get("title", "")

                    selected_tracks.append(track)
                    used_ids.add(track_id)
                    total_duration += track.get("duration", DEFAULT_TRACK_DURATION) // 60
                    print(f'✅ Ajouté: {track["title"]} - {artist["name"]}')

        except Exception as e:
            print(f"❌ Erreur lors de la tentative {attempts}: {e}")
            continue

    print(f"🎵 Sélection terminée: {len(selected_tracks)} morceaux")

    if not selected_tracks:
        return jsonify({
            "error": "Aucun morceau trouvé correspondant aux critères",
            "playlist": "Erreur",
            "tracks_added": []
        })

    # Générer le titre de la playlist
    track_titles = [track["title"] for track in selected_tracks]
    playlist_title = generate_playlist_title(prompt, track_titles)

    # Créer la playlist sur Qobuz
    track_ids = [track["id"] for track in selected_tracks]
    playlist_id = create_qobuz_playlist(playlist_title, track_ids, user_token)

    # Récupérer le profil actuel depuis le token
    profile = DEFAULT_PROFILE
    for prof, token in QOBUZ_USER_TOKENS.items():
        if token == user_token:
            profile = prof
            break

    # Sauvegarder dans l'historique
    save_to_history(playlist_title, playlist_id, total_duration, selected_tracks, prompt, profile)

    # Préparer la réponse
    tracks_response = [
        {
            "title": track.get("title"),
            "artist": (
                track["artist"]["name"]
                if isinstance(track.get("artist"), dict) and "name" in track["artist"]
                else track.get("artist") or track.get("performer", {}).get("name") or ""
            ),
            "track_id": track.get("id"),
            "album_cover": track.get("album_cover"),
            "album_title": track.get("album_title", "")
        }
        for track in selected_tracks if track.get("title") and track.get("id")
    ]

    return jsonify({
        "playlist": playlist_title,
        "tracks_added": tracks_response
    })

@app.route("/last-playlist")
def last_playlist():
    """Récupère la dernière playlist générée"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT title, tracks_json, qobuz_playlist_id
        FROM history
        ORDER BY id DESC
        LIMIT 1
    """)
    row = c.fetchone()
    conn.close()
    
    if row:
        tracks = json.loads(row[1]) if row[1] else []
        return jsonify({
            "playlist": row[0],
            "tracks_added": tracks,
            "qobuz_playlist_id": row[2]
        })
    else:
        return jsonify({"playlist": None, "tracks_added": []})

@app.route('/api/dashboard-stats')
def get_dashboard_stats():
    """Endpoint optimisé pour Homepage Dashboard"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Stats globales
        c.execute("SELECT COUNT(*) FROM history")
        total_playlists = c.fetchone()[0]
        
        # 3 dernières playlists
        c.execute("""
            SELECT title, date, tracks_json, qobuz_playlist_id
            FROM history
            ORDER BY id DESC
            LIMIT 3
        """)
        recent_rows = c.fetchall()

        recent_playlists = []
        for row in recent_rows:
            tracks_data = json.loads(row[2]) if row[2] else []
            cover_url = tracks_data[0].get('album_cover', '') if tracks_data else ''
            recent_playlists.append({
                'name': row[0],
                'date': row[1],
                'track_count': len(tracks_data),
                'cover_url': cover_url,
                'qobuz_id': row[3] or ''
            })

        # Rétrocompatibilité
        if recent_playlists:
            last_playlist = recent_playlists[0]['name']
            last_date = recent_playlists[0]['date']
            last_track_count = recent_playlists[0]['track_count']
        else:
            last_playlist = "Aucune"
            last_date = "Jamais"
            last_track_count = 0

        # Playlists ce mois
        current_month = datetime.datetime.now().strftime('%Y-%m')
        c.execute("SELECT COUNT(*) FROM history WHERE date LIKE ?", (f"{current_month}%",))
        month_playlists = c.fetchone()[0]

        conn.close()

        return jsonify({
            'total_playlists': total_playlists,
            'last_playlist': last_playlist,
            'last_date': last_date,
            'last_tracks': last_track_count,
            'month_playlists': month_playlists,
            'recent_playlists': recent_playlists,
            'status': 'active'
        })
        
    except Exception as e:
        return jsonify({
            'total_playlists': 0,
            'last_playlist': 'Erreur',
            'last_date': 'Erreur',
            'last_tracks': 0,
            'month_playlists': 0,
            'status': 'error',
            'error': str(e)
        }), 500

@app.route("/generate", methods=["POST"])
def generate():
    """Endpoint pour générer une playlist"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Données JSON manquantes"}), 400

        prompt = data.get("prompt")
        if not prompt or not prompt.strip():
            return jsonify({"error": "Prompt vide"}), 400

        user_token = get_current_token()
        return generate_from_prompt(prompt.strip(), user_token)

    except Exception as e:
        print(f"❌ Erreur endpoint generate: {e}")
        return jsonify({"error": "Erreur serveur"}), 500

def graceful_exit(signum, frame):
    """Gestion propre de l'arrêt du serveur"""
    print("🔌 Fermeture propre du serveur...")
    sys.exit(0)

# Configuration des signaux
signal.signal(signal.SIGTERM, graceful_exit)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)