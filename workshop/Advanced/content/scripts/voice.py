"""Generate a scene's PCM WAV. Only the supplied narration goes to the audio model."""
import base64
import io
import json
import os
import subprocess
import urllib.error
import urllib.request
import wave
from pathlib import Path


def windows_post(uri, payload):
    curl = Path(os.environ["SystemRoot"]) / "System32" / "curl.exe"
    # Schannel uses Windows TLS. Expand the token inside curl, not on its command line.
    result = subprocess.run([
        str(curl), "-q", "--silent", "--proto", "=https", "--max-time", "120",
        "--variable", "%CHRONICLE_AUDIO_TOKEN",
        "--expand-header", "Authorization: Bearer {{CHRONICLE_AUDIO_TOKEN}}",
        "--header", "Content-Type: application/json", "--data-binary", "@-",
        "--write-out", "\\n%{http_code}", uri,
    ], input=json.dumps(payload).encode(), capture_output=True)
    if result.returncode:
        raise RuntimeError(f"Foundry Windows TLS request failed (curl exit {result.returncode}).")
    body, _, status = result.stdout.rpartition(b"\n")
    if status != b"200":
        raise RuntimeError(f"Foundry narration HTTP {int(status)}; no audio generated.")
    return json.loads(body)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def narrate(text: str, dest_wav: Path) -> str:
    dest_wav = Path(dest_wav)
    dest_wav.parent.mkdir(parents=True, exist_ok=True)
    mode = os.environ.get("CHRONICLE_VOICE", "foundry")
    if mode == "preview":
        subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", """
            $ErrorActionPreference = 'Stop'
            Add-Type -AssemblyName System.Speech
            $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
            try {
                $s.SelectVoice('Microsoft Zira Desktop')
                $s.SetOutputToWaveFile($env:SCENE_PATH)
                $s.Speak($env:SCENE_TEXT)
            } finally { $s.Dispose() }
            """], check=True,
            env={**os.environ, "SCENE_PATH": str(dest_wav.resolve()), "SCENE_TEXT": text})
        return "Windows Speech preview (Zira)"
    if mode != "foundry":
        raise ValueError("CHRONICLE_VOICE must be foundry or preview")
    token = os.environ.get("CHRONICLE_AUDIO_TOKEN")
    if not token:
        raise RuntimeError("Sign in with build_foundry_audio.ps1 or select explicit preview mode.")
    model = "gpt-audio-1.5-2"
    uri = "https://agfoundrymcpseastus2-resource.services.ai.azure.com/openai/v1/chat/completions"
    payload = {"model": model, "modalities": ["text", "audio"],
               "audio": {"voice": "alloy", "format": "wav"},
               "messages": [{"role": "system", "content": "Read the provided workshop voiceover verbatim, as a warm, clear technical instructor. No preamble."},
                            {"role": "user", "content": text}]}
    if os.name == "nt":
        data = windows_post(uri, payload)
    else:
        request = urllib.request.Request(uri, json.dumps(payload).encode(),
                                         headers={"Authorization": "Bearer " + token,
                                                  "Content-Type": "application/json"})
        try:
            with urllib.request.build_opener(NoRedirect).open(request, timeout=120) as response:
                data = json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"Foundry narration HTTP {error.code}; check data-plane access, deployment and quota.") from None
    audio = data["choices"][0]["message"]["audio"]
    raw = base64.b64decode(audio["data"], validate=True)
    with wave.open(io.BytesIO(raw), "rb") as source:
        # Streaming RIFF headers can declare a larger length than the payload.
        frames = source.readframes(len(raw) // (source.getnchannels() * source.getsampwidth()))
        if not frames:
            raise ValueError("Empty Foundry audio response")
        if len(frames) % (source.getnchannels() * source.getsampwidth()):
            raise ValueError("Incomplete PCM frame in Foundry audio response")
        with wave.open(str(dest_wav), "wb") as output:
            output.setnchannels(source.getnchannels())
            output.setsampwidth(source.getsampwidth())
            output.setframerate(source.getframerate())
            output.writeframes(frames)
    return f"Microsoft Foundry ({model}, alloy)"
