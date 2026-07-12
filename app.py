from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from datetime import datetime, date

app = Flask(__name__)
CORS(app)

# ─── In-memory data store ────────────────────────────────────────────────
data = {
    "user": {
        "id": "u_zpa8fw4o93mo",
        "name": "Student",
        "grade": "GRADE 10",
        "board": "CBSE",
        "role": "2ND YR STUDENT"
    },
    "engagement": {
        "score": 0.0,
        "videoMinutes": 0.0,
        "quizScores": [],
        "focusSilenceBonus": 0.0,
        "streakDays": 1,
        "idlePenalty": 0.0,
        "snapshots": []
    },
    "streak": {
        "current": 1,
        "longest": 1,
        "totalActiveDays": 1,
        "activeDates": [str(date.today())]
    },
    "notes": [],
    "bookmarks": [],
    "focusCycles": 0,
    "leaderboard": [
        {"id": 1, "name": "Aarav Mehta",  "score": 92.4, "initials": "A"},
        {"id": 2, "name": "Diya Sharma",  "score": 88.1, "initials": "D"},
        {"id": 3, "name": "Kabir Rao",    "score": 85.7, "initials": "K"},
        {"id": 4, "name": "Priya Nair",   "score": 79.3, "initials": "P"},
        {"id": 5, "name": "Rohan Gupta",  "score": 74.6, "initials": "R"},
        {"id": 6, "name": "Ananya Singh", "score": 68.2, "initials": "A"},
        {"id": 7, "name": "Vikram Patel", "score": 55.9, "initials": "V"},
        {"id": 8, "name": "Student",      "score": 0.0,  "initials": "S", "isCurrentUser": True}
    ],
    "badges": [
        {"id": 1, "name": "First Step",      "desc": "Log your first activity",  "icon": "✦",  "unlocked": False},
        {"id": 2, "name": "Quiz Master",     "desc": "Score 90%+ on a quiz",     "icon": "🔒", "unlocked": False},
        {"id": 3, "name": "Marathon Runner", "desc": "Watch 30+ minutes",        "icon": "🔒", "unlocked": False},
        {"id": 4, "name": "On Fire",         "desc": "3-day streak",             "icon": "🔒", "unlocked": False},
        {"id": 5, "name": "Dedicated",       "desc": "7-day streak",             "icon": "🔒", "unlocked": False},
        {"id": 6, "name": "Top Performer",   "desc": "Engagement score 80+",     "icon": "🔒", "unlocked": False},
        {"id": 7, "name": "Scholar",         "desc": "Complete all chapters",    "icon": "🔒", "unlocked": False}
    ],
    "videos": [
        {"id": 1, "channel": "MAGNET BRAINS",  "title": "Real Numbers Full Chapter", "ytId": "AiDSReMvj9k"},
        {"id": 2, "channel": "VEDANTU",        "title": "Real Numbers One Shot",     "ytId": "nwk6eFTKlaQ"},
        {"id": 3, "channel": "BYJU'S",         "title": "Real Numbers Complete",     "ytId": "WlAGhaCazY8"},
        {"id": 4, "channel": "PHYSICS WALLAH", "title": "Euclid's Division Lemma",  "ytId": "EBm2ENRU2TE"}
    ],
    "quiz": [
        {"id":1,  "q":"Every rational number can be expressed as:",      "opts":["Terminating decimal","Non-terminating repeating","Either terminating or repeating","Non-terminating non-repeating"],"ans":2},
        {"id":2,  "q":"√2 is:",                                          "opts":["Rational","Irrational","Integer","Natural number"],                                                                  "ans":1},
        {"id":3,  "q":"HCF of 26 and 91 is:",                           "opts":["13","26","7","1"],                                                                                                   "ans":0},
        {"id":4,  "q":"The decimal expansion of 17/8 is:",              "opts":["Terminating","Non-terminating repeating","Non-terminating non-repeating","None"],                                    "ans":0},
        {"id":5,  "q":"Euclid's Division Lemma: a = bq + r where:",    "opts":["0 ≤ r < b","0 < r ≤ b","0 ≤ r ≤ b","r > b"],                                                                       "ans":0},
        {"id":6,  "q":"LCM × HCF = ?",                                 "opts":["a + b","a × b","a - b","a / b"],                                                                                     "ans":1},
        {"id":7,  "q":"π is a:",                                         "opts":["Rational number","Irrational number","Integer","Whole number"],                                                      "ans":1},
        {"id":8,  "q":"Prime factorization of 120 is:",                 "opts":["2³ × 3 × 5","2² × 3 × 5","2³ × 5","2² × 3² × 5"],                                                                  "ans":0},
        {"id":9,  "q":"0.333... is:",                                    "opts":["Rational number","Irrational number","Integer","None"],                                                              "ans":0},
        {"id":10, "q":"Fundamental Theorem of Arithmetic is about:",    "opts":["Unique prime factorization","HCF only","LCM only","None"],                                                           "ans":0}
    ]
}

