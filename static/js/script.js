// ── API Helper ──────────────────────────────────────────────────────────
const API = 'http://localhost:5000';
async function get(path)       { const r = await fetch(API+path);           return r.json(); }
async function post(path, body){ const r = await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); return r.json(); }
async function del(path)       { const r = await fetch(API+path,{method:'DELETE'}); return r.json(); }

// ── State ────────────────────────────────────────────────────────────────
const state = {
  page: 'dashboard',
  engagement: null,
  streak: null,
  notes: [], bookmarks: [],
  leaderboard: [],
  badges: [],
  videos: [],
  quiz: [],
  quizAnswers: {},
  quizSubmitted: false,
  quizResult: null,
  activeVideo: 0,
  timerMode: 'focus',
  timerRunning: false,
  timerSeconds: 25*60,
  timerInterval: null,
  focusCycles: 0,
  snapshots: []
};
const TIMER_DURATIONS = { focus:25*60, short:5*60, long:15*60 };

// ── Router ───────────────────────────────────────────────────────────────
function navigate(page) {
  state.page = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  render();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
});

// ── Main Render ──────────────────────────────────────────────────────────
async function render() {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div style="padding:60px;color:#4a5568;font-size:14px;">Loading…</div>';
  switch(state.page) {
    case 'dashboard':   await renderDashboard(main);   break;
    case 'videos':      await renderVideos(main);       break;
    case 'quiz':        renderQuiz(main);               break;
    case 'streak':      await renderStreak(main);       break;
    case 'notes':       await renderNotes(main);        break;
    case 'leaderboard': await renderLeaderboard(main);  break;
    case 'timer':       renderTimer(main);              break;
    case 'badges':      await renderBadges(main);       break;
  }
}

