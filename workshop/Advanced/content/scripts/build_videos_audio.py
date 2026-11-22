"""Cache sentence takes by mode, adapter contents, and text. Preserve provider labels."""
import hashlib
import json
import os
import re
import sys
import wave
from pathlib import Path

sys.dont_write_bytecode = True
from stories import STORIES, shots
from voice import narrate

CACHE = Path(__file__).resolve().parents[1] / '.cache' / 'video'
def takes(speech):
    mode = os.environ.get('CHRONICLE_VOICE', 'foundry')
    digest = hashlib.sha256(Path(__file__).with_name('voice.py').read_bytes()).hexdigest()
    for text in re.split(r'(?<=[.?!])\s+(?=[A-Z])', speech):
        key = hashlib.sha256(json.dumps([mode, digest, text]).encode()).hexdigest()
        folder = CACHE / 'voice' / mode
        folder.mkdir(parents=True, exist_ok=True)
        wav = folder / (key + '.wav')
        label = wav.with_suffix('.json')
        if not (wav.exists() and label.exists()):
            partial = wav.with_suffix('.part.wav')
            provider = narrate(text, partial)
            with wave.open(str(partial), 'rb') as w:
                assert w.getnframes() and w.getsampwidth() == 2
            partial.replace(wav)
            label.write_text(json.dumps(provider), encoding='utf-8')
        yield text, wav, json.loads(label.read_text(encoding='utf-8'))

if __name__ == '__main__':
    for stem in STORIES:
        for *_, speech in shots(stem):
            list(takes(speech))
        print('Voice ready:', stem, flush=True)
