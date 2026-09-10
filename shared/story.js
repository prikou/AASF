/* ============================================================
   AASF Email Defense — story runtime (V8 "Paper Stage")
   Rendering rebuilt; scene data, narration, TTS, autoplay,
   keyboard navigation and incident timing are unchanged.
   ============================================================ */

const $ = id => document.getElementById(id);
const STORE = { auto: 'aasf_email_auto', nar: 'aasf_email_nar' };
let audio = null, timer = null, clockTimer = null, eventTimers = [], token = 0;

/* ---------- icons ---------- */
const ICO = {
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 7v6"/><path d="M12 17h.01"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13"/><path d="M12 5l7 7-7 7"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 4.3l-1.7 1.7"/><path d="M14 11a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 19.7l1.7-1.7"/></svg>`,
  broadcast: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5.5 6.5a9 9 0 0 0 0 11"/><path d="M18.5 6.5a9 9 0 0 1 0 11"/><path d="M8.6 9.6a4.5 4.5 0 0 0 0 4.8"/><path d="M15.4 9.6a4.5 4.5 0 0 1 0 4.8"/><circle cx="12" cy="12" r="1.6"/></svg>`
};

/* ---------- runtime state per act ---------- */
const RUNTIME = {
  '01-red-attack': {
    objective: 'Compromise employee trust with a supplier-mimic lure',
    handoff: 'RED → Mail Gateway', receipt: 'Phish sent',
    counters: [['Threats', 1], ['Exposed', 1], ['Quarantined', 0], ['Controls', 0]],
    hb: [['Mail Gateway', 'Observing'], ['Employee Mailbox', 'At risk'], ['Control Library', 'Healthy']],
    events: [
      'red.target_selected employee.xyc@northstar.bank',
      'red.vendor_mimic_generated Acme Components Finance',
      'red.lure_generated urgency=high',
      'red.phish_sent message=red-4472'
    ]
  },
  '02-blue-remediate': {
    objective: 'Phishing lure delivered; BLUE must stop user impact',
    handoff: 'Mail telemetry → BLUE', receipt: 'Quarantine confirmed',
    counters: [['Threats', 0], ['Exposed', 0], ['Quarantined', 1], ['Controls', 0]],
    hb: [['Mail Gateway', 'Protected'], ['Employee Mailbox', 'Protected'], ['Control Library', 'Observing']],
    events: [
      'blue.mail_received red-4472',
      'blue.sender_domain_drift detected',
      'blue.destination_unapproved acme-review-portal.co',
      'blue.verdict malicious_phishing',
      'blue.quarantine_executed red-4472',
      'blue.destination_blocked',
      'blue.user_warning_delivered',
      'blue.case_created SOC-1442'
    ]
  },
  '03-green-remediation': {
    objective: 'Prevent the same phishing technique from succeeding again',
    handoff: 'BLUE → GREEN · Evidence B-1442', receipt: 'Remediation published',
    counters: [['Threats', 0], ['Exposed', 0], ['Quarantined', 1], ['Controls', 1]],
    hb: [['Mail Gateway', 'Hardened'], ['Employee Mailbox', 'Protected'], ['Control Library', 'Active']],
    events: [
      'green.evidence_ingested B-1442',
      'green.remediation_derived supplier-mimic-phish',
      'green.variants_replayed 12',
      'green.false_positive_check passed',
      'green.remediation_validated rollback=true',
      'green.mail_policy_published G-090'
    ]
  }
};

const ACTS = [
  ['01', 'Red attack', '01-red-attack'],
  ['02', 'Blue defend', '02-blue-remediate'],
  ['03', 'Green remediate', '03-green-remediation']
];

const HB_TONE = { 'At risk': 'hot', 'Observing': 'warn', 'Healthy': 'ok', 'Protected': 'ok', 'Hardened': 'ok', 'Active': 'ok' };

/* ---------- motion helpers ----------
   One clock drives the whole scene, so beats never drift apart. */
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let beats = [];
function cue(ms, fn) { beats.push(setTimeout(fn, REDUCED ? Math.min(ms, 60) : ms)); }
function clearBeats() { beats.forEach(clearTimeout); beats = []; }

/* Split a heading into lines and let each rise out of its own clipped box.
   Inline markup (the coloured agent word) is preserved. */