// ══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
async function renderDashboard(main) {
  const eng = await get('/api/engagement');
  state.engagement = eng;
  const snap = eng.snapshots || [];

  const gaugeR = 90, gaugeC = 283; // circumference
  const pct = Math.min(eng.score / 100, 1);
  const dashOffset = gaugeC - pct * gaugeC * 0.75;

  main.innerHTML = `
    <div class="top-bar">
      <div>
        <div class="page-tag">REAL NUMBERS · CH. 1</div>
        <h1 class="page-title">Your learning <em>pulse</em></h1>
        <p class="page-sub">A live score computed from what you actually do — watch videos, attempt quizzes, stay focused, and show up daily.</p>
      </div>
      <button class="btn-refresh" id="btn-refresh">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        Refresh Score Now
      </button>
    </div>

    <div class="dash-top">
      <!-- Engagement Gauge -->
      <div class="gauge-card">
        <div class="gauge-topbar">
          <div class="gauge-label-tag">ENGAGEMENT</div>
          <div class="at-risk">⚠ AT RISK</div>
        </div>
        <div class="gauge-wrap">
          <svg class="gauge-svg" width="220" height="160" viewBox="0 0 220 160">
            <!-- Track -->
            <path d="M 25 140 A 90 90 0 1 1 195 140" fill="none" stroke="#1e2835" stroke-width="14" stroke-linecap="round"/>
            <!-- Fill -->
            <path id="gauge-fill" d="M 25 140 A 90 90 0 1 1 195 140" fill="none"
              stroke="url(#gaugeGrad)" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${gaugeC}" stroke-dashoffset="${dashOffset}"/>
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#f87171"/>
                <stop offset="100%" stop-color="#f5a623"/>
              </linearGradient>
            </defs>
            <text x="110" y="130" text-anchor="middle" fill="white" font-size="42" font-weight="900" font-family="DM Sans,sans-serif">${eng.score}</text>
            <text x="110" y="152" text-anchor="middle" fill="#4a5568" font-size="11" font-weight="600" font-family="DM Sans,sans-serif" letter-spacing="2">ENGAGEMENT</text>
          </svg>
        </div>
        <div class="gauge-idle">
          <div class="idle-dot"></div>
          Idle for 0s · refresh after 15s+ for silence bonus
        </div>
      </div>

      <!-- Video Activity -->
      <div class="metric-card">
        <div class="metric-top">
          <div class="metric-name">
            <svg width="16" height="16" fill="none" stroke="#4fffb0" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polygon points="10,8 16,12 10,16" fill="#4fffb0" stroke="none"/></svg>
            Video Activity
          </div>
          <div class="metric-val" style="color:#4fffb0">${(eng.videoActivity ?? eng.videoMinutes ?? 0).toFixed(1)}<small style="font-size:12px">m</small></div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min((eng.videoActivity ?? eng.videoMinutes ?? 0)/10*100,100)}%;background:#4fffb0"></div></div>
        <div class="metric-sub">Minutes watched · max 10m for full points</div>
      </div>

      <!-- Quiz Performance -->
      <div class="metric-card">
        <div class="metric-top">
          <div class="metric-name">
            <svg width="16" height="16" fill="none" stroke="#a78bfa" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="#a78bfa"/></svg>
            Quiz Performance
          </div>
          <div class="metric-val" style="color:#a78bfa">${(eng.quizPerformance ?? 0)}%</div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${eng.quizPerformance ?? 0}%;background:#a78bfa"></div></div>
        <div class="metric-sub">Avg of last 5 attempts</div>
      </div>
    </div>

    <div class="dash-top" style="margin-bottom:14px">
      <!-- Focus Silence -->
      <div class="metric-card">
        <div class="metric-top">
          <div class="metric-name">
            <svg width="16" height="16" fill="none" stroke="#f5a623" stroke-width="1.8" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Focus (Silence)
          </div>
          <div class="metric-val" style="color:#f5a623">${(eng.focusSilence ?? 0)}%</div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${eng.focusSilence ?? 0}%;background:linear-gradient(90deg,#f5a623,#f87171)"></div></div>
        <div class="metric-sub">Drops to 0 after 30s idle</div>
      </div>

      <!-- Streak Bonus -->
      <div class="metric-card">
        <div class="metric-top">
          <div class="metric-name">
            <svg width="16" height="16" fill="none" stroke="#f472b6" stroke-width="1.8" viewBox="0 0 24 24"><path d="M12 2c0 6-6 8-6 13a6 6 0 0 0 12 0c0-5-6-7-6-13z"/></svg>
            Streak Bonus
          </div>
          <div class="metric-val" style="color:#f472b6">${(eng.streakBonus ?? 0)}%</div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${eng.streakBonus ?? 0}%;background:#f472b6"></div></div>
        <div class="metric-sub">Consecutive active days</div>
      </div>

      <!-- Placeholder -->
      <div></div>
    </div>

    <!-- Trajectory + Goal -->
    <div class="dash-mid">
      <div class="traj-card">
        <div class="traj-header">
          <div>
            <div class="traj-label">Engagement history</div>
            <div class="traj-title">Your trajectory</div>
          </div>
          <div class="snapshots-badge">${snap.length} SNAPSHOTS</div>
        </div>
        ${snap.length === 0
          ? `<div class="traj-empty">No snapshots yet. Hit "Refresh Score Now" to plot your first point.</div>`
          : `<div class="traj-chart"><canvas id="traj-canvas" height="180"></canvas></div>`
        }
      </div>

      <div class="goal-card">
        <div class="goal-top">
          <svg width="15" height="15" fill="none" stroke="#a78bfa" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          Today's goal
        </div>
        <div class="goal-val">${(eng.videoActivity ?? eng.videoMinutes ?? 0).toFixed(1)}<sup>m</sup></div>
        <div class="goal-sub">of 10m watching target</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min((eng.videoActivity ?? eng.videoMinutes ?? 0)/10*100,100)}%;background:linear-gradient(90deg,#4fffb0,#60a5fa)"></div></div>
        <button class="goal-btn" onclick="navigate('videos')">Open Video Lessons →</button>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="dash-bot">
      <div class="qa-card" onclick="navigate('quiz')">
        <div class="qa-icon" style="color:#4fffb0">✓</div>
        <div class="qa-label">Take a Quiz</div>
      </div>
      <div class="qa-card" onclick="navigate('streak')">
        <div class="qa-icon">🔥</div>
        <div class="qa-label">Current Streak</div>
        <div class="qa-value">1 days</div>
      </div>
      <div class="qa-card" onclick="navigate('leaderboard')">
        <div class="qa-icon" style="color:#a78bfa">🏆</div>
        <div class="qa-label">Leaderboard</div>
      </div>
      <div class="qa-card" onclick="navigate('timer')">
        <div class="qa-icon" style="color:#f472b6">✦</div>
        <div class="qa-label">Focus Timer</div>
      </div>
    </div>
  `;

  // Refresh button
  document.getElementById('btn-refresh').addEventListener('click', async function() {
    this.classList.add('spinning');
    const data = await post('/api/engagement/refresh', {});
    state.engagement = data;
    state.snapshots = data.snapshots;
    this.classList.remove('spinning');
    await renderDashboard(main);
  });

  // Draw trajectory chart if snapshots exist
  if (snap.length > 0) {
    drawTrajectory(snap);
  }
}

