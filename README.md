# AASF — Autonomous Email Defense

A three-act, narrated walkthrough of an autonomous phishing exercise, built for
presenting to executives on a large screen.

**RED** builds and sends a supplier-impersonation phishing email. **BLUE**
detects the malicious indicators, quarantines the message, blocks the
destination and warns the employee before any click. **GREEN** turns that single
incident into a durable control published across every business mailbox.

The deck opens with a briefing film on how autonomous attackers change the shape
of phishing, then dissolves into the live exercise.

> This is a **synthetic exercise**. "Northstar Bank", its employee and the
> supplier are invented, and no real mailbox, domain or system is involved.

---

## Run it

**Static — no install.** Open `index.html`, or serve the folder with anything:

```bash
python -m http.server 8000        # then open http://127.0.0.1:8000/
```

**With the narration server** (adds OpenAI TTS for the three acts):

- Windows: double-click `START_EMAIL_DEFENSE.bat`
- Or: `python server.py`, then open <http://127.0.0.1:8773>

The root `index.html` redirects into act one either way.

### Entry pages
- `story/01-red-attack.html`
- `story/02-blue-remediate.html`
- `story/03-green-remediation.html`

## Deploying to GitHub Pages

The whole front end is static, so it runs on GitHub Pages with no backend.

```bash
git init && git add . && git commit -m "AASF email defense demo"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then **Settings → Pages → Source: Deploy from a branch → main / (root)**. The
site appears at `https://<you>.github.io/<repo>/`, and the root `index.html`
redirects straight into act one. Every path in the build is relative, so hosting
under a repository subpath needs no changes. A `.nojekyll` file is included so
Pages serves the tree verbatim.

**What you lose without `server.py`:** only the live TTS endpoint. The intro
film carries its own audio, so it is unaffected. Act narration falls back to the
browser's speech voice, which varies by machine.

**To keep the studio voice on Pages**, pre-render the narration once and commit
it:

```bash
export OPENAI_API_KEY=sk-...        # set OPENAI_API_KEY=sk-... on Windows
python tools/prerender_narration.py
git add shared/narration && git commit -m "Pre-rendered narration" && git push
```

The deck tries `shared/narration/<id>.mp3` first, then the live endpoint, then
the browser voice — so the same build works on Pages, under `server.py`, and
offline, without switching anything.

**Repository size.** 28 files, 28 MB total; the largest is `intro.mp4` at 19 MB,
well under GitHub's 100 MB per-file limit, so Git LFS is not needed. To keep the repo light
you can delete `shared/intro.mp4` and `shared/intro.webm` and let the coded
chapters play instead — the runtime falls back to them automatically.

**Note on the demo's framing.** Published to Pages the site is public. It is a
synthetic exercise against an invented bank ("Northstar") and an invented
supplier, which is worth stating on any page that faces an outside audience.

## Intro briefing

Act one opens with the rendered film (`shared/intro.mp4`, 2:09), then dissolves
into the live stage. It plays **once per browser session** — moving between acts
does not replay it. `Skip`, `Esc` or `Space` cuts to the demo immediately, and a
progress bar runs along the bottom edge.

**Autoplay.** Browsers block audible autoplay until the page has been interacted
with. Because the narration is the point, the film is never silently muted: if
autoplay is refused, a single **Start briefing** button appears, and one click
plays it with sound. On a machine where the demo has been opened before, it
usually starts on its own.

**Two encodes ship** — `intro.mp4` (H.264/AAC, 19 MB) and `intro.webm`
(VP9/Opus, 9 MB), offered as two `<source>` elements. Chrome, Edge, Firefox and
Safari all take the MP4; the WebM covers browsers built without proprietary
codecs. Both are re-encodes of the 63 MB master at visually identical quality
(RMSE < 2.1).

**Fallback.** If both files are missing or neither can be decoded, the runtime
falls back to a coded chapter sequence carrying the same argument, narrated
through the same TTS pipeline as the acts. This is detected from the video
element's own `networkState`, because a `<video>` with no playable source
returns a `play()` promise that never settles and fires no error of its own.

### The coded fallback chapters