# ─── Score Engine ─────────────────────────────────────────────────────────
# MAX 100 pts:
#   Video   : 4 pts/min  → max 40 pts  (capped at 10 min)
#   Quiz    : avg of last 5 scores × 0.30 → max 30 pts
#   Silence : accumulated bonus → max 20 pts
#   Streak  : 1 pt/day → max 10 pts
#   Idle    : penalty subtracted → max -20 pts
def recalculate_score():
    eng = data["engagement"]
    video_pts   = min(eng["videoMinutes"] * 4.0, 40.0)
    recent      = eng["quizScores"][-5:] if eng["quizScores"] else []
    quiz_pts    = (sum(recent) / len(recent)) * 0.30 if recent else 0.0
    silence_pts = min(eng["focusSilenceBonus"], 20.0)
    streak_pts  = min(eng["streakDays"] * 1.0, 10.0)
    penalty     = min(eng["idlePenalty"], 20.0)
    raw = video_pts + quiz_pts + silence_pts + streak_pts - penalty
    eng["score"] = round(max(0.0, min(100.0, raw)), 1)

    # ── Derived display fields expected by the frontend ──────────────────
    eng["videoActivity"]    = round(eng["videoMinutes"], 2)
    eng["quizPerformance"]  = round(sum(recent) / len(recent), 1) if recent else 0.0
    eng["focusSilence"]     = round(min(silence_pts / 20.0 * 100, 100), 1)
    eng["streakBonus"]      = round(min(streak_pts / 10.0 * 100, 100), 1)

    # keep leaderboard in sync
    for p in data["leaderboard"]:
        if p.get("isCurrentUser"):
            p["score"] = eng["score"]
    _check_badges()
    return eng["score"]

def _check_badges():
    eng = data["engagement"]
    for b in data["badges"]:
        if b["name"] == "First Step"      and (eng["videoMinutes"] > 0 or len(eng["quizScores"]) > 0):
            b["unlocked"] = True
        if b["name"] == "Quiz Master"     and any(s >= 90 for s in eng["quizScores"]):
            b["unlocked"] = True
        if b["name"] == "Marathon Runner" and eng["videoMinutes"] >= 30:
            b["unlocked"] = True
        if b["name"] == "On Fire"         and eng["streakDays"] >= 3:
            b["unlocked"] = True
        if b["name"] == "Dedicated"       and eng["streakDays"] >= 7:
            b["unlocked"] = True
        if b["name"] == "Top Performer"   and eng["score"] >= 80:
            b["unlocked"] = True

# ─── Page ────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

# ─── Engagement API ──────────────────────────────────────────────────────
@app.get("/api/engagement")
def get_engagement():
    recalculate_score()
    return jsonify(data["engagement"])

@app.post("/api/engagement/refresh")
def refresh_engagement():
    recalculate_score()
    snap = {"score": data["engagement"]["score"], "time": datetime.now().isoformat()}
    data["engagement"]["snapshots"].append(snap)
    return jsonify(data["engagement"])

# Frontend pings every 5 s while video is playing
@app.post("/api/engagement/video-ping")
def video_ping():
    secs = request.json.get("seconds", 5)
    data["engagement"]["videoMinutes"] += secs / 60.0
    data["engagement"]["videoMinutes"]  = round(data["engagement"]["videoMinutes"], 3)
    recalculate_score()
    return jsonify({"score": data["engagement"]["score"],
                    "videoMinutes": round(data["engagement"]["videoMinutes"], 2)})

