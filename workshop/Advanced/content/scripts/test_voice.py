import base64
import io
import os
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch

from voice import narrate


@unittest.skipUnless(os.name == "nt", "Windows production transport")
class FoundryWaveTest(unittest.TestCase):
    def test_fixed_and_streaming_headers_preserve_pcm(self):
        pcm = bytes(range(128)) * 3
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setparams((2, 2, 24000, 0, "NONE", "not compressed"))
            w.writeframes(pcm)
        for streaming in (False, True):
            raw = bytearray(buf.getvalue())
            if streaming:
                raw[4:8] = raw[40:44] = b"\xff" * 4
            audio = {"data": base64.b64encode(raw).decode()}
            with self.subTest(streaming=streaming), tempfile.TemporaryDirectory() as d, \
                    patch.dict(os.environ, CHRONICLE_AUDIO_TOKEN="mock", CHRONICLE_VOICE="foundry"), \
                    patch("voice.windows_post", return_value={"choices": [{"message": {"audio": audio}}]}):
                dest = Path(d) / "scene.wav"
                narrate("Test", dest)
                with wave.open(str(dest), "rb") as w:
                    self.assertEqual(w.getparams()[:4], (2, 2, 24000, len(pcm) // 4))
                    self.assertEqual(w.readframes(w.getnframes()), pcm)