function drawTrajectory(snaps) {
  const canvas = document.getElementById('traj-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.offsetWidth;
  canvas.height = 180;
  const W = canvas.width, H = canvas.height;
  const pad = 20;
  const scores = snaps.map(s => s.score);
  const minS = Math.min(...scores) - 5;
  const maxS = Math.max(...scores) + 5;

  ctx.clearRect(0, 0, W, H);
  const pts = scores.map((s, i) => ({
    x: pad + (i / (scores.length - 1 || 1)) * (W - pad*2),
    y: H - pad - ((s - minS) / (maxS - minS || 1)) * (H - pad*2)
  }));

  // Line
  const grad = ctx.createLinearGradient(0,0,W,0);
  grad.addColorStop(0,'#f87171'); grad.addColorStop(1,'#4fffb0');
  ctx.strokeStyle = grad; ctx.lineWidth = 2.5;
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // Dots
  pts.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
    ctx.fillStyle = '#4fffb0'; ctx.fill();
  });
}

// ══════════════════════════════════════════════════════════════════════════
// VIDEO LESSONS
// ══════════════════════════════════════════════════════════════════════════
async function renderVideos(main) {
  const videos = await get('/api/videos');
  state.videos = videos;
  const notes = await get('/api/notes');
  state.notes = notes.notes; state.bookmarks = notes.bookmarks;
  const active = videos[state.activeVideo] || videos[0];

  main.innerHTML = `
    <div class="page-tag">VIDEO LESSONS</div>
    <h1 class="page-title">Real Numbers <em>lectures</em></h1>
    <p class="page-sub">Euclid's Division Lemma, Fundamental Theorem of Arithmetic, irrationality, decimal expansions.</p>

    <div class="chapter-tabs" style="margin-bottom:28px">
      <div class="chapter-tab active">REAL NUMBERS</div>
      <div class="chapter-tab">POLYNOMIALS</div>
      <div class="chapter-tab">INTRODUCTION TO TRIGONOMETRY</div>
    </div>

    <div class="video-layout">
      <div>
        <div class="video-embed-wrap">
          <iframe id="yt-frame"
            src="https://www.youtube.com/embed/${active.ytId}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
        <div class="video-meta">
          <div>
            <div class="video-ch">${active.channel}</div>
            <div class="video-ti">${active.title}</div>
          </div>
          <div class="video-btns">
            <button class="btn-sm" id="btn-bookmark">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              BOOKMARK
            </button>
            <a href="https://www.youtube.com/watch?v=${active.ytId}" target="_blank" class="btn-sm">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              YOUTUBE
            </a>
          </div>
        </div>

        <!-- Add Note -->
        <div class="note-add-video" style="margin-top:20px">
          <label>
            <svg width="13" height="13" fill="none" stroke="#a78bfa" stroke-width="1.8" viewBox="0 0 24 24"><path d="M12 20h-7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="m15 19 2 2 4-4"/></svg>
            Add a note for this video
          </label>
          <div class="note-row">
            <textarea id="note-input" placeholder="Write your insight…"></textarea>
            <button class="btn-sm" id="btn-add-note" style="align-self:flex-end;padding:10px 14px">ADD</button>
          </div>
        </div>
      </div>

      <!-- Playlist -->
      <div>
        <div class="playlist-header">Playlist · ${videos.length} videos</div>
        ${videos.map((v,i) => `
          <div class="playlist-item ${i===state.activeVideo?'active':''}" data-idx="${i}">
            <div class="play-btn">
              <svg width="14" height="14" fill="${i===state.activeVideo?'#000':'currentColor'}" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
            <div style="flex:1;min-width:0">
              <div class="pl-ch">${v.channel}</div>
              <div class="pl-ti">${v.title}</div>
            </div>
            <div class="pl-arrow">›</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Playlist click
  main.querySelectorAll('.playlist-item').forEach(el => {
    el.addEventListener('click', () => {
      state.activeVideo = parseInt(el.dataset.idx);
      renderVideos(main);
    });
  });

  // Bookmark
  document.getElementById('btn-bookmark').addEventListener('click', async () => {
    await post('/api/bookmarks', { channel: active.channel, title: active.title, ytId: active.ytId });
    alert('Bookmarked!');
  });

  // Add note
  document.getElementById('btn-add-note').addEventListener('click', async () => {
    const txt = document.getElementById('note-input').value.trim();
    if (!txt) return;
    await post('/api/notes', { text: txt });
    document.getElementById('note-input').value = '';
    alert('Note saved!');
  });
}

