"""Editorial plates for the camera and animated packet compositor (no deck renders)."""
from functools import lru_cache
from pathlib import Path
import textwrap
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
from stories import STORIES, LABS, MINUTES

P=Path(__file__).resolve().parents[1]
BG='#111e24'; PANEL='#1a2c32'; INK='#fbf6e8'; SUB='#bbcdca'; GRID='#40616a'; CARD='#20373d'
ACC={'Session-Explainer':'#c4ef93','Instructor-Explainer':'#ffc396','Attendee-Explainer':'#99ddf4'}

@lru_cache(maxsize=None)
def font(size,kind):
    return ImageFont.truetype(str(Path('C:/Windows/Fonts') / {'r':'segoeui.ttf','b':'segoeuib.ttf','m':'consola.ttf'}[kind]), size)
def txt(d,x,y,s,size=30,c=INK,k='r'):
    d.text((x,y),s,font=font(size,k),fill=c,anchor='lt')
def wrap(d,x,y,s,width,size,c=INK,k='r',gap=10):
    words=s.split(); lines=['']
    for w in words:
        val=(lines[-1]+' '+w).strip()
        if lines[-1] and d.textlength(val,font=font(size,k))>width: lines.append(w)
        else: lines[-1]=val
    for line in lines:
        while d.textlength(line,font=font(size,k))>width and size>17:size-=1
        txt(d,x,y,line,size,c,k);y+=size+gap
    return y
def box(d,xy,color=PANEL,edge=GRID,w=2,r=15):
    d.rounded_rectangle(xy,radius=r,fill=color,outline=edge,width=w)
def line(d,a,b,color=GRID,width=5):
    d.line([a,b],fill=color,width=width)
def node(d,xy,title,detail,active,accent):
    x,y,X,Y=xy;box(d,xy,CARD,accent if active else GRID,4 if active else 2)
    txt(d,x+22,y+17,title,30,accent if active else INK,'b')
    wrap(d,x+22,y+61,detail,X-x-43,23,SUB)

SKILLS=[
    ('Developer','zero-package-engineering','Atomic writes · built-in fetch'),
    ('Tester','foundry-oauth-testing','Loopback mocks · repeatable failures'),
    ('Security','local-app-security-audit','Check secret boundaries · cite findings'),
    ('Documentation','foundry-handoff-docs','Portal guide · handoff instructions')]

