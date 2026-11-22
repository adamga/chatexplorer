"""Append an ISO-BMFF tx3g English subtitle track, preserving existing media offsets."""
from struct import pack, unpack_from

def box(kind, body):
    return pack('>I4s', 8+len(body), kind.encode('ascii')) + body

def atoms(blob):
    i = 0
    while i < len(blob):
        n, kind = unpack_from('>I4s', blob, i)
        if not 8 <= n <= len(blob)-i:
            raise ValueError('Expected a bounded 32-bit ISO box')
        yield kind.decode(), i, blob[i+8:i+n]
        i += n

def one(blob, kind):
    return next(body for name, _, body in atoms(blob) if name == kind)

def u32(*values):
    return pack('>'+'I'*len(values), *values)

def timed_track(src, output, cues):
    data = bytearray(src.read_bytes())
    _, old, moov = next(x for x in atoms(data) if x[0]=='moov')
    mvhd = one(moov, 'mvhd')
    scale = unpack_from('>I', mvhd, 12 if mvhd[0]==0 else 20)[0]
    trackid = int.from_bytes(mvhd[-4:], 'big')
    frames = cues[-1][1]
    duration = round(frames * scale / 24)
    ms = lambda f: round(f*1000/24)
    payload = [c.encode('utf-8') for _,_,c in cues]
    samples = [pack('>H', len(s))+s for s in payload]
    offsets = [len(data)+8]
    matrix = u32(65536,0,0,0,65536,0,0,0,1<<30)
    tkhd = box('tkhd', u32(3,0,0,trackid,0,duration,0,0,0,0)+matrix+u32(1920<<16,1080<<16))
    mdhd = box('mdhd', u32(0,0,0,1000,ms(frames))+pack('>HH',0x15c7,0)) # eng
    hdlr = box('hdlr', u32(0,0)+b'sbtl'+bytes(12)+b'English captions\0')
    url = box('url ', u32(1))
    dinf = box('dinf',box('dref',u32(0,1)+url))
    style = pack('>HHHBBI',0,0,1,0,36,0xffffffff)
    entry = box('tx3g', bytes(6)+pack('>HIbbIhhhh',1,0,0,-1,0x000000bb,884,120,1028,1800)
                +style+box('ftab',pack('>HHB',1,1,5)+b'Arial'))
    stsd = box('stsd',u32(0,1)+entry)
    stts = box('stts',u32(0,len(cues))+b''.join(u32(1,ms(b)-ms(a)) for a,b,_ in cues))
    stsc = box('stsc',u32(0,1,1,len(samples),1))
    stsz = box('stsz',u32(0,0,len(samples),*map(len,samples)))
    stco = box('stco',u32(0,1,*offsets))
    minf=box('minf',box('nmhd',u32(0))+dinf+box('stbl',stsd+stts+stsc+stsz+stco))
    trak=box('trak',tkhd+box('mdia',mdhd+hdlr+minf))
    children=[box(k,(v[:-4]+u32(trackid+1) if k=='mvhd' else v)) for k,_,v in atoms(moov)]
    data[old+4:old+8] = b'free'
    output.write_bytes(data+box('mdat',b''.join(samples))+box('moov',b''.join(children)+trak))
    # Parse the on-disk subtitle sample table, start offset, language, and durations.
    saved=output.read_bytes()
    tr=[v for k,_,v in atoms(one(saved,'moov')) if k=='trak'][-1]
    md=one(tr,'mdia')
    assert one(md,'hdlr')[8:12]==b'sbtl' and one(md,'mdhd')[-4:-2]==b'\x15\xc7'
    table=one(one(md,'minf'),'stbl')
    assert one(table,'stsd')[12:16]==b'tx3g'
    pos=unpack_from('>I',one(table,'stco'),8)[0]
    sizes=one(table,'stsz')
    for i,(_,_,caption) in enumerate(cues):
        n=unpack_from('>I',sizes,12+i*4)[0]
        assert saved[pos+2:pos+n].decode()==caption
        pos+=n
    assert sum(unpack_from('>I',one(table,'stts'),12+i*8)[0] for i in range(len(cues)))==ms(frames)
