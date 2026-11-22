"""Chronicle Advanced: offline, standard-library-only editable PowerPoint builder.

Run: python workshop/Advanced/content/scripts/build_decks.py
Inputs: ../assets/screenshots/{starter,finished,config,log}.png (no substitutes).
After generation, use build_decks_render.ps1 for native PNG proofing in a new
PowerPoint instance. The builder itself never starts or attaches to Office.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape, quoteattr
from xml.etree import ElementTree as ET
import struct
import os
import sys

sys.dont_write_bytecode = True
from build_decks_labs import LABS

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "assets" / "screenshots"
IMAGES = ("starter", "config", "log", "finished")
W, H = 960, 540
INK, PAPER, DARK = "172E36", "FAF8F2", "10393E"
TEAL, RUST, MINT, GOLD, MUTED = "006C68", "9A3E22", "ABF0CF", "FFD38C", "425C63"
P, A, R = [f"http://schemas.openxmlformats.org/{p}/2006/{q}" for p,q in
           [("presentationml","main"), ("drawingml","main"), ("officeDocument","relationships")]]
NS = f'xmlns:p="{P}" xmlns:a="{A}" xmlns:r="{R}"'
HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
GROUP = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>'
MASTERMAP = '<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" tx1="dk1" tx2="dk2" hlink="hlink" folHlink="folHlink"/>'
def em(n): return round(n * 12700)
def xf(x,y,w,h):
    assert x>=0 and y>=0 and x+w<=W+.01 and y+h<=H+.01,(x,y,w,h)
    return f'<a:xfrm><a:off x="{em(x)}" y="{em(y)}"/><a:ext cx="{em(w)}" cy="{em(h)}"/></a:xfrm>'
def color(c): return f'<a:solidFill><a:srgbClr val="{c}"/></a:solidFill>'
def rel(*items):
    return '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join(
        f'<Relationship Id="rId{i}" Type="{R}/{t}" Target="{v}"/>' for i,(t,v) in enumerate(items,1))+'</Relationships>'
def cs(tree,bg=PAPER):
    return '<p:cSld><p:bg><p:bgPr>'+color(bg)+'<a:effectLst/></p:bgPr></p:bg><p:spTree>'+GROUP+tree+'</p:spTree></p:cSld>'
def geom(g): return f'<a:prstGeom prst="{g}"><a:avLst/></a:prstGeom>'
def nv(n,name,typ=''):
    return f'<p:nvSpPr><p:cNvPr id="{n}" name={quoteattr(name)}/><p:cNvSpPr/><p:nvPr>{typ}</p:nvPr></p:nvSpPr>'

class Slide:
    def __init__(self,notes,bg=PAPER):
        self.notes,self.bg,self.tree,self.image = notes,bg,[],None
    def shape(self,x,y,w,h,c,g="rect",name=""):
        self.tree.append('<p:sp>'+nv(len(self.tree)+2,name or g)+'<p:spPr>'+xf(x,y,w,h)+geom(g)+color(c)+'</p:spPr></p:sp>')
    def text(self,x,y,w,h,text,size=19,c=INK,b=False,font="Segoe UI",align="l"):
        paragraphs=[]
        for line in text.split('\n'):
            paragraphs.append(f'<a:p><a:pPr algn="{align}"><a:lnSpc><a:spcPct val="100000"/></a:lnSpc></a:pPr><a:r><a:rPr lang="en-US" sz="{int(size*100)}" b="{int(b)}">{color(c)}<a:latin typeface="{font}"/></a:rPr><a:t>{escape(line)}</a:t></a:r></a:p>')
        self.tree.append('<p:sp>'+nv(len(self.tree)+2,text.split('\n')[0][:70])+'<p:spPr>'+xf(x,y,w,h)+geom('rect')+'<a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0" anchor="t"><a:noAutofit/></a:bodyPr><a:lstStyle/>'+''.join(paragraphs)+'</p:txBody></p:sp>')
    def pic(self,name,x,y,w,h,crop=(0,0,0,0)):
        self.image=name
        data=(SHOTS/(name+'.png')).read_bytes()
        assert data[:8]==b'\x89PNG\r\n\x1a\n'
        iw,ih=struct.unpack('>II',data[16:24])
        left,top,right,bottom=crop
        iw*=1-left-right;ih*=1-top-bottom;scale=min(w/iw,h/ih)
        pw,ph=iw*scale,ih*scale
        sr='<a:srcRect '+ ' '.join(f'{k}="{round(v*100000)}"' for k,v in zip('ltrb',crop))+'/>'
        self.tree.append(f'<p:pic><p:nvPicPr><p:cNvPr id="{len(self.tree)+2}" name="{name}.png" descr="Chronicle {name} screen"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId3"/>'+sr+'<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>'+xf(x+(w-pw)/2,y+(h-ph)/2,pw,ph)+geom('rect')+'</p:spPr></p:pic>')
    def xml(self):
        return f'<p:sld {NS}>'+cs(''.join(self.tree),self.bg)+'</p:sld>'

def placeholder(n,t,idx,body='',master=False):
    bounds='<p:spPr/>'
    if master:
        y,h=(40,263) if t=='sldImg' else (332,347)
        bounds=f'<p:spPr><a:xfrm><a:off x="{em(36)}" y="{em(y)}"/><a:ext cx="{em(468)}" cy="{em(h)}"/></a:xfrm>'+geom('rect')+'</p:spPr>'
    return '<p:sp>'+nv(n,t,f'<p:ph type="{t}" idx="{idx}"/>')+bounds+'<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1400"/><a:t>'+escape(body)+'</a:t></a:r></a:p></p:txBody></p:sp>'
def theme():
    cols=[('dk1',INK),('lt1',PAPER),('dk2',DARK),('lt2','E7EFE9'),('accent1',TEAL),('accent2',RUST),('accent3',MINT),('accent4',GOLD),('accent5','426A82'),('accent6','796B88'),('hlink',TEAL),('folHlink',RUST)]
    colors=''.join(f'<a:{n}><a:srgbClr val="{v}"/></a:{n}>' for n,v in cols)
    font=''.join(f'<a:{f}Font><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface=""/></a:{f}Font>' for f in ('major','minor'))
    fill='<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'
    return f'<a:theme xmlns:a="{A}" name="Chronicle Field Notes"><a:themeElements><a:clrScheme name="Estuary">{colors}</a:clrScheme><a:fontScheme name="Field notes">{font}</a:fontScheme><a:fmtScheme name="Flat"><a:fillStyleLst>{fill*3}</a:fillStyleLst><a:lnStyleLst>'+('' .join(f'<a:ln w="{v}">{fill}</a:ln>' for v in (6350,12700,19050)))+'</a:lnStyleLst><a:effectStyleLst>'+('<a:effectStyle><a:effectLst/></a:effectStyle>'*3)+f'</a:effectStyleLst><a:bgFillStyleLst>{fill*3}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>'

def save(slides,path):
    types={}
    with ZipFile(path,'w',ZIP_DEFLATED) as z:
        def put(n,s,t=None):
            z.writestr(n,HEAD+s)
            if t: types['/'+n]=('application/vnd.openxmlformats-officedocument.'+t+'+xml')
        put('_rels/.rels',rel(('officeDocument','ppt/presentation.xml')))
        put('ppt/theme/theme1.xml',theme(),'theme')
        # Native PowerPoint requires a distinct theme part for the notes master.
        put('ppt/theme/theme2.xml',theme(),'theme')
        put('ppt/slideMasters/slideMaster1.xml',f'<p:sldMaster {NS}>'+cs('')+MASTERMAP+'<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>','presentationml.slideMaster')
        put('ppt/slideMasters/_rels/slideMaster1.xml.rels',rel(('slideLayout','../slideLayouts/slideLayout1.xml'),('theme','../theme/theme1.xml')))
        put('ppt/slideLayouts/slideLayout1.xml',f'<p:sldLayout {NS} type="blank" preserve="1">'+cs('')+'</p:sldLayout>','presentationml.slideLayout')
        put('ppt/slideLayouts/_rels/slideLayout1.xml.rels',rel(('slideMaster','../slideMasters/slideMaster1.xml')))
        nt=placeholder(2,'sldImg',1,master=True)+placeholder(3,'body',2,master=True)
        put('ppt/notesMasters/notesMaster1.xml',f'<p:notesMaster {NS}>'+cs(nt)+MASTERMAP+'</p:notesMaster>','presentationml.notesMaster')
        put('ppt/notesMasters/_rels/notesMaster1.xml.rels',rel(('theme','../theme/theme2.xml')))
        links=[('slideMaster','slideMasters/slideMaster1.xml'),('notesMaster','notesMasters/notesMaster1.xml')]
        ids=''
        for i,s in enumerate(slides,1):
            ids+=f'<p:sldId id="{255+i}" r:id="rId{i+2}"/>'
            links.append(('slide',f'slides/slide{i}.xml'))
            put(f'ppt/slides/slide{i}.xml',s.xml(),'presentationml.slide')
            sr=[('slideLayout','../slideLayouts/slideLayout1.xml'),('notesSlide',f'../notesSlides/notesSlide{i}.xml')]
            if s.image: sr.append(('image',f'../media/{s.image}.png'))
            put(f'ppt/slides/_rels/slide{i}.xml.rels',rel(*sr))
            put(f'ppt/notesSlides/notesSlide{i}.xml',f'<p:notes {NS}>'+cs(placeholder(2,'sldImg',1)+placeholder(3,'body',2,s.notes))+'</p:notes>','presentationml.notesSlide')
            put(f'ppt/notesSlides/_rels/notesSlide{i}.xml.rels',rel(('notesMaster','../notesMasters/notesMaster1.xml'),('slide',f'../slides/slide{i}.xml')))
        put('ppt/presentation.xml',f'<p:presentation {NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:notesMasterIdLst><p:notesMasterId r:id="rId2"/></p:notesMasterIdLst><p:sldIdLst>{ids}</p:sldIdLst><p:sldSz cx="{em(W)}" cy="{em(H)}"/><p:notesSz cx="{em(540)}" cy="{em(720)}"/></p:presentation>','presentationml.presentation.main')
        put('ppt/_rels/presentation.xml.rels',rel(*links))
        for n in sorted({s.image for s in slides if s.image}):
            z.write(SHOTS/(n+'.png'),f'ppt/media/{n}.png')
        put('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>'+''.join(f'<Override PartName="{k}" ContentType="{v}"/>' for k,v in types.items())+'</Types>')

def label(s,x,y,w,t,c=TEAL):
    s.text(x,y,w,20,t,12,c,True)
def build(role):
    pres=role=='Presenter'
    deck=[]
    def page(notes,margin,title=None,bg=PAPER):
        s=Slide(notes,bg);deck.append(s)
        light=bg==PAPER
        label(s,36,22,890,margin, TEAL if light else MINT)
        s.shape(36,502,888,1,'C8D3CB' if light else '587577')
        s.text(36,511,700,18,f'CHRONICLE   /   ADVANCED     •     {role.upper()} EDITION',10,MUTED if light else MINT,True)
        s.text(850,509,74,19,f'{len(deck):02}',12,MUTED if light else MINT,True,align='r')
        if title:s.text(36,54,892,68,title,32,INK if light else PAPER,True)
        return s
    s=page("Start the eight-minute Lab 00 clock now; the opening and route map are included. Ask what a teammate without the original chat would need before writing more code." if pres else "Use this deck beside the six Advanced lab guides. Your output is a browser app and a handoff another person can use, not a copy of a private conversation.",'FIELD NOTES   /   CHRONICLE ENGINEERING',bg=DARK)
    s.text(36,98,620,170,'From a session\nto a handoff',57,PAPER,True)
    s.text(39,295,550,100,'Coach the team from a clean baseline to a verified browser release.' if pres else 'Build an agent team that turns a coding session into a portable Markdown brief.',25,MINT)
    for i,(num,txt) in enumerate([('01','Session'),('02','Evidence'),('03','Handoff')]):
        x=637+i*18;y=94+i*84;s.shape(x,y,241,74,[MINT,GOLD,'E8EDE2'][i])
        label(s,x+14,y+12,56,num,DARK);s.text(x+14,y+31,206,36,txt,23,DARK,True)
    label(s,40,442,600,'SIX LABS     /     90 MINUTES     /     NODE.JS 22+',GOLD)
    s=page("Point out that all timeboxes include their checkpoint. Move on at the boundary and retain any failed check as an explicit limitation." if pres else "Times are elapsed minutes from kickoff. The baseline needs no credentials. Use the local mock route when a live workshop check is unavailable.",'ROUTE MAP   /   LAB 00 OPENING','The 90-minute route')
    for i,d in enumerate(LABS):
        y=123+53*i
        label(s,38,y+5,72,f'LAB {i:02}')
        s.text(126,y,343,39,d['short'],21,INK,True)
        s.text(484,y+4,100,28,d['range'],17,MUTED)
        s.shape(614,y+10,d['min']*11,10,TEAL if i<3 else RUST)
        s.text(839,y+3,81,29,f"{d['min']} min",17,INK,align='r')
    s.text(38,460,874,28,'Recaps and the final read-only desktop review are inside these timeboxes.',15,MUTED)
    for i,d in enumerate(LABS):
        r=d['p' if pres else 'a']
        band=f"LAB {i:02}   /   {d['short'].upper()}     •     {d['range']} MIN"
        s=page(r['notes'],band,r['title'])
        for j,(head,body) in enumerate(r['steps']):
            y=130+112*j
            s.shape(38,y+4,38,38,TEAL if j!=2 else RUST,'ellipse')
            s.text(39,y+9,36,27,str(j+1),17,PAPER,True,align='ctr')
            s.text(95,y,816,34,head,23,INK,True)
            s.text(95,y+36,798,68,body,18,MUTED)
            if j<2:s.shape(94,y+99,812,1,'D5DCD4')
        if i in (0,3,4,5):
            name,sp,sa=d['screen']; track=sp if pres else sa
            s=page(track[4],band+'     /     SCREEN STUDY',track[0])
            s.shape(36,133,602,337,'DFE8E2')
            if name=='config':
                s.pic(name,40,137,594,329,(.315,.258,.315,.17))
            elif name=='log':
                # Two editable detail crops from the same original captured screen.
                s.pic(name,50,141,576,89,(0,0,.657,.864))
                s.pic(name,50,236,576,226,(.667,.424,.019,.237))
            else:s.pic(name,40,137,594,329)
            label(s,662,143,262,track[1],RUST)
            s.text(662,177,261,146,track[2],20,INK,True)
            s.text(662,322,262,149,track[3],17,MUTED)
        if i in (1,2,4):
            diagram(page,d,i,band,pres)
        s=page(r['gate_notes'],band+'     /     CHECKPOINT',r['gate'],DARK)
        s.shape(36,146,439,300,'19494B');s.shape(487,146,437,300,'204348')
        label(s,56,171,397,'ACCEPT WHEN' if pres else 'SHOW THIS',MINT)
        label(s,507,171,393,'IF THE ROOM IS STUCK' if pres else 'IF YOUR CHECK FAILS',GOLD)
        s.text(56,216,391,217,r['proof'],23,PAPER)
        s.text(507,216,393,217,r['rescue'],23,PAPER)
        s.text(37,464,879,32,d['recap'],16,MINT,True)
    return deck

def diagram(page,d,i,band,pres):
    title,notes=d['diagram'][0:2]
    s=page(notes,band+'     /     SYSTEM MAP',title)
    if i==1:
        s.shape(334,125,292,64,DARK);s.text(344,142,272,33,'Chronicle Orchestrator',21,PAPER,True,align='ctr')
        s.shape(479,189,2,44,TEAL);s.shape(143,231,673,2,TEAL)
        for j,(name,artifact) in enumerate(d['diagram'][2]):
            x=38+j*224;s.shape(x+105,233,2,36,TEAL);s.shape(x,268,211,127,'DDEBE3')
            s.text(x+10,287,191,30,name,20,DARK,True,align='ctr')
            s.text(x+10,327,191,60,artifact,16,MUTED,align='ctr')
    elif i==2:
        for j,(who,skill) in enumerate(d['diagram'][2]):
            y=126+j*69;s.shape(38,y,176,53,DARK);s.text(50,y+10,154,33,who,19,PAPER,True)
            s.shape(227,y+17,46,19,TEAL,'rightArrow');s.shape(287,y,634,53,'DDEBE3')
            s.text(304,y+10,597,32,skill,20,DARK,True,font='Consolas')
    else:
        for x,y,w,h in [(184,231,58,3),(240,173,3,126),(240,173,80,3),(240,296,80,3),(527,173,62,3),(587,173,3,126),(527,296,62,3),(587,232,89,3)]:
            s.shape(x,y,w,h,TEAL)
        for x,y,w,h,title,sub in [(36,190,150,87,'Digest','ordered turns'),(319,129,210,88,'Fits one chunk','one final pass'),(319,252,210,88,'Over the limit','map, then synthesize'),(674,190,250,87,'Save Markdown','atomic write')]:
            s.shape(x,y,w,h,'DDEBE3');s.text(x+8,y+13,w-16,31,title,19,DARK,True,align='ctr');s.text(x+7,y+48,w-14,32,sub,15,MUTED,align='ctr')
        s.text(39,369,878,52,'80,000 characters per chunk by default; this is a size heuristic, not a token count.',18,MUTED)
    s.text(37,441,879,50,d['diagram'][3 if pres else 4],18,TEAL,True)

def main():
    missing=[n+'.png' for n in IMAGES if not (SHOTS/(n+'.png')).is_file()]
    if missing: raise SystemExit("Waiting for actual screenshot inputs: "+', '.join(missing))
    with TemporaryDirectory(dir=ROOT/'scripts',prefix='build_decks_stage_') as tmp:
        for role in ('Presenter','Attendee'):
            slides=build(role); target=Path(tmp)/f'Advanced-{role}.pptx'
            save(slides,target)
            with ZipFile(target) as z:
                assert z.testzip() is None
                for n in z.namelist():
                    if n.endswith(('.xml','.rels')):ET.fromstring(z.read(n))
            print(f'{target.name}: {len(slides)} slides with notes; four embedded screens.')
        for target in Path(tmp).glob('*.pptx'):os.replace(target,ROOT/target.name)
if __name__=='__main__':main()