def diagram(d,visual,f,accent):
    if visual=='roles':
        x,y=122,472; node(d,(x,y,500,623),'Orchestrator','read / search / agent / todo',True,accent)
        for j,(name,detail) in enumerate([('Developer','Edit application code'),('Tester','Run native tests'),('Security','Read-only review'),('Documentation','Write setup guides')]):
            yy=273+j*137; a=(500,548);b=(824,yy+59)
            line(d,a,b,accent if f==j else GRID,4);node(d,(824,yy,1254,yy+118),name,detail,f==j,accent)
        return (500,548,824,332+f*137)
    if visual=='skills':
        for j,(name,skill,usage) in enumerate(SKILLS):
            yy=269+j*137; on=j==f
            box(d,(106,yy,425,yy+110),CARD,accent if on else GRID,3)
            txt(d,131,yy+38,name,32,accent if on else INK,'b')
            line(d,(426,yy+55),(528,yy+55),accent if on else GRID)
            box(d,(529,yy,1268,yy+110),CARD,accent if on else GRID,3)
            txt(d,554,yy+18,skill,31,INK,'m');txt(d,554,yy+65,usage,24,SUB)
        return (426,324+f*137,528,324+f*137)
    if visual=='map':
        coords=[(100,451,362,593),(473,293,779,422),(473,602,779,731),(948,451,1267,593)]
        for a,b in [((362,522),(473,358)),((362,522),(473,666)),((779,358),(948,522)),((779,666),(948,522))]:
            line(d,a,b,accent if f==1 else GRID)
        line(d,(362,522),(948,522),SUB,3)
        txt(d,445,468,'fits in one chunk',26,SUB,'m')
        for j,((title,detail),xy) in enumerate(zip([('Session digest','Relative paths'),('Part 1','Compact digest'),('Part N','Compact digest'),('Synthesis','One Markdown file')],coords)):
            node(d,xy,title,detail,j in ([1,2] if f==1 else [3]),accent)
        return (362,522,473,358) if f==1 else (779,666,948,522)
    if visual=='auth':
        for (x,y,X,Y,title,detail) in [(99,440,486,612,'Chronicle server','Secret stays server-side'),(795,290,1250,445,'Microsoft Entra ID','Client credentials → token'),(795,611,1250,766,'Foundry Responses','Bearer token → READY')]:
            node(d,(x,y,X,Y),title,detail,True,accent)
        line(d,(486,520),(795,368),GRID);line(d,(486,548),(795,688),accent)
        txt(d,497,351,'01   Authenticate',25,SUB,'m');txt(d,488,693,'02   Invoke',25,accent,'m')
        return (486,548,795,688)
    if visual=='release':
        data=[('01   Generate','render-icon.cjs','PNG + ICO'),('02   Serve','public/','chronicle-icon.png'),('03   Inspect','Browser release','Desktop: read only')]
    else:
        data=[('01   Runtime','node --version','22 or newer'),('02   Syntax','node --check','src/server.js'),('03   Tests','node --test','Zero failures')]
    for j,(label,first,second) in enumerate(data):
        x=105+j*399;y=383
        box(d,(x,y,x+350,y+280),CARD,accent if f==j else GRID,4)
        txt(d,x+23,y+24,label,28,accent if f==j else SUB,'b')
        line(d,(x+23,y+90),(x+324,y+90),GRID,2)
        txt(d,x+23,y+133,first,31,INK,'m');txt(d,x+23,y+206,second,26,SUB)
        if j<2: line(d,(x+350,y+140),(x+399,y+140),GRID)
    idx=max(0,min(1,f-1));return (455+idx*399,523,504+idx*399,523)

# Crop rectangles normalized to the separately captured 16:9 UI, not re-created UI.
CROPS={'starter':(.032,.285,.49,.634),'finished':(.285,.15,.813,.58),
       'config':(.307,.245,.691,.585),'log':(.665,.423,.985,.588)}