| # | Chapter | Covers |
| --- | --- | --- |
| 0 | Cold open | AASF wordmark |
| 1 | Targeting | A synthetic profile from public and compromised context, and a different lure per recipient |
| 2 | Conversation | A thread held over days, then the same story across Teams, voice, documents, invitations, generated video |
| 3 | Agent vs agent | The lure written for the assistant, not the human: instructions embedded in content the agent is trusted to read |
| 4 | Adaptation | Rerouting around each block, and a closed loop feeding delivery, quarantine and challenge into the next attempt |
| 5 | Response | Why the defence runs as agents: RED proves, BLUE contains, GREEN hardens |
| 6 | Close | Attack. Defend. Harden. |

Narration text lives in `data/intro.json`, spoken through OpenAI TTS via
`/api/narration/<id>/audio` when `OPENAI_API_KEY` is set (cached in
`.audio-cache/`), and the browser's speech voice otherwise. Each chapter holds
until its narration finishes; `duration_ms` is a **floor**, not a timer, so the
sequence stays readable even with no API key and no installed speech voices.

To go back to the coded chapters permanently, delete the `<video>` block from
`story/01-red-attack.html`.

## Controls
| Key | Action |
| --- | --- |
| `→` / `←` | Next / previous act |
| `N` | Narration on/off |
| `A` | Auto play on/off |
| `R` | Replay narration |
| `Esc` / `Space` | Skip the intro |

Narration, auto play and the incident ID persist across acts. On the last act the
primary button becomes **Restart**, so an unattended demo loop never dead-ends.

## V8 interface rebuild — "Paper Stage"

The interface was rebuilt from the stylesheet up. Scene data, narration, TTS,
auto play, keyboard navigation and incident timing are unchanged — only the
presentation layer was replaced.

**What changed**

- **One coherent light system.** The previous build layered a light theme on top
  of a dark one with roughly two hundred `!important` overrides, which is what
  made it look washed out. `shared/styles.css` is now a single system with no
  overrides: warm paper ground, one cool ink family, tinted shadows from a single
  light source.
- **One accent at a time.** A deep navy carries the chrome; RED, BLUE and GREEN
  are state colours, and exactly one is active per act. Every accent is
  desaturated below 80% so it reads on a projector without glaring.
- **Vendored typography.** Plus Jakarta Sans and IBM Plex Mono ship in
  `shared/fonts/` (88 KB total), so the demo needs no internet. All figures use
  tabular numerals, so the incident clock and counters stop jittering.
- **Three rows instead of nine.** The old stack of nine horizontal bands
  overflowed the fold at 1600×1000. The stage is now a fixed `100dvh` grid:
  masthead, an editorial split of act column and scene canvas, and a telemetry
  deck. The chapter sidebar became inline act markers; the two side rails merged
  into the act column.
- **The scene canvas dominates.** It sits in a nested tray — outer shell, inner
  core, concentric radii — with a grid wash, ambient act-coloured light and a
  fixed film-grain overlay.
- **Agent reasoning log.** Each act shows the agent's own decision trace, which
  fills the tall column with the substance of the product rather than whitespace.
  It is hidden automatically below 820px of viewport height.
- **Accessibility and polish.** Semantic landmarks, visible focus rings,
  `aria-pressed` on the toggles, `prefers-reduced-motion` support, and a favicon.
  All motion runs on `transform` and `opacity` with a single custom easing curve.

## V8.1 — legibility and motion

- **Fluid type scale.** Every size is now a `clamp()` token keyed to viewport
  width, so text grows on a 1920 projector and compresses on a 1366 laptop
  instead of sitting at one cramped desktop size. Data text, telemetry, step
  values and counters all moved up several points. UI furniture — icons, badges,
  the risk ring, the propagation core — scaled with it.
- **One clock.** Scene beats run off a single `cue()` timeline rather than
  scattered CSS delays, so the curtain, stage, counters, event stream and each
  act's set piece stay in step.
- **Type arrives by mask reveal.** Headings are split into lines at runtime and
  each rises out of its own clipped box. Inline markup (the coloured agent word)
  survives the split.
- **The curtain wipes** upward via `clip-path` rather than fading.
- **Event stream keeps history.** The last three events stay on screen, older
  ones receding, so the sequence reads rather than flashing past.
