from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
from pathlib import Path
import os,json,hashlib
ROOT=Path(__file__).resolve().parent
HOST,PORT='127.0.0.1',8773
CACHE=ROOT/'.audio-cache';CACHE.mkdir(exist_ok=True)
SCENES={s['id']:s for s in json.loads((ROOT/'data'/'scenes.json').read_text(encoding='utf-8'))}
_INTRO=ROOT/'data'/'intro.json'
if _INTRO.exists():SCENES.update({s['id']:s for s in json.loads(_INTRO.read_text(encoding='utf-8'))})
def tts(scene_id):
 s=SCENES.get(scene_id); key=os.getenv('OPENAI_API_KEY')
 if not s:return None,'unknown_scene'
 if not key:return None,'not_configured'
 model=os.getenv('OPENAI_TTS_MODEL','gpt-4o-mini-tts');voice=os.getenv('OPENAI_TTS_VOICE','coral');ins=os.getenv('OPENAI_TTS_INSTRUCTIONS','Speak like a calm human executive narrator. Be concise, natural and credible. Add subtle urgency during attacks. Avoid sounding robotic or theatrical.')
 text=s['narration'];dg=hashlib.sha256((model+voice+scene_id+text+ins).encode()).hexdigest();f=CACHE/(dg+'.mp3')
 if f.exists():return f.read_bytes(),'cache'
 body=json.dumps({'model':model,'voice':voice,'input':text,'instructions':ins,'response_format':'mp3'}).encode();req=Request('https://api.openai.com/v1/audio/speech',data=body,headers={'Authorization':f'Bearer {key}','Content-Type':'application/json'},method='POST')
 try:
  with urlopen(req,timeout=45) as r:a=r.read()
  f.write_bytes(a);return a,'openai'
 except (HTTPError,URLError,TimeoutError) as e:return None,f'error:{e}'
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
 def log_message(self,*a):pass
 def j(self,c,o):
  b=json.dumps(o).encode();self.send_response(c);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def rng(self):
  # SimpleHTTPRequestHandler ignores Range, which stops a browser seeking in the
  # intro film. Serve 206 partial content so the video scrubs properly.
  h=self.headers.get('Range')
  if not h or not h.startswith('bytes='):return False
  path=self.translate_path(self.path)
  if not os.path.isfile(path):return False
  size=os.path.getsize(path)
  s,_,e=h[6:].partition('-')
  try:
   start=int(s) if s else 0
   end=int(e) if e else size-1
  except ValueError:return False
  if start>=size:
   self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return True
  end=min(end,size-1);length=end-start+1
  self.send_response(206)
  self.send_header('Content-Type',self.guess_type(path))
  self.send_header('Content-Length',str(length))
  self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
  self.end_headers()
  try:
   with open(path,'rb') as f:
    f.seek(start);left=length
    while left>0:
     chunk=f.read(min(262144,left))
     if not chunk:break
     self.wfile.write(chunk);left-=len(chunk)
  except (BrokenPipeError,ConnectionResetError):pass
  return True
 def end_headers(self):
  if self.path.endswith(('.mp4','.webm','.mp3')):self.send_header('Accept-Ranges','bytes')
  super().end_headers()
 def do_GET(self):
  p=urlparse(self.path).path
  if p=='/api/health':return self.j(200,{'status':'ok','product':'AASF Email Defense Only V7.3.1','port':8773,'narration':'openai_tts' if os.getenv('OPENAI_API_KEY') else 'browser_fallback'})
  legacy={'/story/01-email-attack.html':'/story/01-red-attack.html','/story/02-email-received.html':'/story/02-blue-remediate.html','/story/03-email-red.html':'/story/02-blue-remediate.html','/story/04-email-blue.html':'/story/02-blue-remediate.html','/story/05-email-green.html':'/story/03-green-remediation.html'}
  if p in legacy:
   self.send_response(302);self.send_header('Location',legacy[p]);self.end_headers();return
  if p.startswith('/api/narration/') and p.endswith('/audio'):
   sid=p.split('/')[-2];a,src=tts(sid)
   if a:self.send_response(200);self.send_header('Content-Type','audio/mpeg');self.send_header('Content-Length',str(len(a)));self.end_headers();self.wfile.write(a);return
   return self.j(404,{'error':src})
  if self.rng():return
  return super().do_GET()
if __name__=='__main__':
 os.chdir(ROOT);print('AASF Email Defense Only V7.3.1');print('Open: http://127.0.0.1:8773/story/01-red-attack.html');ThreadingHTTPServer((HOST,PORT),H).serve_forever()
