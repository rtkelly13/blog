# NeanderBonk voice — Approach C: a real speaker embedding, in the browser

## Goal

Approaches A (loudness gate, `levelMeter.ts`) and B (pitch/timbre profile,
`voiceProfile.ts`) are classical baselines, and `voiceProfile.ts` says the
honest thing out loud: nothing short of a real speaker-embedding model will
separate two similar adult voices. Approach C is that model. Enrol the poet
from a few seconds of speech, embed later segments with a d-vector-style
network (à la the VoiceFilter speaker encoder), and answer one question by
cosine similarity: *is the current speech the enrolled poet?* Not
diarization — target-speaker verification on live mic audio, fully
client-side, self-hosted, feeding the same asymmetric referee (false
accusation is the worst outcome, so `uncertain` stays a first-class answer).

## Candidate stacks

| Stack | What it provides | Model | Size | License | CSP / self-hosting fit |
| --- | --- | --- | --- | --- | --- |
| **onnxruntime-web** (npm `onnxruntime-web`) | Raw ONNX inference in WASM/WebGPU; we hand-roll fbank + cosine | 3D-Speaker ERes2Net en_voxceleb (`3dspeaker_speech_eres2net_sv_en_voxceleb_16k.onnx`, from sherpa-onnx's model release) | ~25 MB model + ~11 MB ort wasm | Apache-2.0 (ort, 3D-Speaker code and weights) | Everything under `public/`; wasm needs `'unsafe-eval'` in `script-src` — already present |
| sherpa-onnx WASM (npm `sherpa-onnx`) | C API compiled with Emscripten; `createSpeakerEmbeddingExtractor` exists in the Node/JS API | Same 3D-Speaker / WeSpeaker `.onnx` files | ~25–30 MB model + wasm runtime | Apache-2.0 | Browser wasm builds are per-task (asr/tts/vad/diarization); only the diarization build ships the embedding extractor, wrapped in `createOfflineSpeakerDiarization`. Embedding-only browser use means a custom wasm build. Models load via Emscripten FS, not URLs |
| transformers.js (npm `@huggingface/transformers`) | `audio-xvector` architecture support; `Xenova/wavlm-base-plus-sv` has ONNX weights on the Hub | WavLM-Base+ SV | 402 MB fp32 / 102 MB int8-quantized | Code Apache-2.0; **model card carries no explicit license** (upstream microsoft repo is MIT for code only) | Self-hostable under `public/` with `env.localModelPath`, but the download alone disqualifies it on a phone |
| Picovoice Eagle Web (npm `@picovoice/eagle-web`) | Turn-key enrol → score speaker recognition, on-device | Proprietary Eagle model | small (undisclosed) | SDK Apache-2.0, but requires a Picovoice **AccessKey** — telemetry ping, free-tier user caps, terms unfit for an open personal blog experiment | Key requirement conflicts with a fully self-hosted, no-account demo |

Alternative models from the same sherpa-onnx release, all drop-in for the
recommended stack: WeSpeaker `wespeaker_en_voxceleb_CAM++.onnx` (28 MB,
Apache-2.0 code, VoxCeleb-trained) and NeMo `nemo_en_titanet_small.onnx`
(38 MB, CC-BY-4.0).

## Recommendation

**onnxruntime-web + `3dspeaker_speech_eres2net_sv_en_voxceleb_16k.onnx`.**

- `npm i onnxruntime-web`; copy its `ort-wasm-simd-threaded.*` artefacts and
  the model into `public/experiments/neanderbonk/`, point
  `ort.env.wasm.wasmPaths` at that directory. Nothing leaves the origin, so
  `connect-src 'self'` and `default-src 'self'` are already satisfied.
- The model takes 80-dim log-mel filterbank frames at 16 kHz and emits a
  fixed-length embedding; enrolment is "average the enrolment embeddings",
  verification is one cosine. Neither sherpa's manager nor a library is
  needed — the maths is ~15 lines, and hand-rolling it keeps the module pure
  and unit-testable like `voiceProfile.ts`.
- The one real build cost is the fbank frontend (STFT → mel filterbank →
  log), ~100 lines of pure TypeScript, testable against synthesised tones.
  It must match Kaldi conventions (25 ms window, 10 ms hop, povey window) or
  the embeddings degrade — verify against sherpa-onnx's Python output once.

## Integration sketch

New pure module `components/experiments/neanderbonk/voice/speakerEmbedding.ts`,
mirroring the `voiceProfile.ts` shape so the lab page can race all three:

```ts
export type SpeakerVerifier = {
  /** Feed enrolment audio; call finish to freeze the centroid. */
  enrol(frames: Float32Array, sampleRate: number): void;
  finishEnrolment(): void;
  /** Cosine similarity to the enrolled poet, or null below the RMS floor. */
  score(frames: Float32Array, sampleRate: number): Promise<number | null>;
  classify(score: number | null): 'poet' | 'other' | 'uncertain';
};

export async function createSpeakerVerifier(
  modelUrl: string, // '/experiments/neanderbonk/eres2net-en-voxceleb.onnx'
): Promise<SpeakerVerifier> { /* ort.InferenceSession.create(modelUrl) … */ }
```

Internally: resample the AnalyserNode/worklet PCM to 16 kHz, buffer ~1.5 s
windows, fbank → session.run → L2-normalise → cosine against the enrolment
centroid. The UI layer already owns `getUserMedia` for the level meter; the
same stream feeds this module in parallel, and scoring runs at ~1 Hz — off
the render path, since `score` is async. `classify` keeps the two-threshold
band from `classifySpeaker` (e.g. poet ≥ 0.55, other ≤ 0.35, else
uncertain — thresholds to be tuned on the lab page, not guessed).

Cost estimate: ~36 MB first-visit download (25 MB model + 11 MB wasm, both
cacheable), and on a mid-range phone with SIMD WASM roughly 30–80 ms to
embed a 1.5 s window — comfortably real time at a 1 Hz scoring cadence,
and per the EXPERIMENTS rule the whole cost lands on this route alone
(dynamic import, no shared chunks).

## Risks

- **Weights provenance.** The en models are VoxCeleb-trained; 3D-Speaker
  ships them Apache-2.0, but VoxCeleb's own terms are research-flavoured.
  Fine for a non-commercial blog experiment; worth a footnote on the page.
- **Size.** 36 MB is a real ask on cellular; needs an explicit opt-in
  download button, not an auto-fetch on route load.
- **Phone performance.** The estimate above is unmeasured; ERes2Net is
  heavier per frame than CAM++ (swap to the 28 MB CAM++ model if scoring
  stalls). Threads require cross-origin isolation headers we don't set, so
  plan for single-threaded SIMD.
- **Fbank fidelity.** A subtly wrong mel frontend produces plausible-looking
  but useless embeddings; the parity test against a reference implementation
  is not optional.
- **Overlapping speech is still unsolved.** Two voices at once embed as a
  blend that matches nobody — same failure as Approach B, and the same
  answer: the blend scores land in the `uncertain` band and the referee
  stays silent rather than accusing.
