"""Build the three 1080p24 explainers, captions and transcripts (Windows).

Requirements: Python with Pillow + NumPy, Visual C++ x64 and Windows SDK,
the four captured PNGs in ../assets/screenshots and sibling voice.py.
PowerShell: $env:CHRONICLE_VOICE='preview'; python -B build_videos.py
Optional: --only Session-Explainer (or Instructor-Explainer / Attendee-Explainer).
Set VCVARS64 to vcvars64.bat if Visual Studio is installed outside Program Files.
No slide export, browser automation or network calls in this compositor.
"""
import argparse
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import textwrap
import wave
sys.dont_write_bytecode=True
import numpy as np
from PIL import Image, ImageDraw
from build_videos_audio import CACHE, takes
from build_videos_art import P, plate, nv12, from_nv12, font
from build_videos_text import timed_track
from stories import STORIES, LABS, MINUTES, shots

F=24
def stamp(frame, comma=False):
    ms=round(frame*1000/F)
    return '%02d:%02d:%02d%s%03d'%(ms//3600000,ms//60000%60,ms//1000%60,',' if comma else '.',ms%1000)

def encoder():
    src=Path(__file__).with_name('build_videos_mf.cpp').resolve()
    exe=CACHE/'media.exe'
    if not exe.exists() or src.stat().st_mtime>exe.stat().st_mtime:
        candidates=[Path(os.environ.get('VCVARS64','vcvars64.bat'))]
        for folder in ('ProgramFiles','ProgramFiles(x86)'):
            candidates+=list((Path(os.environ[folder])/'Microsoft Visual Studio').glob('*/*/VC/Auxiliary/Build/vcvars64.bat'))
        vc=next((p.resolve() for p in candidates if p.is_file()),None)
        if vc is None:raise RuntimeError('Set VCVARS64 to the x64 MSVC environment batch file')
        cmd=f'call "{vc}" && cl /nologo /EHsc /O2 /std:c++17 /DNOMINMAX /Fe:media.exe "{src}" mfplat.lib mfreadwrite.lib mfuuid.lib ole32.lib'
        subprocess.run(cmd,shell=True,check=True,cwd=CACHE)
    return exe

def pcm(path):
    with wave.open(str(path),'rb') as w:
        a=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,w.getnchannels()).mean(axis=1)
        rate=w.getframerate()
    # Preserve natural pauses, trim only excessive dead space between cached takes.
    active=np.flatnonzero(np.abs(a)>55)
    if not len(active):raise ValueError(f'Silent take: {path.name}')
    a=a[max(0,active[0]-rate//14):min(len(a),active[-1]+rate//6)]
    x=np.interp(np.arange(round(len(a)*48000/rate))*rate/48000,np.arange(len(a)),a)
    frames=math.ceil(len(x)/2000);x=np.pad(x,(0,frames*2000-len(x)))
    return frames,x.astype('<i2').tobytes()

def caption_groups(sentence):
    # At most two lines, ~39 columns per line. Short sentences stay intact.
    lines=textwrap.wrap(sentence,width=39,break_long_words=False,break_on_hyphens=False)
    return ['\n'.join(lines[i:i+2]) for i in range(0,len(lines),2)]

def build(stem,exe):
    folder=CACHE/stem
    folder.mkdir(exist_ok=True)
    plan=[];cues=[];review=[];chap=[];providers=set();n=0
    sections=list(shots(stem))
    with (folder/'audio.pcm').open('wb') as audio:
        for i,shot in enumerate(sections):
            lab,visual,f,title,note,speech=shot
            im,path,zoom=plate(stem,i,shot)
            start=n;name=f'{i:02d}.nv12';(folder/name).write_bytes(nv12(im))
            for sentence,wav,provider in takes(speech):
                providers.add(provider);frames,data=pcm(wav);audio.write(data)
                groups=caption_groups(sentence)
                weights=[len(re.findall(r'\w+',g)) for g in groups]
                offsets=[n+round(frames*sum(weights[:j])/sum(weights)) for j in range(len(groups)+1)]
                cues.extend((offsets[j],offsets[j+1],g) for j,g in enumerate(groups));n+=frames
            review.append(start+min(32,(n-start)//2))
            plan.append(' '.join(map(str,[name,n-start,*path,0,n-start,int(zoom)])))
            chap.append((start,lab,title,speech))
    assert len(providers)==1 and cues[0][0]==0 and cues[-1][1]==n and all(a<b for a,b,_ in cues)
    (folder/'plan.txt').write_text('\n'.join(plan),encoding='ascii')
    (folder/'samples.txt').write_text('\n'.join(map(str,review)),encoding='ascii')
    print('Encoding',stem,stamp(n),flush=True)
    raw=folder/'av.mp4';target=folder/'captioned.mp4'
    raw.unlink(missing_ok=True)
    subprocess.run([exe,'encode',folder,raw],check=True)
    timed_track(raw,target,cues)
    result=subprocess.run([exe,'verify',folder,target],check=True,capture_output=True,text=True).stdout.strip()
    actual=re.search(r'frames=(\d+) AAC samples=(\d+)',result)
    assert actual and int(actual[1])==n and abs(int(actual[2])-n*2000)<=3072,result
    print(stem,result,f'English tx3g: {len(cues)} cues',flush=True)
    # Every shot is reviewed from the decoded output rather than a source plate.
    sheet=Image.new('RGB',(4*480,math.ceil(len(review)/4)*295),'#101a20')
    for i,frame in enumerate(review):
        framefile=folder/f'decoded-{frame}.nv12'
        img=from_nv12(framefile)
        img.save(folder/f'shot-{i:02d}.jpg',quality=88)
        xy=(i%4*480,i//4*295);sheet.paste(img.resize((480,270),Image.Resampling.LANCZOS),xy)
        ImageDraw.Draw(sheet).text((xy[0]+6,xy[1]+270),stamp(frame),font=font(16,'m'),fill='white')
        framefile.unlink()
    sheet.save(folder/'encoded-contact.jpg',quality=92)
    texts=[]
    for j,(a,b,c) in enumerate(cues):
        texts.append((f'{j+1}\n{stamp(a,True)} --> {stamp(b,True)}\n{c}',f'{stamp(a)} --> {stamp(b)}\n{c}'))
    srt='\n\n'.join(pair[0] for pair in texts)+'\n'
    vtt='WEBVTT\n\n'+'\n\n'.join(pair[1] for pair in texts)+'\n'
    transcript=[f'# Chronicle Advanced — {STORIES[stem][0]}',f'Video: [{stem}.mp4](../{stem}.mp4) · Runtime: {stamp(n)}',
                f'Narration: **{next(iter(providers))}** (mode: `{os.environ.get("CHRONICLE_VOICE","foundry")}`).',
                'Times below are playback positions. Lab allocations refer to the separate 90-minute workshop. App views show local fixtures, not a live Foundry run.']
    for start,lab,title,speech in chap:
        if not any(s.startswith(f'## Lab {lab:02d}') for s in transcript):
            transcript.append(f'## Lab {lab:02d} — {LABS[lab]} ({MINUTES[lab]} workshop minutes)')
        transcript.append(f'**{stamp(start)[:8]} · {title}**\n\n{speech}')
    (P/'transcripts').mkdir(exist_ok=True)
    (P/'transcripts'/f'{stem}.md').write_text('\n\n'.join(transcript)+'\n',encoding='utf-8')
    (P/f'{stem}.srt').write_text(srt,encoding='utf-8')
    (P/f'{stem}.vtt').write_text(vtt,encoding='utf-8')
    target.replace(P/f'{stem}.mp4')
    (folder/'validation.txt').write_text(f'{result}\nEnglish tx3g: {len(cues)} cues\nDuration: {stamp(n)}\n'+next(iter(providers)),encoding='utf-8')
    raw.unlink()
    for p in folder.glob('*.nv12'):p.unlink()
    (folder/'audio.pcm').unlink()

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--only',choices=STORIES)
    args=parser.parse_args()
    CACHE.mkdir(parents=True,exist_ok=True)
    for name in ('starter','finished','config','log'):
        if not (P/'assets/screenshots'/f'{name}.png').is_file():raise SystemExit(f'Missing capture: {name}.png')
    exe=encoder()
    for stem in ([args.only] if args.only else STORIES):build(stem,exe)
