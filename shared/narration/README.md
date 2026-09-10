Pre-rendered narration lives here as `<scene id>.mp3`.

Generate it once with `python tools/prerender_narration.py` (needs
`OPENAI_API_KEY`), then commit the files. The deck prefers these over the live
TTS endpoint, so the studio voice survives on any static host — GitHub Pages
included — with no backend running.

Leave the folder empty and narration falls back to the browser's speech voice.
