"""
Synthesizes narration audio for Participant-Explainer and Instructor-Explainer using
Microsoft Foundry `gpt-audio-1.5` Chat Completions API authenticated via Entra ID Service Principal.

SECURITY BOUNDARY:
- Credentials are read ONLY from environment variables:
    FOUNDRY_AUDIO_ENDPOINT (default: https://adamga-8000-resource.services.ai.azure.com/openai/v1/chat/completions)
    FOUNDRY_AUDIO_MODEL    (default: gpt-audio-1.5)
    AZURE_TENANT_ID
    AZURE_CLIENT_ID
    AZURE_CLIENT_SECRET
- No tokens, client secrets, or raw credentials are ever written to disk, logs, manifests, subtitles, or transcripts.
"""
from __future__ import annotations

import base64
import hashlib
import json
import math
import os
import subprocess
import sys
import time
import wave
from pathlib import Path

import requests

from storyboards import ALL_STORYBOARDS

SCRIPT_DIR = Path(__file__).resolve().parent
CONTENT_DIR = SCRIPT_DIR.parent
CACHE_AUDIO_DIR = CONTENT_DIR / ".cache" / "audio"
TRANSCRIPTS_DIR = CONTENT_DIR / "transcripts"


def acquire_entra_token(tenant_id: str, client_id: str, client_secret: str) -> str:
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    resp = requests.post(
        token_url,
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://cognitiveservices.azure.com/.default",
        },
        timeout=25,
    )
    if not resp.ok:
        raise RuntimeError(f"Entra ID token request failed ({resp.status_code})")
    data = resp.json()
    tok = data.get("access_token")
    if not tok:
        raise RuntimeError("Entra ID response did not include access_token")
    return tok


def synthesize_via_schannel_fallback(endpoint: str, token: str, payload: dict) -> dict:
    """
    Uses Windows PowerShell Invoke-RestMethod (native Windows SChannel TLS + WinHTTP proxy stack)
    if Python's OpenSSL socket hits a proxy TLS handshake EOF. Passes token & payload strictly via
    child-process environment variables so nothing sensitive ever appears on a command line.
    """
    ps_script = (
        "$ErrorActionPreference = 'Stop'; "
        "$headers = @{ Authorization = ('Bearer ' + $env:_TTS_BEARER); 'Content-Type' = 'application/json' }; "
        "$resp = Invoke-RestMethod -Method Post -Uri $env:_TTS_ENDPOINT -Headers $headers -Body $env:_TTS_BODY -TimeoutSec 90; "
        "$resp | ConvertTo-Json -Depth 10 -Compress"
    )
    env = os.environ.copy()
    env["_TTS_BEARER"] = token
    env["_TTS_ENDPOINT"] = endpoint
    env["_TTS_BODY"] = json.dumps(payload)
    proc = subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
        env=env,
        capture_output=True,
        text=True,
        timeout=105,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"SChannel TTS request failed (exit {proc.returncode}): {proc.stderr.strip()[:240]}")
    return json.loads(proc.stdout)


def synthesize_segment_wav(
    session: requests.Session,
    endpoint: str,
    token: str,
    model: str,
    voice: str,
    narration_text: str,
    dest_wav: Path,
) -> str:
    payload = {
        "model": model,
        "modalities": ["text", "audio"],
        "audio": {"voice": voice, "format": "wav"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an upbeat, warm, broadcast-quality workshop narrator. "
                    "Speak the user's exact narration script verbatim with clear, engaging, lively pacing and natural enthusiasm. "
                    "Do NOT add, omit, answer, or paraphrase any words—read the exact script provided."
                ),
            },
            {"role": "user", "content": narration_text},
        ],
    }

    data = None
    for attempt in range(1, 4):
        try:
            resp = session.post(
                endpoint,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=75,
            )
            if not resp.ok:
                raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:240]}")
            data = resp.json()
            break
        except (requests.exceptions.SSLError, requests.exceptions.ConnectionError):
            if attempt == 1:
                # Immediately switch to Windows SChannel stack which handles corporate TLS cleanly
                data = synthesize_via_schannel_fallback(endpoint, token, payload)
                break
            time.sleep(1.2 * attempt)

    if not data:
        raise RuntimeError("No response returned from gpt-audio-1.5 endpoint")

    msg = (data.get("choices") or [{}])[0].get("message") or {}
    audio_obj = msg.get("audio") or {}
    b64_audio = audio_obj.get("data")
    if not b64_audio:
        raise RuntimeError("Response from gpt-audio-1.5 did not contain message.audio.data")

    raw_bytes = normalize_wav_header(base64.b64decode(b64_audio))
    dest_wav.parent.mkdir(parents=True, exist_ok=True)
    tmp_wav = dest_wav.with_suffix(".tmp.wav")
    tmp_wav.write_bytes(raw_bytes)
    tmp_wav.replace(dest_wav)
    return (audio_obj.get("transcript") or narration_text).strip()