- **Connectors are measured.** The propagation map's lines are computed from the
  real rendered positions and drawn with `stroke-dashoffset`, so they land exactly
  on each node and redraw on resize.
- **The risk arc and its number resolve together** as one gesture.
- Ambient stage light drifts on a 30s cycle; entry animations resolve blur along
  with position. Everything runs on `transform`, `opacity` and `filter` only, on
  one easing family, and collapses under `prefers-reduced-motion`.

**Verified at** 1920×1080, 1600×1000 and 1366×768 with no clipping or overflow
in any act, and no console errors; below 980px wide the stage stacks to a single
column.

## V8.2 — the intro explains the exercise

The intro was rebuilt from a silent title card into a narrated explainer that
covers how RED attacks and how BLUE and GREEN stop and harden against it, so the
demo now opens with the story rather than a logo.

- `data/intro.json` holds the script; `server.py` merges it into the TTS scene
  map, so intro narration is synthesised and cached exactly like act narration.
  This is the only change to `server.py` — two lines, and it no-ops if the file
  is absent.
- Chapters are audio-driven with a duration floor, so the sequence is correct
  whether narration comes from OpenAI TTS, the browser voice, or nothing at all.
- The look-alike domain is shown as a character-level diff — the genuine
  `acme-components.com` against RED's `acme-componets.com`, with the dropped
  character marked — which is the single clearest way to show the technique.

## V8.3 — the intro makes the argument

The explainer was rewritten from "here is what happened in this exercise" to
"here is why this exercise matters". It now covers how an autonomous attacker
changes phishing — micro-targeting, sustained conversation, multimodal
reinforcement, prompt injection aimed at the recipient's AI assistant,
objective-driven rerouting and closed-loop adaptation — before showing why the
response is itself a set of agents.

The agent-versus-agent chapter is the one to watch in the room: it shows a
message whose visible text is unremarkable and whose embedded comment is
addressed to the assistant that summarises the mailbox, with the human path
greyed out entirely.

Claims are kept to mechanisms that follow from technology that exists now — no
invented statistics, no projected dates, and no suggestion that any control
stops everything.

## V8.4 — the film is in the build

The rendered briefing film now ships inside the package and plays as act one's
intro, with the coded chapters kept as the fallback path.

- Both encodes were produced from the 69 MB master: 20 MB H.264/AAC and 10 MB
  VP9/Opus, measured at RMSE < 2 against the original frames.
- `server.py` now answers HTTP Range requests with `206 Partial Content`.
  `SimpleHTTPRequestHandler` ignores `Range` entirely, which prevented the
  browser from seeking in the film — the end of the video was unreachable.
- A refused autoplay shows a **Start briefing** button rather than muting the
  film, since a silent narrated explainer is worse than a click.
- Missing or undecodable video falls through to the coded chapters instead of
  skipping the briefing, detected via `networkState` rather than error events.

## V8.5 — static hosting

The build now runs unchanged on a static host as well as under `server.py`.

- Narration resolves through three sources in order: a pre-rendered
  `shared/narration/<id>.mp3`, then the live TTS endpoint, then the browser
  voice. `tools/prerender_narration.py` generates the mp3s from the same scene
  data and TTS settings the server uses.
- The two narration fetches were the only absolute paths in the build; they are
  relative now, so a repository subpath (`/<repo>/`) works without edits.
- Added `.nojekyll`, `.gitignore` and `shared/narration/`.

**Verified** by serving the tree with a plain static file server under a
subpath: the index redirect, the intro film, all three acts, the vendored fonts
and the measured propagation connectors all work, with no console errors and no
requests failing other than the intentional narration fallbacks.

## V8.7 — legibility on wide, short screens

A 1920x900 display — the most common projector and docked-laptop output — was
being rendered at the small-laptop type scale. The height breakpoints written for
1366x768 were keyed on viewport height alone, so a screen with plenty of width
but a short viewport fell off the same cliff and threw away its width headroom.

- The type tokens now size on `min(vw, vh)`. The stage is a fixed viewport, so
  text is bounded by whichever dimension is actually tight, and that is now
  tracked continuously instead of via a step change.
