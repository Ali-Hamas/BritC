/**
 * Voice Service — wraps the browser Web Speech API.
 *
 * Provides:
 *  - VoiceService.startListening(...)  → microphone → text
 *  - VoiceService.stopListening()
 *  - VoiceService.speak(text, opts?)    → text → spoken audio
 *  - VoiceService.cancelSpeak()
 *  - VoiceService.isSupported()
 *
 * All methods degrade gracefully on unsupported browsers (older Firefox, etc).
 */

type Recognition = any; // SpeechRecognition is not in the default TS lib

interface ListenOptions {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (msg: string) => void;
  onEnd?: () => void;
  lang?: string;
}

let activeRecognition: Recognition | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

function getRecognitionCtor(): any | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export const VoiceService = {
  /** Returns true if both speech recognition AND synthesis are usable. */
  isSupported(): { recognition: boolean; synthesis: boolean } {
    return {
      recognition: !!getRecognitionCtor(),
      synthesis: typeof window !== 'undefined' && 'speechSynthesis' in window,
    };
  },

  /**
   * Start microphone listening. Calls onResult continuously with interim
   * transcripts, then once more with isFinal=true at the end of an utterance.
   */
  startListening(opts: ListenOptions): boolean {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      opts.onError?.('Voice input is not supported in this browser.');
      return false;
    }

    // Stop any prior session
    this.stopListening();

    const rec: Recognition = new Ctor();
    rec.lang = opts.lang || 'en-GB';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let transcript = '';
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      opts.onResult(transcript, isFinal);
    };

    rec.onerror = (e: any) => {
      const msg =
        e.error === 'not-allowed'
          ? 'Microphone permission denied.'
          : e.error === 'no-speech'
          ? 'No speech detected — try again.'
          : `Voice error: ${e.error || 'unknown'}`;
      opts.onError?.(msg);
    };

    rec.onend = () => {
      activeRecognition = null;
      opts.onEnd?.();
    };

    try {
      rec.start();
      activeRecognition = rec;
      return true;
    } catch (err: any) {
      opts.onError?.(err?.message || 'Failed to start microphone.');
      return false;
    }
  },

  stopListening(): void {
    if (activeRecognition) {
      try { activeRecognition.stop(); } catch { /* ignore */ }
      activeRecognition = null;
    }
  },

  isListening(): boolean {
    return activeRecognition !== null;
  },

  /**
   * Speak text aloud. Cancels any prior utterance first.
   * Strips markdown, code fences, and action JSON before speaking.
   */
  speak(
    text: string,
    opts: { lang?: string; rate?: number; pitch?: number; onEnd?: () => void; onError?: (m: string) => void } = {}
  ): boolean {
    if (!('speechSynthesis' in window)) {
      opts.onError?.('Voice playback is not supported in this browser.');
      return false;
    }

    this.cancelSpeak();

    const cleaned = stripForSpeech(text);
    if (!cleaned.trim()) {
      opts.onEnd?.();
      return false;
    }

    const u = new SpeechSynthesisUtterance(cleaned);
    u.lang = opts.lang || 'en-GB';
    u.rate = opts.rate ?? 1;
    u.pitch = opts.pitch ?? 1;

    // Pick a British voice if one exists, else first available
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => /en-GB/i.test(v.lang) && /female|natural|google|samantha|fiona/i.test(v.name)) ||
      voices.find(v => /en-GB/i.test(v.lang)) ||
      voices.find(v => /en[-_]US/i.test(v.lang)) ||
      voices[0];
    if (preferred) u.voice = preferred;

    u.onend = () => {
      activeUtterance = null;
      opts.onEnd?.();
    };
    u.onerror = (e: any) => {
      activeUtterance = null;
      opts.onError?.(`Voice playback error: ${e.error || 'unknown'}`);
    };

    activeUtterance = u;
    window.speechSynthesis.speak(u);
    return true;
  },

  cancelSpeak(): void {
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    activeUtterance = null;
  },

  isSpeaking(): boolean {
    return activeUtterance !== null || (typeof window !== 'undefined' && window.speechSynthesis?.speaking);
  },
};

function stripForSpeech(text: string): string {
  return text
    .replace(/\[\[ACTION:.*?\]\]/gs, '')          // remove tool-call payloads
    .replace(/```[\s\S]*?```/g, ' code block ')   // skip code blocks
    .replace(/`([^`]+)`/g, '$1')                  // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '')              // images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')           // links → label only
    .replace(/[*_~#>]+/g, '')                     // markdown markers
    .replace(/\n{2,}/g, '. ')                     // paragraphs → pauses
    .replace(/\s+/g, ' ')
    .trim();
}