def camera(d,im,visual,f,accent):
    source=Image.open(P/'assets/screenshots'/f'{visual}.png').convert('RGB')
    # Fit the entire intended crop into the camera viewport; preserve aspect ratio.
    b=CROPS[visual]
    if visual=='config' and f==1: b=(.307,.562,.691,.835)
    roi=source.crop(tuple(round(v*source.size[i%2]) for i,v in enumerate(b)))
    panel=Image.new('RGB',(1216,548),'#0b1317')
    fit=ImageOps.contain(roi,panel.size,Image.Resampling.LANCZOS)
    panel.paste(fit,((1216-fit.width)//2,(548-fit.height)//2))
    if visual=='log':
        panel.paste('#0b1317',(0,0,1216,548))
        # Wide log layout has its status at upper left and step rows at lower right.
        # Pair two enlarged, unaltered details rather than enlarging the empty middle.
        top=source.crop((0,0,548,124)).resize((822,186),Image.Resampling.LANCZOS)
        bottom=source.crop((1064,379,1576,528)).resize((896,261),Image.Resampling.LANCZOS)
        panel.paste(top,(197,22));panel.paste(bottom,(160,253))
    im.paste(panel,(80,262))
    # Viewfinder brackets stay outside the moving crop.
    for x,sg in [(77,1),(1298,-1)]:
        for y,sy in [(258,1),(812,-1)]:
            line(d,(x,y),(x+sg*30,y),accent,3);line(d,(x,y),(x,y+sy*22),accent,3)
    return (102,835,1260,835)
def plate(stem,index,shot):
    lab,visual,f,title,note,speech=shot;ac=ACC[stem];im=Image.new('RGB',(1920,1080),BG);d=ImageDraw.Draw(im)
    txt(d,64,44,'CHRONICLE   /   ADVANCED',26,ac,'m')
    txt(d,1363,44,STORIES[stem][0].upper(),26,ac,'m')
    size=64
    while d.textlength(title,font=font(size,'b'))>1780:size-=1
    txt(d,60,100,title,size,INK,'b')
    line(d,(64,198),(1856,198),GRID,2)
    photo=visual in CROPS
    tag={'roles':'Dispatch map','skills':'Role → playbook','baseline':'Baseline checks','auth':'Request sequence','map':'Digest routing','release':'Release evidence'}.get(visual,'Application detail')
    txt(d,79,222,tag.upper(),22,SUB,'m')
    if photo:path=camera(d,im,visual,f,ac)
    else:path=diagram(d,visual,f,ac)
    box(d,(1340,260,1857,813),PANEL,GRID,2)
    txt(d,1375,300,('FIELD NOTE','COACHING CUE','CHECKPOINT')[list(STORIES).index(stem)],23,ac,'m')
    y=wrap(d,1375,365,note,436,38,INK,'b',12)
    if y>710:raise ValueError(f'Note overset: {note}')
    line(d,(1375,716),(1822,716),GRID,2)
    txt(d,1375,745,f'LAB {lab:02d}   /   {MINUTES[lab]} MIN',25,SUB,'m')
    if photo:
        line(d,(101,835),(1262,835),GRID,2)
        txt(d,80,857,f'{visual.upper()} VIEW   /   LOCAL WORKSHOP FIXTURE',21,SUB,'m')
    else:txt(d,80,855,'SYSTEM DIAGRAM   /   HIGHLIGHTED FLOW',21,SUB,'m')
    # Proportional lab clock. The empty lower margin is also a safe area for optional CC.
    x=64
    for j,m in enumerate(MINUTES):
        width=1792*m/90
        d.rectangle((x,923,x+width-5,932),fill=ac if j==lab else GRID)
        txt(d,int(x),945,f'{j:02d} / {m}m',22,ac if j==lab else SUB,'m');x+=width
    txt(d,65,1024,'90-MINUTE WORKSHOP CLOCK',18,SUB,'m')
    txt(d,1465,1024,f'LAB {lab:02d}   ·   MIN {sum(MINUTES[:lab]):02d}–{sum(MINUTES[:lab+1]):02d}',21,ac,'m')
    return im,path,photo

def nv12(im):
    y,cb,cr=im.convert('YCbCr').split()
    Y=np.uint8(np.asarray(y,dtype='float32')*(219/255)+16.5)
    uv=np.empty((540,960,2),dtype='uint8')
    for i,p in enumerate((cb,cr)):
        uv[:,:,i]=np.uint8(np.asarray(p.resize((960,540),Image.Resampling.BOX),dtype='float32')*(224/255)+16.5)
    return Y.tobytes()+uv.tobytes()

def from_nv12(path):
    b=np.frombuffer(path.read_bytes(),dtype=np.uint8)
    y=Image.fromarray(np.uint8(np.clip((b[:1920*1080].astype('float32')-16)*(255/219),0,255).reshape(1080,1920)))
    aligned,rem=divmod(len(b)*2,1920*3)
    if rem or aligned not in (1080,1088):raise ValueError('Unexpected decoded NV12 pitch or height')
    uv=b[1920*aligned:1920*aligned+1920*540].reshape(540,960,2).astype('float32')
    c=[Image.fromarray(np.uint8(np.clip((uv[:,:,i]-16)*(255/224),0,255))).resize(y.size) for i in range(2)]
    return Image.merge('YCbCr',(y,*c)).convert('RGB')