function splitLines(el) {
  if (!el || el.dataset.split) return;
  const frag = document.createDocumentFragment();
  (function walk(node, cls) {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w' + (cls ? ' ' + cls : '');
          w.textContent = t;
          frag.appendChild(w);
        });
      } else if (n.nodeType === 1) {
        walk(n, n.className);
      }
    });
  })(el, '');
  el.innerHTML = '';
  el.appendChild(frag);

  // group words by the line they landed on
  const words = [...el.querySelectorAll('.w')];
  const lines = [];
  let top = null, cur = null;
  words.forEach(w => {
    if (top === null || Math.abs(w.offsetTop - top) > 3) { top = w.offsetTop; cur = []; lines.push(cur); }
    cur.push(w);
  });

  el.innerHTML = '';
  lines.forEach(line => {
    const mask = document.createElement('span'); mask.className = 'line-mask';
    const inner = document.createElement('span'); inner.className = 'line-inner';
    line.forEach((w, i) => {
      if (i) inner.appendChild(document.createTextNode(' '));
      inner.appendChild(w);
    });
    mask.appendChild(inner);
    el.appendChild(mask);
  });
  el.dataset.split = '1';
}
function revealLines(el) { if (el) requestAnimationFrame(() => el.classList.add('revealed')); }

/* ---------- data + preferences ---------- */
async function data() { return fetch('../data/scenes.json').then(r => r.json()); }
function get(k, d) { const v = localStorage.getItem(k); return v === null ? d : v === 'true'; }
function set(k, v) { localStorage.setItem(k, String(v)); }

/* ---------- narration sources ----------
   Tried in order, so the build works on a static host (GitHub Pages) as well as
   under server.py:
     1. a pre-rendered mp3 committed to the repo   — any static host
     2. the live TTS endpoint                      — server.py with an API key
     3. the browser's own speech voice             — always available
   Paths are relative, so hosting under /<repo>/ works without changes. */
async function narrationBlob(id) {
  for (const url of [`../shared/narration/${id}.mp3`, `../api/narration/${id}/audio`]) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const b = await r.blob();
      if (b.size > 1024 && /audio|octet-stream/.test(b.type || 'audio')) return b;
    } catch (e) { /* try the next source */ }
  }
  return null;
}