def normalize_wav_header(raw_bytes: bytes) -> bytes:
    """
    gpt-audio-1.5 returns streaming RIFF WAV headers where data chunk length is 0xFFFFFFFF.
    Rewrite a clean standard RIFF WAV header matching the exact PCM payload byte length.
    """
    import io

    with wave.open(io.BytesIO(raw_bytes), "rb") as rf:
        n_channels = rf.getnchannels()
        sampwidth = rf.getsampwidth()
        framerate = rf.getframerate()

    data_idx = raw_bytes.find(b"data")
    pcm = raw_bytes[data_idx + 8 :] if data_idx != -1 else raw_bytes[44:]
    frame_bytes = n_channels * sampwidth
    pcm = pcm[: (len(pcm) // frame_bytes) * frame_bytes]

    out_buf = io.BytesIO()
    with wave.open(out_buf, "wb") as wf:
        wf.setnchannels(n_channels)
        wf.setsampwidth(sampwidth)
        wf.setframerate(framerate)
        wf.writeframes(pcm)
    return out_buf.getvalue()


def inspect_wav_metrics(wav_path: Path, fps: int = 30) -> tuple[float, list[float]]:
    """Returns (duration_seconds, normalized_per_frame_amplitude_envelope) and ensures standard RIFF header."""
    import numpy as np

    raw = wav_path.read_bytes()
    clean_raw = normalize_wav_header(raw)
    if clean_raw != raw:
        wav_path.write_bytes(clean_raw)

    with wave.open(str(wav_path), "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        pcm = wf.readframes(n_frames)

    real_frames = len(pcm) // max(1, n_channels * sampwidth)
    duration = real_frames / float(framerate)
    if sampwidth == 2:
        arr = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
    elif sampwidth == 4:
        arr = np.frombuffer(pcm, dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        arr = np.zeros(max(1, n_frames), dtype=np.float32)

    if n_channels > 1:
        arr = arr.reshape(-1, n_channels).mean(axis=1)

    total_video_frames = max(1, int(math.ceil(duration * fps)))
    samples_per_vf = max(1, int(framerate / fps))
    env = []
    for vf in range(total_video_frames):
        s0 = vf * samples_per_vf
        s1 = min(len(arr), s0 + samples_per_vf)
        if s0 >= len(arr):
            env.append(0.0)
        else:
            rms = float(np.sqrt(np.mean(arr[s0:s1] ** 2)))
            env.append(round(min(1.0, rms * 4.2), 4))
    return duration, env


def format_ts_srt(sec: float) -> str:
    ms_total = max(0, int(round(sec * 1000)))
    hh = ms_total // 3_600_000
    rem = ms_total % 3_600_000
    mm = rem // 60_000
    rem %= 60_000
    ss = rem // 1000
    ms = rem % 1000
    return f"{hh:02d}:{mm:02d}:{ss:02d},{ms:03d}"


def format_ts_vtt(sec: float) -> str:
    return format_ts_srt(sec).replace(",", ".")


def split_caption_chunks(text: str, start_sec: float, end_sec: float, max_words: int = 13) -> list[dict]:
    """Splits a scene's narration into crisp, readable lower-third/SRT caption chunks proportional to character count."""
    import re

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]
    phrases: list[str] = []
    for sent in sentences:
        words = sent.split()
        if len(words) <= max_words:
            phrases.append(sent)
        else:
            step = max(7, min(max_words, int(math.ceil(len(words) / math.ceil(len(words) / max_words)))))
            for idx in range(0, len(words), step):
                phrases.append(" ".join(words[idx : idx + step]))

    total_chars = max(1, sum(len(p) for p in phrases))
    span = max(0.2, end_sec - start_sec)
    cursor = start_sec
    chunks = []
    for i, ph in enumerate(phrases):
        dur = span * (len(ph) / total_chars) if i < len(phrases) - 1 else (end_sec - cursor)
        c_start = round(cursor, 3)
        c_end = round(cursor + dur, 3)
        chunks.append({"start": c_start, "end": c_end, "text": ph})
        cursor += dur
    return chunks


def write_subtitles_and_transcript(board: dict, scene_manifests: list[dict], total_duration: float, narration_source: str):
    all_cues = []
    for sm in scene_manifests:
        all_cues.extend(sm["captions"])

    srt_lines = []
    vtt_lines = ["WEBVTT", ""]
    for idx, cue in enumerate(all_cues, start=1):
        srt_lines.append(str(idx))
        srt_lines.append(f"{format_ts_srt(cue['start'])} --> {format_ts_srt(cue['end'])}")
        srt_lines.append(cue["text"])
        srt_lines.append("")

        vtt_lines.append(str(idx))
        vtt_lines.append(f"{format_ts_vtt(cue['start'])} --> {format_ts_vtt(cue['end'])}")
        vtt_lines.append(cue["text"])
        vtt_lines.append("")

    (CONTENT_DIR / board["output_srt"]).write_text("\n".join(srt_lines), encoding="utf-8")
    (CONTENT_DIR / board["output_vtt"]).write_text("\n".join(vtt_lines), encoding="utf-8")

    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    mins = int(total_duration // 60)
    secs = total_duration - mins * 60
    md = [
        f"# {board['title']} — Full Narration Transcript",
        "",
        f"- **Video File:** `{board['output_mp4']}`",
        f"- **Subtitles:** `{board['output_srt']}` / `{board['output_vtt']}`",
        f"- **TTS Model & Voice:** {narration_source}",
        f"- **Total Duration:** `{mins}m {secs:04.1f}s` (`{total_duration:.2f}s`)",
        "",
        "---",
        "",
    ]
    for idx, sm in enumerate(scene_manifests, start=1):
        md.append(f"## Scene {idx}: {sm['headline']} (`{format_ts_vtt(sm['start_sec'])[:-4]} – {format_ts_vtt(sm['end_sec'])[:-4]}`)")
        md.append("")
        md.append(sm["narration"])
        md.append("")

    (CONTENT_DIR / board["output_transcript"]).write_text("\n".join(md), encoding="utf-8")


def synthesize_windows_wav(voice: str, narration: str, wav_path: Path):
    env = dict(os.environ, CHRONICLE_TTS_TEXT=narration, CHRONICLE_TTS_VOICE=voice,
               CHRONICLE_TTS_WAV=str(wav_path))
    subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", """
        $ErrorActionPreference = 'Stop'
        Add-Type -AssemblyName System.Speech
        $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
        try {
            $speaker.SelectVoice($env:CHRONICLE_TTS_VOICE)
            $speaker.SetOutputToWaveFile($env:CHRONICLE_TTS_WAV)
            $speaker.Speak($env:CHRONICLE_TTS_TEXT)
        } finally { $speaker.Dispose() }
    """], env=env, check=True)


def build_variant_tts(variant: str, endpoint: str, model: str, token: str, *, local: bool = False):
    board = ALL_STORYBOARDS[variant]
    voice = {"participant": "Microsoft Zira Desktop", "instructor": "Microsoft David Desktop"}[variant] if local else board["voice"]
    CACHE_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    http_sess = requests.Session()
    lead_pad = 0.35
    tail_pad = 0.55
    cursor = 0.0
    scene_manifests = []

    print(f"\n=== Synthesizing '{variant}' ({len(board['scenes'])} scenes, voice='{voice}', model='{model}') ===")
    for idx, scene in enumerate(board["scenes"], start=1):
        narration = scene["narration"].strip()
        digest = hashlib.sha256(f"{model}|{voice}|{narration}".encode("utf-8")).hexdigest()[:14]
        wav_path = CACHE_AUDIO_DIR / f"{variant}_{idx:02d}_{scene['id']}_{digest}.wav"

        if not wav_path.exists() or wav_path.stat().st_size < 1024:
            t0 = time.time()
            if local:
                synthesize_windows_wav(voice, narration, wav_path)
                transcript = narration
            else:
                transcript = synthesize_segment_wav(http_sess, endpoint, token, model, voice, narration, wav_path)
            elapsed = time.time() - t0
            print(f"  [{variant} {idx}/{len(board['scenes'])}] {scene['id']} synthesized in {elapsed:.1f}s -> {wav_path.name}")
        else:
            transcript = narration
            print(f"  [{variant} {idx}/{len(board['scenes'])}] {scene['id']} reused cached WAV -> {wav_path.name}")

        wav_dur, env = inspect_wav_metrics(wav_path, fps=30)
        scene_dur = round(lead_pad + wav_dur + tail_pad, 3)
        start_sec = round(cursor, 3)
        end_sec = round(cursor + scene_dur, 3)
        captions = split_caption_chunks(narration, round(start_sec + lead_pad, 3), round(start_sec + lead_pad + wav_dur, 3))

        scene_manifests.append({
            "index": idx,
            "id": scene["id"],
            "headline": scene["headline"],
            "wav_file": str(wav_path.relative_to(CONTENT_DIR)),
            "lead_pad": lead_pad,
            "wav_duration": round(wav_dur, 3),
            "tail_pad": tail_pad,
            "scene_duration": scene_dur,
            "start_sec": start_sec,
            "end_sec": end_sec,
            "narration": narration,
            "spoken_transcript": transcript,
            "envelope_30fps": env,
            "captions": captions,
        })
        cursor = end_sec

    total_duration = round(cursor, 3)
    manifest = {
        "variant": variant,
        "title": board["title"],
        "model": model,
        "voice": voice,
        "fps": 30,
        "total_duration": total_duration,
        "scenes": scene_manifests,
    }
    manifest_path = CONTENT_DIR / ".cache" / f"manifest-{variant}.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    source = f"Windows Speech (`{voice}`)" if local else f"Microsoft Foundry `{model}` (`{voice}`)"
    write_subtitles_and_transcript(board, scene_manifests, total_duration, source)
    print(f"Saved {manifest_path.name} + SRT/VTT/Transcript (total duration = {total_duration:.2f}s)")


def main():
    args = sys.argv[1:]
    local = "--windows-voice" in args
    targets = [arg for arg in args if arg != "--windows-voice"] or ["participant", "instructor"]
    for variant in targets:
        if variant not in ALL_STORYBOARDS:
            raise ValueError(f"Unknown storyboard variant: {variant}")
    if local:
        for variant in targets:
            build_variant_tts(variant, "", "windows-speech", "", local=True)
        return

    endpoint = os.environ.get(
        "FOUNDRY_AUDIO_ENDPOINT",
        "https://adamga-8000-resource.services.ai.azure.com/openai/v1/chat/completions",
    ).strip()
    model = os.environ.get("FOUNDRY_AUDIO_MODEL", "gpt-audio-1.5").strip()
    tenant_id = os.environ.get("AZURE_TENANT_ID", "").strip()
    client_id = os.environ.get("AZURE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("AZURE_CLIENT_SECRET", "").strip()

    # Only acquire Entra token if at least one scene is not yet cached
    needs_network = False
    for variant in targets:
        board = ALL_STORYBOARDS[variant]
        for idx, scene in enumerate(board["scenes"], start=1):
            digest = hashlib.sha256(f"{model}|{board['voice']}|{scene['narration'].strip()}".encode("utf-8")).hexdigest()[:14]
            wav_path = CACHE_AUDIO_DIR / f"{variant}_{idx:02d}_{scene['id']}_{digest}.wav"
            if not wav_path.exists() or wav_path.stat().st_size < 1024:
                needs_network = True
                break

    token = ""
    if needs_network:
        if not (tenant_id and client_id and client_secret):
            print(
                "Missing AZURE_TENANT_ID, AZURE_CLIENT_ID, or AZURE_CLIENT_SECRET environment variables.",
                file=sys.stderr,
            )
            sys.exit(1)
        token = acquire_entra_token(tenant_id, client_id, client_secret)

    for variant in targets:
        build_variant_tts(variant, endpoint, model, token)


if __name__ == "__main__":
    main()