- Two stale width-based overrides survived from the pre-token build and were
  still setting `.act-head h1` and `.counter b` directly, capping the title at
  34px and counters at 19px on any screen under 1440px wide. Removed — the
  tokens govern type everywhere now.
- The height breakpoints no longer touch type at all; they only reclaim spacing.
  The agent reasoning log is the adjustable element: it exists to fill slack, so
  it sheds lines (6 → 3 → 2 → hidden) before anything carrying the argument does.

Measured at 1907x900: body 14.5px → 16.7px, data 14.5 → 16.7, telemetry 13.5 →
14.6, counters 29 → 31.1, act title 42 → 49.5. At 1920x1080: body 19px, counters
36.5px, title 59.4px.

**Verified** at 1920x1080, 1907x900, 1600x1000, 1440x900 and 1366x768 — no
clipping in any act at any of them, and no console errors.

## V8.8 — muted text weighted for a projector

The three muted ink steps were tuned on a desk monitor and read too faint
projected. They are darker now, graduated so the hierarchy between them holds:

| token | was | now | contrast on white |
| --- | --- | --- | --- |
| `--ink-2` | `#39414C` | `#323943` | 10.32:1 → 11.65:1 |
| `--ink-3` | `#69727E` | `#5A626C` | 4.87:1 → 6.18:1 |
| `--ink-4` | `#9AA2AD` | `#7E858E` | 2.58:1 → 3.73:1 |

`--ink-4` carries every small uppercase mono label — section captions, counter
names, timestamps, log detail — and at 2.58:1 was below even the large-text
threshold, so it took the largest correction. The steps remain clearly
separated (1.89:1 between ink-2 and ink-3, 1.66:1 between ink-3 and ink-4), so
nothing flattens.

Receded event-stream lines were lifted from 42% to 55% opacity for the same
reason; they still read as history without disappearing on a projector.

## V8.9 — new briefing film, repo-ready

- The intro film was replaced with the revised cut (2:09). It follows the script
  more closely: the sustained email thread across days, the multimodal fan-out
  into Teams / voice / SharePoint / calendar / executive video, the compromised
  AI assistant, and the closed-loop observe-and-reclassify campaign.
- Re-encoded from the 63 MB master to 19 MB H.264/AAC and 9 MB VP9/Opus, at
  RMSE < 2.1 against the original frames.
- Added `.gitattributes` pinning LF line endings and marking video, audio and
  font files as binary, so pushing from Windows cannot corrupt them.
- README rewritten as a repository landing page: what the project is, how to run
  it statically or with the narration server, and the synthetic-exercise notice
  up front.

**Verified** by serving the tree with a plain static file server under a
repository subpath: index redirect, the film, all three acts, the vendored fonts
and the measured connectors, with no console errors. A `git init && git add -A`
dry run commits 28 files at 28 MB.

## V8.10 — the film was playing behind the backdrop

Audio played but no picture: `.intro-film`, the coded-chapter layer, is
absolutely positioned with an opaque paper background and sits after the
`<video>` in DOM order, so it painted straight over it.

- The video is now `position:absolute; z-index:1`, and taking over removes the
  whole `.intro-film` layer rather than just the `.fc` chapters inside it. The
  fallback path still keeps that layer, since it needs the chapters.
- `object-fit` changed from `cover` to `contain`. The film is 16:9 and carries
  text near the edges; on a wider viewport (1907x900 is 2.12:1) `cover` was
  cropping it. The letterbox is `#BAB7AE`, sampled from the film's own edge, so
  the bars are effectively invisible.
- **`.intro-start` was visible on every load.** Its rule sets `display:flex`,
  which out-specifies the UA stylesheet's `[hidden]{display:none}`, so the
  `hidden` attribute did nothing. Added `.intro-start[hidden]{display:none}`.
  This is why the briefing appeared as a bare button on an empty page.

The regression that let this ship: the playback tests asserted `playing === true`
and never checked a pixel. They now assert `document.elementFromPoint` at the
centre of the viewport returns the `VIDEO` element, and that the backdrop layer
is gone — both of which fail against the old build.