/* ---------- narration (unchanged behaviour) ---------- */
function stop() {
  token++;
  if (timer) clearTimeout(timer);
  if (audio) { audio.pause(); audio = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
function nextLater(href, ms) {
  if (!get(STORE.auto, false)) return;
  clearTimeout(timer);
  timer = setTimeout(() => location.href = href, ms);
}
function speakBrowser(text, done) {
  if (!('speechSynthesis' in window)) { done(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.rate = .96; u.pitch = .98;
  const vs = speechSynthesis.getVoices();
  u.voice = vs.find(v => /natural|neural/i.test(v.name) && /^en/i.test(v.lang))
    || vs.find(v => /^en/i.test(v.lang)) || null;
  u.onend = done; u.onerror = done;
  speechSynthesis.speak(u);
}
async function narrate(s, next) {
  stop();
  if (!get(STORE.nar, true)) { nextLater(next, s.duration_ms || 7000); return; }
  const t = token;
  try {
    const b = await narrationBlob(s.id);
    if (!b) throw 0;
    if (t !== token) return;
    const u = URL.createObjectURL(b);
    audio = new Audio(u);
    audio.onended = () => { URL.revokeObjectURL(u); audio = null; nextLater(next, 700); };
    audio.onerror = () => { URL.revokeObjectURL(u); speakBrowser(s.narration, () => nextLater(next, 700)); };
    await audio.play();
  } catch (e) {
    speakBrowser(s.narration, () => nextLater(next, 700));
  }
}

/* ---------- chrome ---------- */
function renderActNav(idx) {
  $('actNav').innerHTML = ACTS.map((a, i) => {
    const state = i === idx ? 'current' : (i < idx ? 'done' : '');
    const mark = i < idx ? '✓' : a[0];
    return `<a class="act-step ${state}" href="${a[2]}.html"${i === idx ? ' aria-current="step"' : ''}>`
      + `<i>${mark}</i><b>${a[1]}</b></a>`;
  }).join('<span class="act-rule" aria-hidden="true"></span>');
}

function updateButtons() {
  const a = $('autoplayBtn'), n = $('narrationBtn');
  const av = get(STORE.auto, false), nv = get(STORE.nar, true);
  a.classList.toggle('on', av); n.classList.toggle('on', nv);
  a.setAttribute('aria-pressed', String(av));
  n.setAttribute('aria-pressed', String(nv));
}

function incidentId() {
  let v = sessionStorage.getItem('aasf_incident_id');
  if (!v) {
    v = 'INC-' + new Date().toISOString().replace(/[-:TZ.]/g, '').slice(2, 14);
    sessionStorage.setItem('aasf_incident_id', v);
  }
  return v;
}
function nowStamp() {
  const d = new Date();
  return d.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}
function startClock(i) {
  let sec = i * 11;
  if (clockTimer) clearInterval(clockTimer);
  const draw = () => {
    $('incidentClock').textContent =
      `T+ ${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  };
  draw();
  clockTimer = setInterval(() => { sec++; draw(); }, 1000);
}

/* ---------- telemetry deck ---------- */
function renderDeck(s) {
  const r = RUNTIME[s.id];

  $('incidentId').textContent = incidentId();
  $('attackerObjective').textContent = r.objective;
  $('handoff').textContent = r.handoff;
  $('executionReceipt').querySelector('span').textContent = r.receipt;

  $('counters').innerHTML = r.counters.map(([label, n]) =>
    `<div class="counter ${n > 0 ? 'hot' : 'zero'}"><b class="num"><span>${n}</span></b><span class="micro">${label}</span></div>`
  ).join('');
  // counters set themselves in sequence once the stage is live
  [...$('counters').children].forEach((c, i) => cue(1900 + i * 90, () => c.classList.add('set')));

  $('heartbeatList').innerHTML = r.hb.map(([name, state]) => {
    const tone = HB_TONE[state] || '';
    const rowTone = tone === 'ok' ? 'state-ok' : tone === 'hot' ? 'state-hot' : '';
    return `<div class="beat-row ${rowTone}"><span><i class="dot ${tone}"></i>${name}</span><b>${state.toUpperCase()}</b></div>`;
  }).join('');

  // live event stream — the last three stay visible so the sequence reads
  eventTimers.forEach(clearTimeout);
  eventTimers = [];
  const stack = $('liveEvent');
  r.events.forEach((e, i) => eventTimers.push(setTimeout(() => {
    const parts = e.split(' ');
    const name = parts.shift();
    const line = document.createElement('div');
    line.className = 'stream-line arrive';
    line.innerHTML = `<time>${nowStamp()}</time><b>${name}</b><span>${parts.join(' ')}</span>`;
    [...stack.children].forEach(c => c.classList.add('past'));
    stack.appendChild(line);
    while (stack.children.length > 3) stack.removeChild(stack.firstChild);
  }, 1950 + i * 760)));
}

/* ---------- act column ---------- */
function renderActColumn(s) {
  // colour the leading agent word of the title
  const t = s.title.replace(/^(RED|BLUE|GREEN)\b/, '<span class="lead">$1</span>');
  $('title').innerHTML = t;
  $('actLabel').textContent = s.act;
  $('subtitle').textContent = s.subtitle;
  $('businessTag').textContent = s.business_tag || '';
  $('business').textContent = s.business;
  $('impact').textContent = s.impact;
  $('callout').textContent = s.callout;
  $('attacker').textContent = s.attacker;
  $('focus').textContent = s.focus;
  $('focusBadge').querySelector('span').textContent = s.focus;

  const live = s.id === '01-red-attack' ? 0 : s.id === '02-blue-remediate' ? 1 : 2;
  const rows = [
    ['R', 'RED', s.red_mode, (s.red || [])[0] || ''],
    ['B', 'BLUE', s.blue_mode, (s.blue || [])[0] || ''],
    ['G', 'GREEN', s.green_mode, (s.green || [])[0] || '']
  ];
  $('posture').innerHTML = rows.map((row, i) =>
    `<div class="posture-row ${i === live ? 'live' : ''}">
       <i>${row[0]}</i>
       <div><b>${row[1]} · ${row[2]}</b><span>${row[3]}</span></div>
     </div>`
  ).join('');
}

/* ---------- agent reasoning log ---------- */
const LOGS = {
  red: ['Red agent · reasoning', [
    ['intent.parse', 'supplier-trust pretext'],
    ['corpus.match', 'vendor tone · 14 threads'],
    ['domain.register', 'acme-componets.com'],
    ['payload.compose', 'urgency=high · credential ask'],
    ['deliver.queue', 'red-4472 → gateway']
  ]],
  blue: ['Blue agent · reasoning', [
    ['ingest', 'red-4472 · 41 KB · external'],
    ['graph.lookup', 'sender unseen in 90d'],
    ['url.resolve', '3 hop redirect'],
    ['score.fuse', '4 signals · conf 0.95'],
    ['policy.select', 'quarantine + block + warn']
  ]],
  green: ['Green agent · reasoning', [
    ['evidence.load', 'B-1442 · 5 artifacts'],
    ['pattern.extract', 'supplier-mimic + payment urgency'],
    ['rule.compose', 'G-090 draft · 3 predicates'],
    ['replay.suite', '12 variants · 0 bypass'],
    ['fp.check', '8,412 benign mails · 0 blocked'],
    ['publish', 'G-090 → all business mailboxes']
  ]]
};

function logPanel(key, startAt) {
  const [heading, lines] = LOGS[key];
  return `
  <div class="log">
    <div class="log-head"><span class="pulse" aria-hidden="true"></span><span class="micro">${heading}</span></div>
    <div class="log-body">
      ${lines.map((l, i) =>
        `<div class="log-line" style="--d:${(startAt + i * .28).toFixed(2)}s"><i>&rsaquo;</i><b>${l[0]}</b><span>${l[1]}</span></div>`
      ).join('')}
    </div>
  </div>`;
}

/* ---------- act visuals ---------- */
function sceneRed() {
  return `
  <div class="scene scene-red">

    <section class="slab">
      <div class="slab-title"><h3>Attack construction</h3><span class="micro">Red agent</span></div>
      <div class="steps">
        <div class="step" style="--d:.15s"><i>01</i><div><small>Target</small><b>employee.xyc@northstar.bank</b></div><span class="mark">${ICO.check}</span></div>
        <div class="step" style="--d:.5s"><i>02</i><div><small>Trust source</small><b>Acme Components Finance</b></div><span class="mark">${ICO.check}</span></div>
        <div class="step" style="--d:.85s"><i>03</i><div><small>Pretext</small><b>Urgent supplier invoice review</b></div><span class="mark">${ICO.check}</span></div>
        <div class="step flag" style="--d:1.2s"><i>04</i><div><small>Destination</small><b>acme-review-portal.co/login</b></div><span class="mark">${ICO.alert}</span></div>
      </div>
      ${logPanel('red', 1.5)}
      <div class="intent" style="margin-top:13px">
        <span class="micro">Attack intent</span>
        <b>Create a credible human interaction opportunity</b>
        <div class="meter-bar"><i></i></div>
      </div>
    </section>

    <section class="slab lane">
      <div class="node src">
        <span class="badge">R</span>
        <small>Red agent</small>
      </div>
      <div class="track"><span class="packet">✉ Phish</span></div>
      <div class="node dst">
        <span class="badge">▣</span>
        <small>Mail gateway</small>
      </div>
      <p class="lane-note">Outbound to bank mail<br><b>red-4472</b></p>
    </section>

    <section class="slab">
      <div class="slab-title"><h3>Synthetic phishing payload</h3><span class="micro">Live</span></div>
      <div class="mail">
        <div class="mail-bar"><i></i><i></i><i></i><span>Northstar Mail</span></div>
        <div class="mail-body">
          <div class="sender">
            <span class="avatar">AC</span>
            <div><b>Acme Components Finance</b><small>ap@acme-componets.com</small></div>
            <span class="ext">External</span>
          </div>
          <h4>Action required: invoice review</h4>
          <p>Please review and confirm the attached invoice before today's supplier release window.</p>
          <span class="cta">Review invoice <em>${ICO.arrow}</em></span>
          <div class="url">${ICO.link}<span>acme-review-portal.co/login</span></div>
        </div>
      </div>
    </section>

  </div>`;
}

function sceneBlue() {
  return `
  <div class="scene scene-blue">

    <section class="slab">
      <div class="slab-title"><h3>Inbound message · red-4472</h3><span class="micro">High risk</span></div>
      <div class="scan">
        <div class="field">
          <div><span class="micro">From</span><b>ap@acme-componets.com</b></div>
          <div><span class="micro">Subject</span><b>Action required: invoice review</b></div>
          <div><span class="micro">Destination</span><b class="bad">acme-review-portal.co/login</b></div>
        </div>
        <div class="signals">
          <div class="signal" style="--d:.3s"><span>Sender domain drift</span><b>+0.34</b></div>
          <div class="signal" style="--d:.6s"><span>Destination mismatch</span><b>+0.31</b></div>
          <div class="signal" style="--d:.9s"><span>Urgency / payment context</span><b>+0.19</b></div>
          <div class="signal" style="--d:1.2s"><span>External source anomaly</span><b>+0.11</b></div>
        </div>
      </div>
      <div class="verdict">
        <div class="ring">
          <svg viewBox="0 0 62 62"><circle class="bg" cx="31" cy="31" r="28"/><circle class="fg" cx="31" cy="31" r="28"/></svg>
          <div class="ring-val"><b id="riskVal">18</b><small>Risk</small></div>
        </div>
        <div>
          <span class="micro">Blue verdict</span>
          <h4>Malicious phishing</h4>
          <p>Confidence converged from four independent signals.</p>
        </div>
      </div>
      ${logPanel('blue', 2.1)}
    </section>

    <section class="slab">
      <div class="slab-title"><h3>Autonomous defense response</h3><span class="micro">Detect · stop · alert</span></div>
      <div class="steps">
        <div class="step" style="--d:1.5s"><i>01</i><div><small>Quarantine</small><b>Move message out of mailbox</b></div><span class="mark">${ICO.check}</span></div>
        <div class="step" style="--d:1.85s"><i>02</i><div><small>Block</small><b>acme-review-portal.co</b></div><span class="mark">${ICO.check}</span></div>
        <div class="step" style="--d:2.2s"><i>03</i><div><small>Warn</small><b>Notify employee immediately</b></div><span class="mark">${ICO.check}</span></div>
        <div class="step" style="--d:2.55s"><i>04</i><div><small>Case</small><b>SOC-1442 created</b></div><span class="mark">${ICO.check}</span></div>
      </div>

      <div class="vault" style="margin-top:12px">
        <span class="vault-icon">${ICO.lock}</span>
        <div><b>red-4472</b><small>Held in quarantine</small></div>
        <span class="lock">SEALED</span>
      </div>

      <div class="toast" style="margin-top:9px">
        <span class="toast-icon">${ICO.alert}</span>
        <div><small>User alert</small><b>Suspicious email blocked. Do not interact.</b></div>
      </div>

      <div class="continuity"><span>Legitimate mail flow</span><b>AVAILABLE</b></div>
    </section>

  </div>`;
}

function sceneGreen() {
  return `
  <div class="scene scene-green">

    <section class="slab">
      <div class="slab-title"><h3>Control forge</h3><span class="micro">Evidence B-1442 · 5 artifacts</span></div>
      <div class="chips">
        <span>domain drift</span><span>destination mismatch</span><span>urgency</span>
        <span>external sender</span><span>user exposure</span>
      </div>
      <div class="synth"><i></i>Remediation synthesis<i></i></div>
      <div class="control">
        <span class="control-id">G-090</span>
        <div>
          <span class="micro">Durable mail remediation</span>
          <h4>Supplier mimic defense</h4>
          <p>Correlate supplier identity drift, destination reputation and high-pressure invoice context before delivery.</p>
        </div>
        <span class="state">VALIDATED</span>
      </div>
      <div class="replays">
        <div class="replay" style="--d:.5s"><i>01</i><b>Typo-domain variant</b><em>BLOCKED</em></div>
        <div class="replay" style="--d:.75s"><i>02</i><b>Reply-path variant</b><em>BLOCKED</em></div>
        <div class="replay" style="--d:1s"><i>03</i><b>Urgency variant</b><em>BLOCKED</em></div>
        <div class="replay" style="--d:1.25s"><i>+9</i><b>Campaign variants</b><em>BLOCKED</em></div>
      </div>
      ${logPanel('green', 1.5)}
      <div class="validation">
        <span>False-positive validation</span>
        <div class="bar"><i></i></div>
        <b>PASSED</b>
      </div>
    </section>

    <section class="slab">
      <div class="slab-title"><h3>Remediation propagation</h3><span class="micro">Enforced</span></div>
      <div class="prop">
        <svg class="prop-links" preserveAspectRatio="none" aria-hidden="true"></svg>
        <span class="wave" aria-hidden="true"></span>
        <span class="wave w2" aria-hidden="true"></span>
        <span class="wave w3" aria-hidden="true"></span>
        <div class="prop-core"><b>G</b><small>G-090</small></div>
        <span class="orbit o1" style="--d:.6s"><i></i>Finance</span>
        <span class="orbit o2" style="--d:.85s"><i></i>Procurement</span>
        <span class="orbit o3" style="--d:1.1s"><i></i>Treasury</span>
        <span class="orbit o4" style="--d:1.35s"><i></i>Operations</span>
        <span class="orbit o5" style="--d:1.6s"><i></i>Shared mail</span>
      </div>
      <div class="published">
        <span class="published-icon">${ICO.broadcast}</span>
        <div><small>Remediation library</small><b>Published &amp; enforced</b></div>
      </div>
    </section>

  </div>`;
}

function renderVisual(s) {
  const map = { email_attack: sceneRed, email_blue: sceneBlue, email_green: sceneGreen };
  $('visual').innerHTML = (map[s.layout] || sceneRed)();
}

/* The risk arc and its number resolve together — one gesture, not two. */
function animateRisk() {
  const el = $('riskVal');
  const ring = document.querySelector('.ring');
  if (!el || !ring) return;
  ring.classList.add('armed');
  if (REDUCED) { el.textContent = '95'; return; }
  let start = null;
  const from = 18, to = 95, dur = 1900;
  function step(ts) {
    if (start === null) start = ts;
    const p = Math.min(1, (ts - start) / dur);
    el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* Connectors are measured off the real layout, so they land exactly on each node. */
function drawPropLinks() {
  const prop = document.querySelector('.prop');
  const svg = prop && prop.querySelector('.prop-links');
  const core = prop && prop.querySelector('.prop-core');
  if (!svg || !core) return;
  const pb = prop.getBoundingClientRect(), cb = core.getBoundingClientRect();
  if (!pb.width) return;
  const cx = cb.left - pb.left + cb.width / 2;
  const cy = cb.top - pb.top + cb.height / 2;
  svg.setAttribute('viewBox', `0 0 ${pb.width} ${pb.height}`);
  svg.innerHTML = [...prop.querySelectorAll('.orbit')].map((o, i) => {
    const b = o.getBoundingClientRect();
    const x = b.left - pb.left + b.width / 2;
    const y = b.top - pb.top + b.height / 2;
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
    const r = cb.width / 2 + 7;                       // stop clear of the core
    const sx = cx + dx / d * r, sy = cy + dy / d * r;
    const len = Math.hypot(x - sx, y - sy);
    return `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" `
      + `style="--len:${len.toFixed(1)};--d:${(0.5 + i * 0.22).toFixed(2)}s"></line>`;
  }).join('');
}

/* ---------- the scene timeline ----------
   Every beat hangs off one clock so the curtain, the stage, the counters,
   the event stream and the scene's own set piece stay in step. */
function runScene(s, idx, offset) {
  offset = offset || 0;
  const curtain = $('chapterCurtain');

  if (curtain) {
    $('curtainNo').textContent = ACTS[idx][0];
    $('curtainAct').textContent = s.act;
    $('curtainTitle').textContent = s.title;
    $('curtainSub').textContent = s.callout || s.subtitle || '';
    curtain.classList.remove('hidden');
    splitLines($('curtainTitle'));
    cue(offset + 120, () => revealLines($('curtainTitle')));
    cue(offset + 1450, () => curtain.classList.add('fade-away'));   // wipes upward
    cue(offset + 2600, () => curtain.classList.add('hidden'));
  }

  cue(offset + 1600, () => {
    document.body.classList.add('live');
    splitLines($('title'));
    revealLines($('title'));
  });

  // counters and the event stream are scheduled inside renderDeck; the set
  // pieces below are the per-act moments worth landing on their own beat.
  if (s.id === '02-blue-remediate') cue(offset + 2400, animateRisk);
  if (s.id === '03-green-remediation') cue(offset + 2300, drawPropLinks);
}

/* ---------- narrated intro ----------
   Plays once per session on act one, then dissolves into the live stage.
   Each chapter holds until its own narration finishes, so the visuals can
   never run ahead of the voice — no hand-tuned timings to drift. */
const INTRO_COLD_OPEN_MS = 4200;

function playIntro(onDone) {
  const el = document.querySelector('.intro');
  if (!el) { onDone(); return; }

  const video = el.querySelector('video');
  const chapters = [...el.querySelectorAll('.fc')];
  const ticks = [...el.querySelectorAll('.intro-chapters i')];
  let finished = false, introAudio = null, introTimer = null;

  const finish = () => {
    if (finished) return;
    finished = true;
    if (introTimer) clearTimeout(introTimer);
    if (introAudio) { introAudio.pause(); introAudio = null; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    sessionStorage.setItem('aasf_intro_played', '1');
    el.classList.add('gone');
    setTimeout(() => el.remove(), 1200);
    onDone();
  };

  el.querySelector('.intro-skip').onclick = finish;
  const onKey = e => {
    if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); finish(); }
  };
  document.addEventListener('keydown', onKey);

  /* --- a rendered film, when one is present --- */
  if (video) {
    const ticks = el.querySelector('.intro-chapters');
    const bar = el.querySelector('.intro-progress i');
    const startBtn = el.querySelector('.intro-start');
    let handedToFilm = false, fellBack = false;

    // If the file is missing or the browser can't decode it, play the coded
    // chapters instead of dropping the briefing altogether.
    const fallBack = () => {
      if (handedToFilm || fellBack || finished) return;
      fellBack = true;
      clearTimeout(guard); clearInterval(probe);
      video.remove();
      if (startBtn) startBtn.remove();
      const prog = el.querySelector('.intro-progress');
      if (prog) prog.remove();
      runChapters();
    };

    const takeOver = () => {                       // the film is really playing
      if (handedToFilm) return;
      handedToFilm = true;
      clearTimeout(guard); clearInterval(probe);
      // Drop the whole coded-chapter layer, not just the chapters: .intro-film
      // carries an opaque paper background and would otherwise cover the video.
      const film = el.querySelector('.intro-film');
      if (film) film.remove(); else chapters.forEach(c => c.remove());
      if (ticks) ticks.remove();                   // the film has its own progress bar
    };

    video.addEventListener('playing', takeOver);
    video.addEventListener('ended', finish);
    video.addEventListener('error', fallBack);
    video.addEventListener('timeupdate', () => {
      if (bar && video.duration) bar.style.width = (video.currentTime / video.duration * 100) + '%';
    });

    // When no source is playable, play() returns a promise that never settles
    // and no error lands on the element, so read its own state instead.
    const probe = setInterval(() => {
      if (finished || handedToFilm || fellBack) { clearInterval(probe); return; }
      if (video.networkState === 3 /* NETWORK_NO_SOURCE */) fallBack();
    }, 250);
    const guard = setTimeout(() => { if (video.readyState === 0) fallBack(); }, 8000);

    // The narration is the point, so a blocked autoplay must not silently mute
    // the film — offer one click instead, which is also what unlocks the audio.
    const attempt = () => {
      const p = video.play();
      if (p && p.catch) p.catch(() => {
        if (video.error || !video.currentSrc) { fallBack(); return; }
        clearTimeout(guard);                       // waiting on a person, not a file
        if (startBtn) startBtn.hidden = false;
      });
    };
    if (startBtn) startBtn.onclick = () => { startBtn.hidden = true; attempt(); };
    attempt();
    return;
  }

  runChapters();

  /* --- narrated chapter sequence --- */
  function runChapters() {
  if (REDUCED) { setTimeout(finish, 600); return; }
  const show = i => {
    chapters.forEach(c => c.classList.toggle('on', +c.dataset.ch === i));
    ticks.forEach((t, n) => {
      t.classList.toggle('done', n < i);
      t.classList.toggle('now', n === i);
    });
  };

  // speak one chapter, then advance; falls back through browser speech to a timer
  const speak = (script, i, done) => {
    const seg = script[i - 1];
    if (!seg) { done(); return; }
    const minMs = seg.duration_ms || 12000;
    const t0 = performance.now();
    let advanced = false;

    // A chapter never advances faster than its declared reading time, even when
    // there is no voice at all (no API key and no installed speech voices).
    // Audio ending early or failing shortens nothing; it only ever waits longer.
    const next = () => {
      if (advanced) return;
      advanced = true;
      setTimeout(done, Math.max(0, minMs - (performance.now() - t0)));
    };
    // a hard backstop: never let a stalled voice hang the demo
    introTimer = setTimeout(next, minMs + 6000);

    const viaBrowser = () => speakBrowser(seg.narration, next);

    narrationBlob(seg.id)
      .then(b => {
        if (!b) throw 0;
        if (finished) return;
        const url = URL.createObjectURL(b);
        introAudio = new Audio(url);
        introAudio.onended = () => { URL.revokeObjectURL(url); next(); };
        introAudio.onerror = () => { URL.revokeObjectURL(url); viaBrowser(); };
        return introAudio.play();
      })
      .catch(viaBrowser);
  };

  fetch('../data/intro.json')
    .then(r => r.ok ? r.json() : [])
    .catch(() => [])
    .then(script => {
      show(0);
      const step = i => {
        if (finished) return;
        if (i > chapters.length - 1) { finish(); return; }
        show(i);
        if (i === 0) { introTimer = setTimeout(() => step(1), INTRO_COLD_OPEN_MS); return; }
        speak(script, i, () => {
          if (introTimer) clearTimeout(introTimer);
          setTimeout(() => step(i + 1), 550);      // a beat between chapters
        });
      };
      introTimer = setTimeout(() => step(1), INTRO_COLD_OPEN_MS);
    });
  }
}

/* ---------- boot ---------- */
(async () => {
  const ss = await data();
  const id = document.body.dataset.scene;
  const i = ss.findIndex(x => x.id === id);
  const s = ss[i];
  const prev = ss[Math.max(0, i - 1)].id + '.html';
  const isLast = i === ss.length - 1;
  // the last act loops back to act one, so a running demo never dead-ends
  const next = isLast ? ss[0].id + '.html' : ss[i + 1].id + '.html';

  document.body.className = 'scene-' + s.id;

  renderActNav(i);
  renderActColumn(s);
  renderVisual(s);
  startClock(i);
  updateButtons();

  const introEl = document.querySelector('.intro');
  const wantsIntro = i === 0 && introEl && !sessionStorage.getItem('aasf_intro_played');
  if (introEl && !wantsIntro) introEl.remove();

  // narration waits for the curtain, so the voice never talks over the intro
  const start = () => {
    renderDeck(s);
    runScene(s, i, 0);
    cue(1900, () => narrate(s, next));
  };
  if (wantsIntro) playIntro(start); else start();

  // connectors are measured off the layout, so they redraw when it changes
  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { drawPropLinks(); }, 180);
  });

  $('topPrev').href = prev;
  $('topNext').href = next;
  if (isLast) {
    $('topNext').querySelector('span').textContent = 'Restart';
    $('topNext').setAttribute('aria-label', 'Restart the exercise');
  }

  $('autoplayBtn').onclick = () => {
    set(STORE.auto, !get(STORE.auto, false));
    updateButtons();
    if (get(STORE.auto, false)) nextLater(next, 4200);
  };
  $('narrationBtn').onclick = () => {
    set(STORE.nar, !get(STORE.nar, true));
    updateButtons();
    narrate(s, next);
  };
  $('replayBtn').onclick = () => narrate(s, next);

  document.addEventListener('keydown', e => {
    if (e.target.matches('input,textarea')) return;
    if (e.key === 'ArrowRight') location.href = next;
    if (e.key === 'ArrowLeft') location.href = prev;
    const k = e.key.toLowerCase();
    if (k === 'a') $('autoplayBtn').click();
    if (k === 'n') $('narrationBtn').click();
    if (k === 'r') $('replayBtn').click();
  });
})();