# Frontend pings every 5 s while user is active (mouse/keyboard)
@app.post("/api/engagement/active-ping")
def active_ping():
    data["engagement"]["focusSilenceBonus"] = min(
        data["engagement"]["focusSilenceBonus"] + 0.4, 20.0)
    recalculate_score()
    return jsonify({"score": data["engagement"]["score"],
                    "silenceBonus": round(data["engagement"]["focusSilenceBonus"], 2)})

# Frontend calls when idle >= 30 s
@app.post("/api/engagement/idle-penalty")
def idle_penalty():
    secs = request.json.get("seconds", 30)
    data["engagement"]["idlePenalty"] = round(
        min(data["engagement"]["idlePenalty"] + secs / 30.0, 20.0), 2)
    recalculate_score()
    return jsonify({"score": data["engagement"]["score"],
                    "idlePenalty": data["engagement"]["idlePenalty"]})

# Frontend calls when user returns from idle
@app.post("/api/engagement/idle-clear")
def idle_clear():
    data["engagement"]["idlePenalty"] = max(
        0.0, data["engagement"]["idlePenalty"] - 0.5)
    recalculate_score()
    return jsonify({"score": data["engagement"]["score"]})

# ─── Quiz API ────────────────────────────────────────────────────────────
@app.get("/api/quiz")
def get_quiz():
    return jsonify(data["quiz"])

@app.post("/api/quiz/submit")
def submit_quiz():
    answers = request.json.get("answers", [])
    correct = sum(1 for i, a in enumerate(answers)
                  if i < len(data["quiz"]) and a == data["quiz"][i]["ans"])
    pct = round((correct / len(data["quiz"])) * 100)
    data["engagement"]["quizScores"].append(pct)
    recalculate_score()
    return jsonify({"correct": correct, "total": len(data["quiz"]),
                    "score": pct, "engagementScore": data["engagement"]["score"]})

# ─── Other APIs ──────────────────────────────────────────────────────────
@app.get("/api/user")
def get_user():
    return jsonify(data["user"])

@app.get("/api/streak")
def get_streak():
    return jsonify(data["streak"])

@app.get("/api/notes")
def get_notes():
    return jsonify({"notes": data["notes"], "bookmarks": data["bookmarks"]})

@app.post("/api/notes")
def add_note():
    body = request.json
    note = {"id": int(datetime.now().timestamp()*1000),
            "text": body.get("text",""), "createdAt": datetime.now().isoformat()}
    data["notes"].append(note)
    return jsonify(note)

@app.delete("/api/notes/<int:nid>")
def delete_note(nid):
    data["notes"] = [n for n in data["notes"] if n["id"] != nid]
    return jsonify({"success": True})

@app.post("/api/bookmarks")
def add_bookmark():
    bm = {"id": int(datetime.now().timestamp()*1000), **request.json}
    data["bookmarks"].append(bm)
    return jsonify(bm)

@app.delete("/api/bookmarks/<int:bid>")
def delete_bookmark(bid):
    data["bookmarks"] = [b for b in data["bookmarks"] if b["id"] != bid]
    return jsonify({"success": True})

@app.get("/api/leaderboard")
def get_leaderboard():
    recalculate_score()
    return jsonify(sorted(data["leaderboard"], key=lambda x: x["score"], reverse=True))

@app.get("/api/badges")
def get_badges():
    return jsonify(data["badges"])

@app.get("/api/videos")
def get_videos():
    return jsonify(data["videos"])

@app.get("/api/focus-cycles")
def get_focus_cycles():
    return jsonify({"cycles": data["focusCycles"]})

@app.post("/api/focus-cycles")
def inc_focus_cycles():
    data["focusCycles"] += 1
    data["engagement"]["focusSilenceBonus"] = min(
        data["engagement"]["focusSilenceBonus"] + 5.0, 20.0)
    recalculate_score()
    return jsonify({"cycles": data["focusCycles"],
                    "score": data["engagement"]["score"]})

if __name__ == "__main__":
    app.run(debug=True, port=5000)