// ══════════════════════════════════════════════════════════════════════════
// QUIZ
// ══════════════════════════════════════════════════════════════════════════
async function renderQuiz(main) {
  if (!state.quiz.length) state.quiz = await get('/api/quiz');

  if (state.quizResult) {
    const r = state.quizResult;
    const emoji = r.score >= 90 ? '🎉' : r.score >= 60 ? '👍' : '📚';
    main.innerHTML = `
      <div class="page-tag">QUICK TEST</div>
      <h1 class="page-title">Real Numbers <em>quiz</em></h1>
      <div class="quiz-result-wrap">
        <div class="quiz-result">
          <div class="result-emoji">${emoji}</div>
          <div class="result-score">${r.score}%</div>
          <div class="result-label">Your Score</div>
          <div class="result-detail">${r.correct} of ${r.total} correct</div>
          <button class="btn-submit" onclick="state.quizAnswers={};state.quizResult=null;state.quizSubmitted=false;navigate('quiz')">
            Try Again
          </button>
        </div>
      </div>`;
    return;
  }

  const letters = ['A','B','C','D'];
  main.innerHTML = `
    <div class="page-tag">QUICK TEST</div>
    <h1 class="page-title">Real Numbers <em>quiz</em></h1>
    <p class="page-sub">Instant feedback · tracks your performance</p>
    <div class="chapter-tabs">
      <div class="chapter-tab active">REAL NUMBERS</div>
      <div class="chapter-tab">POLYNOMIALS</div>
      <div class="chapter-tab">INTRODUCTION TO TRIGONOMETRY</div>
    </div>
    <div id="quiz-questions">
      ${state.quiz.map((q,i) => `
        <div class="quiz-question">
          <div class="q-num">QUESTION ${i+1}</div>
          <div class="q-text">${q.q}</div>
          <div class="options-grid">
            ${q.opts.map((opt,oi) => {
              let cls = '';
              if (state.quizSubmitted) {
                if (oi === q.ans) cls = 'correct';
                else if (state.quizAnswers[i] === oi) cls = 'wrong';
              } else if (state.quizAnswers[i] === oi) cls = 'selected';
              return `<button class="opt-btn ${cls}" data-qi="${i}" data-oi="${oi}" ${state.quizSubmitted?'disabled':''}>
                <div class="opt-letter">${letters[oi]}</div>
                ${opt}
              </button>`;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="sticky-submit">
      <button class="btn-submit" id="btn-quiz-submit">Submit Quiz</button>
    </div>
  `;

  // Option click
  main.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.quizSubmitted) return;
      const qi = parseInt(btn.dataset.qi), oi = parseInt(btn.dataset.oi);
      state.quizAnswers[qi] = oi;
      // update UI only for this question
      main.querySelectorAll(`.opt-btn[data-qi="${qi}"]`).forEach(b => {
        b.classList.toggle('selected', parseInt(b.dataset.oi) === oi);
      });
    });
  });

  // Submit
  document.getElementById('btn-quiz-submit').addEventListener('click', async () => {
    const answers = state.quiz.map((_,i) => state.quizAnswers[i] ?? -1);
    const result = await post('/api/quiz/submit', { answers });
    state.quizResult = result;
    state.quizSubmitted = true;
    renderQuiz(main);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// STREAK
// ══════════════════════════════════════════════════════════════════════════
async function renderStreak(main) {
  const streak = await get('/api/streak');

  // Build 6-week heatmap (42 cells)
  const today = new Date();
  const cells = [];
  for (let i = 41; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    cells.push({ day: d.getDate(), active: streak.activeDates.includes(ds) });
  }

  main.innerHTML = `
    <div class="page-tag">DAILY HABIT</div>
    <h1 class="page-title">Keep the <span class="fire">fire</span> going</h1>
    <p class="page-sub">Show up daily. Tiny consistent effort compounds.</p>

    <div class="streak-grid">
      <div class="streak-card">
        <div class="streak-icon">🔥 Current streak</div>
        <div class="streak-val" style="color:#f5a623">${streak.current} <span>days</span></div>
      </div>
      <div class="streak-card">
        <div class="streak-icon">🏆 Longest streak</div>
        <div class="streak-val" style="color:#a78bfa">${streak.longest} <span>days</span></div>
      </div>
      <div class="streak-card">
        <div class="streak-icon">📅 Total active days</div>
        <div class="streak-val" style="color:#4fffb0">${streak.totalActiveDays} <span>days</span></div>
      </div>
    </div>

    <div class="heatmap-card">
      <div class="heatmap-top">
        <div>
          <div class="heatmap-label">Last 6 weeks</div>
          <div class="heatmap-title">Activity heatmap</div>
        </div>
        <div class="heat-legend">
          <span class="heat-dot inactive"></span> Inactive
          <span class="heat-dot active"></span> Active
        </div>
      </div>
      <div class="heatmap-grid">
        ${cells.map(c => `<div class="heat-cell ${c.active?'active':''}">${c.day}</div>`).join('')}
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
// NOTES
// ══════════════════════════════════════════════════════════════════════════
async function renderNotes(main) {
  const data = await get('/api/notes');
  state.notes = data.notes; state.bookmarks = data.bookmarks;

  main.innerHTML = `
    <div class="page-tag">YOUR LIBRARY</div>
    <h1 class="page-title">Notes & <em>bookmarks</em></h1>
    <p class="page-sub">Everything you've saved while learning.</p>

    <div class="notes-layout">
      <div class="notes-section">
        <h3>
          <svg width="14" height="14" fill="none" stroke="#a78bfa" stroke-width="1.8" viewBox="0 0 24 24"><path d="M12 20h-7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="m15 19 2 2 4-4"/></svg>
          Notes (${state.notes.length})
        </h3>
        ${state.notes.length === 0
          ? `<div class="empty-state">No notes yet. Open a video lesson and jot down your first insight.</div>`
          : state.notes.map(n => `
              <div class="note-item">
                <div class="note-txt">${n.text}</div>
                <button class="note-del" data-id="${n.id}">×</button>
              </div>`).join('')
        }
      </div>

      <div class="notes-section">
        <h3>
          <svg width="14" height="14" fill="none" stroke="#4fffb0" stroke-width="1.8" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20l-7-3-7 3V2"/></svg>
          Bookmarks (${state.bookmarks.length})
        </h3>
        ${state.bookmarks.length === 0
          ? `<div class="empty-state">No bookmarks yet.</div>`
          : state.bookmarks.map(b => `
              <div class="bm-item">
                <div>
                  <div class="bm-ch">${b.channel}</div>
                  <div class="bm-ti">${b.title}</div>
                </div>
                <button class="bm-del" data-id="${b.id}">×</button>
              </div>`).join('')
        }
      </div>
    </div>
  `;

  main.querySelectorAll('.note-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      await del('/api/notes/'+btn.dataset.id);
      renderNotes(main);
    });
  });
  main.querySelectorAll('.bm-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      await del('/api/bookmarks/'+btn.dataset.id);
      renderNotes(main);
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════════════════════════════════════════
async function renderLeaderboard(main) {
  const lb = await get('/api/leaderboard');
  const sorted = [...lb].sort((a,b) => b.score - a.score);
  const top3 = sorted.slice(0,3);
  const scoreColors = ['#f5a623','#8b95a2','#f5a623'];

  main.innerHTML = `
    <div class="page-tag">CLASS RANKINGS</div>
    <h1 class="page-title">Where you <span class="stand">stand</span></h1>
    <p class="page-sub">Based on engagement scores across ${lb.length} classmates.</p>

    <div class="podium-grid">
      ${top3.map((p,i) => `
        <div class="podium-card ${i===0?'top1':''}">
          <div class="rank-pill">#${i+1}${i===0?' TOP':''}</div>
          ${i===0?'<div class="crown">👑</div>':''}
          <div class="podium-name">${p.name}</div>
          <div class="podium-score" style="color:${scoreColors[i]}">${p.score}</div>
          <div class="podium-eng">ENGAGEMENT</div>
        </div>
      `).join('')}
    </div>

    <div class="standings-card">
      <div class="standings-hd">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M6 20v-4m6 4V10m6 10v-7"/></svg>
        FULL STANDINGS
      </div>
      ${sorted.map((p,i) => `
        <div class="standing-row ${p.isCurrentUser?'me':''}">
          <div class="s-rank">#${i+1}</div>
          <div class="s-avatar">${p.initials}</div>
          <div class="s-name">${p.name}${p.isCurrentUser?' (You)':''}</div>
          <div class="s-score" style="color:${i<3?'#f5a623':'white'}">${p.score}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
// FOCUS TIMER
// ══════════════════════════════════════════════════════════════════════════
function renderTimer(main) {
  const MODES = { focus:'FOCUS', short:'SHORT BREAK', long:'LONG BREAK' };
  const totalSec = TIMER_DURATIONS[state.timerMode];
  const sec = state.timerSeconds;
  const min = String(Math.floor(sec/60)).padStart(2,'0');
  const s   = String(sec%60).padStart(2,'0');
  const radius = 120, circ = 2*Math.PI*radius;
  const progress = sec / totalSec;
  const offset = circ * (1 - progress);

  main.innerHTML = `
    <div class="page-tag">POMODORO</div>
    <h1 class="page-title">Focus <em>timer</em></h1>
    <p class="page-sub">25-minute focus blocks with short breaks. Classic Pomodoro.</p>

    <div class="timer-tabs">
      ${Object.entries(MODES).map(([k,v]) => `
        <button class="timer-tab ${state.timerMode===k?'active':''}" data-mode="${k}">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 5V3"/></svg>
          ${v}
        </button>
      `).join('')}
    </div>

    <div class="timer-wrap">
      <div class="timer-circle-wrap">
        <svg class="timer-svg" width="300" height="300" viewBox="0 0 300 300">
          <circle class="timer-circle-bg" cx="150" cy="150" r="${radius}"/>
          <circle class="timer-circle-prog" cx="150" cy="150" r="${radius}"
            stroke-dasharray="${circ.toFixed(1)}"
            stroke-dashoffset="${offset.toFixed(1)}"/>
        </svg>
        <div class="timer-center">
          <div class="timer-time">${min}:${s}</div>
          <div class="timer-dots">
            <div class="timer-dot ${state.timerRunning?'on':''}"></div>
            <div class="timer-dot"></div>
          </div>
        </div>
      </div>

      <div class="timer-btns">
        <button class="btn-start" id="btn-timer-start">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${state.timerRunning?'none':'currentColor'}" stroke="currentColor" stroke-width="2">
            ${state.timerRunning
              ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
              : '<polygon points="5,3 19,12 5,21"/>'}
          </svg>
          ${state.timerRunning ? 'Pause' : 'Start'}
        </button>
        <button class="btn-reset" id="btn-timer-reset">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Reset
        </button>
      </div>
      <div class="timer-cycles">Completed focus cycles today: <strong>${state.focusCycles}</strong></div>
    </div>
  `;

  // Mode tabs
  main.querySelectorAll('.timer-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; state.timerRunning = false; }
      state.timerMode = btn.dataset.mode;
      state.timerSeconds = TIMER_DURATIONS[state.timerMode];
      renderTimer(main);
    });
  });

  // Start / Pause
  document.getElementById('btn-timer-start').addEventListener('click', () => {
    if (state.timerRunning) {
      clearInterval(state.timerInterval); state.timerInterval = null; state.timerRunning = false;
    } else {
      state.timerRunning = true;
      state.timerInterval = setInterval(async () => {
        state.timerSeconds--;
        if (state.timerSeconds <= 0) {
          clearInterval(state.timerInterval); state.timerInterval = null; state.timerRunning = false;
          if (state.timerMode === 'focus') {
            const res = await post('/api/focus-cycles', {});
            state.focusCycles = res.cycles;
          }
          state.timerSeconds = TIMER_DURATIONS[state.timerMode];
        }
        renderTimer(main);
      }, 1000);
    }
    renderTimer(main);
  });

  // Reset
  document.getElementById('btn-timer-reset').addEventListener('click', () => {
    clearInterval(state.timerInterval); state.timerInterval = null; state.timerRunning = false;
    state.timerSeconds = TIMER_DURATIONS[state.timerMode];
    renderTimer(main);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// BADGES
// ══════════════════════════════════════════════════════════════════════════
async function renderBadges(main) {
  const badges = await get('/api/badges');
  const unlocked = badges.filter(b => b.unlocked).length;

  main.innerHTML = `
    <div class="page-tag">ACHIEVEMENTS</div>
    <h1 class="page-title">Your <em>trophy case</em></h1>
    <p class="badges-count">${unlocked} of ${badges.length} unlocked</p>

    <div class="badges-grid">
      ${badges.map(b => `
        <div class="badge-card ${b.unlocked?'unlocked':''}">
          <div class="badge-icon-wrap">${b.unlocked ? b.icon : '🔒'}</div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-desc">${b.desc}</div>
          ${b.unlocked
            ? '<div class="badge-tag-unlocked">UNLOCKED</div>'
            : '<div class="badge-tag-locked">LOCKED</div>'}
        </div>
      `).join('')}
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
// ENGAGEMENT TRACKING ENGINE
// ══════════════════════════════════════════════════════════════════════════

const tracker = {
  videoInterval:  null,
  activeInterval: null,
  idleTimeout:    null,
  idlePenaltyInt: null,
  isIdle:         false,
  idleSeconds:    0,
};

// ── Live Score HUD ────────────────────────────────────────────────────────
function createHUD() {
  if (document.getElementById('score-hud')) return;
  const hud = document.createElement('div');
  hud.id = 'score-hud';
  hud.innerHTML = `
    <div id="hud-label" style="font-size:9px;letter-spacing:2px;color:#4a5568;font-weight:700;margin-bottom:2px">ENGAGEMENT</div>
    <div id="hud-score" style="font-size:28px;font-weight:900;color:white;line-height:1">0</div>
    <div id="hud-idle" style="font-size:10px;margin-top:4px;color:#4fffb0">● active</div>
  `;
  hud.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:#0d1117;border:1.5px solid #1e2835;border-radius:16px;
    padding:14px 20px;text-align:center;
    box-shadow:0 8px 32px rgba(0,0,0,.6);
    font-family:'DM Sans',sans-serif;transition:border-color .4s;
  `;
  document.body.appendChild(hud);
}

async function updateHUD() {
  try {
    const eng = await get('/api/engagement');
    state.engagement = eng;
    const scoreEl = document.getElementById('hud-score');
    const idleEl  = document.getElementById('hud-idle');
    const hud     = document.getElementById('score-hud');
    if (scoreEl) scoreEl.textContent = eng.score;
    if (idleEl && hud) {
      if (tracker.isIdle) {
        idleEl.textContent  = `⚠ idle ${tracker.idleSeconds}s`;
        idleEl.style.color  = '#f87171';
        hud.style.borderColor = '#f87171';
      } else {
        idleEl.textContent  = '● active';
        idleEl.style.color  = '#4fffb0';
        hud.style.borderColor = '#1e2835';
      }
    }
    // Live-patch dashboard gauge if visible
    const gaugeText = document.querySelector('.gauge-svg text');
    if (gaugeText) gaugeText.textContent = eng.score;
    const fill = document.getElementById('gauge-fill');
    if (fill) {
      const gaugeC = 283;
      const pct = Math.min(eng.score / 100, 1);
      fill.setAttribute('stroke-dashoffset', gaugeC - pct * gaugeC * 0.75);
    }
    // Live-patch metric cards
    const cards = document.querySelectorAll('.metric-val');
    if (cards.length >= 4) {
      cards[0].textContent = eng.videoActivity  ?? eng.videoMinutes ?? 0;
      cards[1].textContent = (eng.quizPerformance ?? 0) + '%';
      cards[2].textContent = (eng.focusSilence   ?? 0) + '%';
      cards[3].textContent = (eng.streakBonus    ?? 0) + '%';
    }
  } catch(e) {}
}

// ── Video Tracking ────────────────────────────────────────────────────────
function startVideoTracking() {
  if (tracker.videoInterval) return;
  tracker.videoInterval = setInterval(async () => {
    try {
      const r = await post('/api/engagement/video-ping', { seconds: 5 });
      const scoreEl = document.getElementById('hud-score');
      if (scoreEl) scoreEl.textContent = r.score;
    } catch(e) {}
  }, 5000);
}

function stopVideoTracking() {
  if (tracker.videoInterval) { clearInterval(tracker.videoInterval); tracker.videoInterval = null; }
}

// ── Idle / Active Detection ───────────────────────────────────────────────
function resetIdleTimer() {
  tracker.idleSeconds = 0;
  if (tracker.isIdle) {
    tracker.isIdle = false;
    if (tracker.idlePenaltyInt) { clearInterval(tracker.idlePenaltyInt); tracker.idlePenaltyInt = null; }
    post('/api/engagement/idle-clear', {}).catch(() => {});
    updateHUD();
  }
  if (!tracker.activeInterval) {
    tracker.activeInterval = setInterval(async () => {
      if (!tracker.isIdle) {
        try { await post('/api/engagement/active-ping', {}); } catch(e) {}
      }
    }, 5000);
  }
  clearTimeout(tracker.idleTimeout);
  tracker.idleTimeout = setTimeout(goIdle, 30000);
}

function goIdle() {
  tracker.isIdle = true;
  if (tracker.activeInterval) { clearInterval(tracker.activeInterval); tracker.activeInterval = null; }
  tracker.idleSeconds = 30;
  post('/api/engagement/idle-penalty', { seconds: 30 }).catch(() => {});
  updateHUD();
  tracker.idlePenaltyInt = setInterval(async () => {
    tracker.idleSeconds += 30;
    try { await post('/api/engagement/idle-penalty', { seconds: 30 }); } catch(e) {}
    updateHUD();
  }, 30000);
}

['mousemove','mousedown','keydown','scroll','touchstart'].forEach(evt => {
  document.addEventListener(evt, resetIdleTimer, { passive: true });
});

// ── Video page hooks ──────────────────────────────────────────────────────
const _origRenderVideos = renderVideos;
renderVideos = async function(main) {
  await _origRenderVideos(main);
  startVideoTracking(); // track whenever user is on video page
};

const _origNavigate = navigate;
navigate = function(page) {
  if (page !== 'videos') stopVideoTracking();
  _origNavigate(page);
};

// ── Bootstrap ─────────────────────────────────────────────────────────────
createHUD();
resetIdleTimer();
setInterval(updateHUD, 8000);
updateHUD();

// ── Init ─────────────────────────────────────────────────────────────────
render();