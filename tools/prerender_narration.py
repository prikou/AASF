"""Pre-render every narration line to shared/narration/<id>.mp3.

Run this once with an OpenAI key, commit the mp3s, and the deck keeps the
studio voice on any static host — GitHub Pages included — with no backend.

    set OPENAI_API_KEY=sk-...      (Windows)
    export OPENAI_API_KEY=sk-...   (macOS / Linux)
    python tools/prerender_narration.py

Existing files are skipped unless --force is passed.
"""
import json, os, sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'shared' / 'narration'
FORCE = '--force' in sys.argv

MODEL = os.getenv('OPENAI_TTS_MODEL', 'gpt-4o-mini-tts')
VOICE = os.getenv('OPENAI_TTS_VOICE', 'coral')
INSTRUCTIONS = os.getenv(
    'OPENAI_TTS_INSTRUCTIONS',
    'Speak like a calm human executive narrator. Be concise, natural and '
    'credible. Add subtle urgency during attacks. Avoid sounding robotic or '
    'theatrical.')


def scenes():
    for name in ('scenes.json', 'intro.json'):
        path = ROOT / 'data' / name
        if path.exists():
            for entry in json.loads(path.read_text(encoding='utf-8')):
                if entry.get('narration'):
                    yield entry['id'], entry['narration']


def synthesise(key, text):
    body = json.dumps({'model': MODEL, 'voice': VOICE, 'input': text,
                       'instructions': INSTRUCTIONS,
                       'response_format': 'mp3'}).encode()
    req = Request('https://api.openai.com/v1/audio/speech', data=body,
                  headers={'Authorization': f'Bearer {key}',
                           'Content-Type': 'application/json'}, method='POST')
    with urlopen(req, timeout=90) as r:
        return r.read()


def main():
    key = os.getenv('OPENAI_API_KEY')
    if not key:
        sys.exit('OPENAI_API_KEY is not set. Nothing to do.')
    OUT.mkdir(parents=True, exist_ok=True)
    written = skipped = failed = 0
    for scene_id, text in scenes():
        target = OUT / f'{scene_id}.mp3'
        if target.exists() and not FORCE:
            print(f'  skip   {scene_id}  (already rendered)')
            skipped += 1
            continue
        try:
            target.write_bytes(synthesise(key, text))
            print(f'  write  {scene_id}  ({target.stat().st_size // 1024} KB)')
            written += 1
        except (HTTPError, URLError, TimeoutError) as e:
            print(f'  FAIL   {scene_id}: {e}')
            failed += 1
    print(f'\n{written} written, {skipped} skipped, {failed} failed -> {OUT}')
    if failed:
        sys.exit(1)


if __name__ == '__main__':
    main()
