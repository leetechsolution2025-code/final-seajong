import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAvatarInitials } from '../../utils/avatar';
import { Offcanvas } from '../common/Offcanvas';

export interface SalesStaffMember {
  id: string;
  code?: string;
  name: string;
  position: string;
  department: string;
  departmentCode?: string;
  phone?: string;
  email?: string;
  avatarText?: string;
}

interface AttachmentItem {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  duration?: number;
}

interface MessageItem {
  id: string;
  participantId: string;
  content: string;
  attachments?: AttachmentItem[];
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  senderId: string;
  senderEmployeeCode?: string | null;
  senderName: string;
  senderPosition?: string | null;
  senderDepartment?: string | null;
  senderDepartmentCode?: string | null;
  isSentByMe?: boolean;
  recipientName?: string | null;
  recipientUserId?: string | null;
}

interface ThreadMsg {
  id: string;
  content: string;
  attachments: AttachmentItem[];
  createdAt: string;
  senderId: string;
  senderEmployeeCode?: string | null;
  senderName: string;
  isSentByMe: boolean;
  isRead: boolean;
}

interface RecipientData {
  departments: { code: string; name: string }[];
  users: {
    id: string;
    code?: string;
    employeeId?: string | null;
    name: string;
    email: string;
    phone?: string;
    position?: string | null;
    department: string | null;
    departmentCode?: string | null;
  }[];
}

interface MessageOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  salesStaffList?: SalesStaffMember[];
  selectedSalesStaff?: SalesStaffMember | null;
  onSelectSalesStaff?: (staff: SalesStaffMember) => void;
  onUnreadChange?: (count: number) => void;
}

const CUSTOMER_QUICK_QUESTIONS = [
  'Tư vấn báo giá & chiết khấu',
  'Chính sách bảo hành 5 năm',
  'Hỗ trợ giao hàng & lắp đặt',
  'Tra cứu tiến độ đơn hàng',
];

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Vừa xong';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(type: string, name: string): string {
  if (type.startsWith('image/')) return 'bi-file-earmark-image';
  if (type.startsWith('audio/') || name.match(/\.(webm|mp3|wav|ogg|m4a|aac)$/i)) return 'bi-mic-fill';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'bi-file-earmark-pdf';
  if (name.match(/\.(doc|docx)$/i)) return 'bi-file-earmark-word';
  if (name.match(/\.(xls|xlsx|csv)$/i)) return 'bi-file-earmark-excel';
  if (name.match(/\.(ppt|pptx)$/i)) return 'bi-file-earmark-ppt';
  if (name.match(/\.(zip|rar|7z)$/i)) return 'bi-file-earmark-zip';
  return 'bi-file-earmark';
}

function isAudioAttachment(att: AttachmentItem): boolean {
  return (
    Boolean(att.type && att.type.startsWith('audio/')) ||
    /\.(webm|mp3|wav|ogg|m4a|aac)$/i.test(att.name || '') ||
    (att.dataUrl || '').startsWith('data:audio/')
  );
}

function formatDurationClock(sec: number): string {
  const safeSec = isFinite(sec) && sec > 0 ? Math.round(sec) : 0;
  const m = Math.floor(safeSec / 60);
  const s = safeSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseDurationFromAttachment(att: AttachmentItem): number {
  if (typeof att.duration === 'number' && isFinite(att.duration) && att.duration > 0) {
    return att.duration;
  }
  const match = (att.name || '').match(/\((\d+):(\d+)\)/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return 0;
}

const WAVEFORM_BARS = [38, 68, 48, 82, 56, 96, 72, 44, 86, 62, 100, 76, 52, 92, 66, 46, 80, 58, 70, 42, 64, 48];

function VoiceAttachmentPlayer({
  att,
  isBubbleSentByMe = false,
}: {
  att: AttachmentItem;
  isBubbleSentByMe?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(() => parseDurationFromAttachment(att));

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration || !isFinite(duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : playing ? 0.5 : 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 11px',
        borderRadius: '12px',
        background: isBubbleSentByMe ? 'rgba(255,255,255,0.16)' : '#f1f5f9',
        border: isBubbleSentByMe ? '1px solid rgba(255,255,255,0.28)' : '1px solid #e2e8f0',
        minWidth: '210px',
        maxWidth: '100%',
      }}
    >
      <audio
        ref={audioRef}
        src={att.dataUrl}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d) && d > 0) setDuration(d);
        }}
        onTimeUpdate={(e) => {
          const ct = e.currentTarget.currentTime;
          if (isFinite(ct)) setCurrentTime(ct);
          const d = e.currentTarget.duration;
          if (isFinite(d) && d > 0 && d !== duration) setDuration(d);
        }}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      <button
        type="button"
        onClick={togglePlay}
        title={playing ? 'Tạm dừng' : 'Phát tin nhắn thoại'}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          border: 'none',
          background: isBubbleSentByMe
            ? '#ffffff'
            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: isBubbleSentByMe ? '#4f46e5' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(15,23,42,0.12)',
        }}
      >
        <i
          className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`}
          style={{ fontSize: '17px', marginLeft: playing ? 0 : '2px' }}
        />
      </button>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div
          onClick={handleSeek}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2.5px',
            height: '22px',
            cursor: 'pointer',
          }}
        >
          {WAVEFORM_BARS.map((h, i) => {
            const barRatio = i / WAVEFORM_BARS.length;
            const active = barRatio <= progress && (playing || currentTime > 0);
            return (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: `${playing ? Math.max(25, ((h + ((i * 17) % 30)) % 100)) : h}%`,
                  minWidth: '2.5px',
                  maxWidth: '4px',
                  borderRadius: '99px',
                  transition: 'height 0.15s ease, background-color 0.15s ease',
                  background: isBubbleSentByMe
                    ? active
                      ? '#ffffff'
                      : 'rgba(255,255,255,0.42)'
                    : active
                    ? '#4f46e5'
                    : '#cbd5e1',
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10.5px',
            color: isBubbleSentByMe ? 'rgba(255,255,255,0.9)' : '#64748b',
            fontWeight: 600,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <i className="bi bi-mic-fill" style={{ fontSize: '10px' }} />
            Tin nhắn thoại
          </span>
          <span style={{ fontFamily: 'monospace' }}>
            {playing || currentTime > 0
              ? formatDurationClock(currentTime)
              : formatDurationClock(duration || 1)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PendingAudioAttachmentChip({
  att,
  onRemove,
}: {
  att: AttachmentItem;
  onRemove: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const dur = parseDurationFromAttachment(att);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '99px',
        background: '#eef2ff',
        border: '1px solid #c7d2fe',
        fontSize: '11px',
        color: '#3730a3',
        fontWeight: 600,
      }}
    >
      <audio
        ref={audioRef}
        src={att.dataUrl}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: 'none',
          background: '#4f46e5',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
        title={playing ? 'Tạm dừng' : 'Nghe thử'}
      >
        <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`} style={{ fontSize: '12px' }} />
      </button>
      <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        Tin nhắn thoại {dur > 0 ? `(${formatDurationClock(dur)})` : ''}
      </span>
      <button
        type="button"
        onClick={onRemove}
        style={{
          border: 'none',
          background: 'transparent',
          color: '#ef4444',
          cursor: 'pointer',
          padding: '0 2px',
          fontSize: '13px',
          lineHeight: 1,
        }}
        title="Xoá bản ghi âm"
      >
        <i className="bi bi-x" />
      </button>
    </div>
  );
}

interface UseVoiceMessagingOptions {
  textValue: string;
  setTextValue: React.Dispatch<React.SetStateAction<string>>;
  onAttachAudio: (att: AttachmentItem) => void;
  onSendAudioNow?: (att: AttachmentItem, recognizedText?: string) => void;
  onSendTextNow?: (text: string) => void;
}

function useVoiceMessaging({
  textValue,
  setTextValue,
  onAttachAudio,
  onSendAudioNow,
  onSendTextNow,
}: UseVoiceMessagingOptions) {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'dictation' | 'audio'>('dictation');
  const [seconds, setSeconds] = useState(0);
  const [interimText, setInterimText] = useState('');
  const [waveLevels, setWaveLevels] = useState<number[]>([35, 60, 45, 80, 50, 75, 40, 65, 55, 45]);
  const [hasAudioStream, setHasAudioStream] = useState(false);

  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<any>(null);
  const waveTimerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const chunksRef = useRef<BlobPart[]>([]);
  const pendingActionRef = useRef<'none' | 'attach' | 'send-audio' | 'cancel'>('none');
  const latestTextRef = useRef<string>(textValue);
  const latestInterimRef = useRef<string>('');

  useEffect(() => {
    latestTextRef.current = textValue;
  }, [textValue]);

  useEffect(() => {
    latestInterimRef.current = interimText;
  }, [interimText]);

  const cleanupResources = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (waveTimerRef.current) {
      clearInterval(waveTimerRef.current);
      waveTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
    }
    setHasAudioStream(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  const startMediaRecorder = useCallback(async () => {
    chunksRef.current = [];
    let stream: MediaStream | null = null;
    let analyser: AnalyserNode | null = null;

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx: AudioContext = new AudioCtx();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          analyser = ctx.createAnalyser();
          analyser.fftSize = 32;
          src.connect(analyser);
        }
      }
    } catch {
      // Fallback synthesized audio stream when testing on desktop/device without physical mic permission
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx: AudioContext = new AudioCtx();
          audioCtxRef.current = ctx;
          const dest = ctx.createMediaStreamDestination();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          gain.gain.setValueAtTime(0.02, ctx.currentTime);
          osc.connect(gain);
          gain.connect(dest);
          osc.start();
          stream = dest.stream;
          streamRef.current = stream;
        }
      } catch {
        // ignore
      }
    }

    if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    waveTimerRef.current = setInterval(() => {
      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        const next = Array.from({ length: 10 }, (_, idx) => {
          const val = freqData[idx % freqData.length] || 0;
          return Math.max(22, Math.min(100, Math.round((val / 255) * 95) + 18));
        });
        setWaveLevels(next);
      } else {
        setWaveLevels((prev) =>
          prev.map((_, idx) => 25 + Math.floor(Math.abs(Math.sin(Date.now() / 160 + idx)) * 70))
        );
      }
    }, 120);

    if (!stream || typeof MediaRecorder === 'undefined') {
      return false;
    }

    try {
      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) =>
          MediaRecorder.isTypeSupported(t)
        ) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const action = pendingActionRef.current;
        pendingActionRef.current = 'none';
        const durSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        const finalMime = recorder.mimeType || mimeType || 'audio/webm';
        const ext = finalMime.includes('mp4') ? 'm4a' : finalMime.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        chunksRef.current = [];

        cleanupResources();

        if (action === 'cancel' || blob.size === 0) {
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const att: AttachmentItem = {
            name: `Tin nhắn thoại (${formatDurationClock(durSec)}).${ext}`,
            size: blob.size,
            type: finalMime.startsWith('audio/') ? finalMime : 'audio/webm',
            dataUrl,
            duration: durSec,
          };
          if (action === 'send-audio') {
            const combined = [latestTextRef.current.trim(), latestInterimRef.current.trim()]
              .filter(Boolean)
              .join(' ');
            setInterimText('');
            onSendAudioNow?.(att, combined);
          } else if (action === 'attach') {
            onAttachAudio(att);
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(200);
      setHasAudioStream(true);
      return true;
    } catch {
      return false;
    }
  }, [cleanupResources, onAttachAudio, onSendAudioNow]);

  const startVoice = useCallback(
    async (requestedMode: 'dictation' | 'audio' = 'dictation') => {
      if (isActive) {
        // Toggle off if already active
        pendingActionRef.current = requestedMode === 'audio' ? 'attach' : 'cancel';
        if (latestInterimRef.current.trim()) {
          const extra = latestInterimRef.current.trim();
          setTextValue((prev) => {
            const sep = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + sep + extra;
          });
          setInterimText('');
        }
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          try {
            recorderRef.current.stop();
          } catch {
            cleanupResources();
          }
        } else {
          cleanupResources();
        }
        setIsActive(false);
        return;
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const isIOS =
        typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

      const effectiveMode: 'dictation' | 'audio' =
        requestedMode === 'dictation' && SpeechRecognition ? 'dictation' : 'audio';

      setMode(effectiveMode);
      setIsActive(true);
      setSeconds(0);
      setInterimText('');
      startTimeRef.current = Date.now();
      pendingActionRef.current = 'none';

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSeconds(Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000)));
      }, 500);

      // Start SpeechRecognition if supported and either in dictation mode or non-iOS audio mode
      if (SpeechRecognition && (effectiveMode === 'dictation' || !isIOS)) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = 'vi-VN';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          recognition.onresult = (event: any) => {
            let finalChunk = '';
            let interimChunk = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const res = event.results[i];
              if (res.isFinal) {
                finalChunk += res[0].transcript;
              } else {
                interimChunk += res[0].transcript;
              }
            }
            if (finalChunk.trim()) {
              const clean = finalChunk.trim();
              setTextValue((prev) => {
                const sep = prev && !prev.endsWith(' ') ? ' ' : '';
                return prev + sep + clean;
              });
            }
            setInterimText(interimChunk);
          };

          recognition.onerror = () => {
            // Keep session alive if audio recorder is running
          };

          recognition.onend = () => {
            // Auto-restart recognition while session is still active in dictation mode
            if (recognitionRef.current === recognition) {
              try {
                recognition.start();
              } catch {
                // ignore
              }
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch {
          // ignore
        }
      }

      // Start MediaRecorder in audio mode, or in parallel on non-iOS devices so user can send voice clip anytime
      if (effectiveMode === 'audio' || !isIOS) {
        await startMediaRecorder();
      } else {
        // Animate wave bars on iOS dictation
        if (waveTimerRef.current) clearInterval(waveTimerRef.current);
        waveTimerRef.current = setInterval(() => {
          setWaveLevels((prev) =>
            prev.map((_, idx) => 25 + Math.floor(Math.abs(Math.sin(Date.now() / 160 + idx)) * 70))
          );
        }, 120);
      }
    },
    [isActive, setTextValue, startMediaRecorder, cleanupResources]
  );

  const cancelVoice = useCallback(() => {
    pendingActionRef.current = 'cancel';
    setInterimText('');
    setIsActive(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        cleanupResources();
      }
    } else {
      cleanupResources();
    }
  }, [cleanupResources]);

  const stopAndKeepText = useCallback(() => {
    if (latestInterimRef.current.trim()) {
      const extra = latestInterimRef.current.trim();
      setTextValue((prev) => {
        const sep = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + sep + extra;
      });
    }
    setInterimText('');
    pendingActionRef.current = 'cancel';
    setIsActive(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        cleanupResources();
      }
    } else {
      cleanupResources();
    }
  }, [cleanupResources, setTextValue]);

  const stopAndAttachAudio = useCallback(async () => {
    if (latestInterimRef.current.trim()) {
      const extra = latestInterimRef.current.trim();
      setTextValue((prev) => {
        const sep = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + sep + extra;
      });
    }
    setInterimText('');
    setIsActive(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      pendingActionRef.current = 'attach';
      try {
        recorderRef.current.stop();
      } catch {
        cleanupResources();
      }
    } else {
      cleanupResources();
    }
  }, [cleanupResources, setTextValue]);

  const stopAndSendAudio = useCallback(async () => {
    setIsActive(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      pendingActionRef.current = 'send-audio';
      try {
        recorderRef.current.stop();
      } catch {
        cleanupResources();
      }
    } else {
      // If on iOS dictation where MediaRecorder wasn't started yet, switch to audio recording
      cleanupResources();
      setIsActive(true);
      setMode('audio');
      setSeconds(0);
      startTimeRef.current = Date.now();
      await startMediaRecorder();
    }
  }, [cleanupResources, startMediaRecorder]);

  const stopAndSendText = useCallback(() => {
    const combined = [latestTextRef.current.trim(), latestInterimRef.current.trim()]
      .filter(Boolean)
      .join(' ');
    setInterimText('');
    pendingActionRef.current = 'cancel';
    setIsActive(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        cleanupResources();
      }
    } else {
      cleanupResources();
    }
    if (combined) {
      setTextValue('');
      onSendTextNow?.(combined);
    }
  }, [cleanupResources, onSendTextNow, setTextValue]);

  return {
    isActive,
    mode,
    seconds,
    interimText,
    waveLevels,
    hasAudioStream,
    startVoice,
    cancelVoice,
    stopAndKeepText,
    stopAndAttachAudio,
    stopAndSendAudio,
    stopAndSendText,
  };
}

function VoiceControlPanel({
  voice,
  textValue,
}: {
  voice: ReturnType<typeof useVoiceMessaging>;
  textValue: string;
}) {
  if (!voice.isActive) return null;
  const liveTranscript = [textValue.trim(), voice.interimText.trim()].filter(Boolean).join(' ');

  return (
    <div
      style={{
        padding: '9px 12px',
        background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 55%, #fff1f2 100%)',
        borderTop: '1px solid #c7d2fe',
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <span
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 0 3px rgba(239,68,68,0.22)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#dc2626',
              background: '#fff',
              padding: '2px 6px',
              borderRadius: '6px',
              border: '1px solid #fecdd3',
              flexShrink: 0,
            }}
          >
            {formatDurationClock(voice.seconds)}
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              height: '16px',
              flexShrink: 0,
            }}
          >
            {voice.waveLevels.map((lvl, idx) => (
              <span
                key={idx}
                style={{
                  width: '2.5px',
                  height: `${Math.max(20, Math.min(100, lvl))}%`,
                  background: 'linear-gradient(180deg, #6366f1, #ec4899)',
                  borderRadius: '99px',
                  transition: 'height 0.1s ease',
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#312e81',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {voice.mode === 'audio' ? 'Đang ghi âm thoại...' : 'Đang nghe tiếng Việt...'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={voice.cancelVoice}
            style={{
              padding: '4px 8px',
              borderRadius: '7px',
              border: '1px solid #fecdd3',
              background: '#fff',
              color: '#e11d48',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Huỷ ghi âm"
          >
            <i className="bi bi-trash3" style={{ fontSize: '11px' }} />
            <span>Huỷ</span>
          </button>

          {voice.hasAudioStream && (
            <button
              type="button"
              onClick={voice.stopAndAttachAudio}
              style={{
                padding: '4px 8px',
                borderRadius: '7px',
                border: '1px solid #c7d2fe',
                background: '#fff',
                color: '#4338ca',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Dừng và nghe thử trước khi gửi"
            >
              <i className="bi bi-stop-circle" style={{ fontSize: '11px' }} />
              <span>Nghe thử</span>
            </button>
          )}

          {voice.mode === 'dictation' && liveTranscript && (
            <button
              type="button"
              onClick={voice.stopAndKeepText}
              style={{
                padding: '4px 8px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#334155',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Dừng nghe và giữ văn bản trong ô nhập"
            >
              <i className="bi bi-check2" style={{ fontSize: '12px' }} />
              <span>Xong</span>
            </button>
          )}

          <button
            type="button"
            onClick={voice.stopAndSendAudio}
            style={{
              padding: '4px 9px',
              borderRadius: '7px',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 6px rgba(79,70,229,0.25)',
            }}
            title="Gửi tin nhắn thoại ngay"
          >
            <i className="bi bi-soundwave" style={{ fontSize: '12px' }} />
            <span>Gửi thoại</span>
          </button>
        </div>
      </div>

      {liveTranscript && (
        <div
          style={{
            padding: '5px 9px',
            borderRadius: '7px',
            background: 'rgba(255,255,255,0.85)',
            border: '1px solid #e0e7ff',
            fontSize: '11.5px',
            color: '#1e1b4b',
            lineHeight: 1.4,
          }}
        >
          <i className="bi bi-quote text-indigo-500" style={{ marginRight: '4px' }} />
          {liveTranscript}
        </div>
      )}
    </div>
  );
}

function AttachmentList({
  items,
  isBubbleSentByMe = false,
}: {
  items?: AttachmentItem[];
  isBubbleSentByMe?: boolean;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
      {items.map((att, idx) => {
        const isImg = att.type.startsWith('image/');
        const isAudio = isAudioAttachment(att);
        if (isAudio) {
          return (
            <VoiceAttachmentPlayer
              key={idx}
              att={att}
              isBubbleSentByMe={isBubbleSentByMe}
            />
          );
        }
        return isImg ? (
          <div
            key={idx}
            style={{
              borderRadius: '10px',
              overflow: 'hidden',
              border: isBubbleSentByMe
                ? '1px solid rgba(255,255,255,0.25)'
                : '1px solid #e2e8f0',
              maxWidth: '100%',
            }}
          >
            <img
              src={att.dataUrl}
              alt={att.name}
              style={{
                width: '100%',
                maxHeight: '200px',
                objectFit: 'cover',
                display: 'block',
                cursor: 'pointer',
              }}
              onClick={() => {
                const w = window.open();
                if (w) {
                  w.document.write(
                    `<img src="${att.dataUrl}" style="max-width:100%;height:auto;" />`
                  );
                }
              }}
            />
            <div
              style={{
                padding: '5px 8px',
                background: isBubbleSentByMe ? 'rgba(0,0,0,0.15)' : '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: isBubbleSentByMe ? '#fff' : '#475569',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {att.name}
              </span>
              <a
                href={att.dataUrl}
                download={att.name}
                style={{
                  fontSize: '11px',
                  color: isBubbleSentByMe ? '#e0e7ff' : '#6366f1',
                  fontWeight: 600,
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-download" style={{ marginRight: '3px' }} />
                Tải về
              </a>
            </div>
          </div>
        ) : (
          <a
            key={idx}
            href={att.dataUrl}
            download={att.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              background: isBubbleSentByMe ? 'rgba(255,255,255,0.15)' : '#f8fafc',
              borderRadius: '8px',
              border: isBubbleSentByMe
                ? '1px solid rgba(255,255,255,0.25)'
                : '1px solid #e2e8f0',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: isBubbleSentByMe ? 'rgba(255,255,255,0.2)' : '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <i
                className={`bi ${getFileIcon(att.type, att.name)}`}
                style={{ fontSize: '14px', color: isBubbleSentByMe ? '#fff' : '#6366f1' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: isBubbleSentByMe ? '#fff' : '#1e293b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {att.name}
              </p>
              <span
                style={{
                  fontSize: '10px',
                  color: isBubbleSentByMe ? 'rgba(255,255,255,0.75)' : '#94a3b8',
                }}
              >
                {formatFileSize(att.size)}
              </span>
            </div>
            <i
              className="bi bi-download"
              style={{
                fontSize: '13px',
                color: isBubbleSentByMe ? '#fff' : '#6366f1',
                flexShrink: 0,
              }}
            />
          </a>
        );
      })}
    </div>
  );
}

// ── Form Soạn tin nhắn mới (Dành cho Nhân viên nội bộ) ────────────────────────
function SendSheet({
  onBack,
  onSent,
  chatHeaders,
}: {
  onBack: () => void;
  onSent: () => void;
  chatHeaders: Record<string, string>;
}) {
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<'individual' | 'group'>('individual');
  const [targetVal, setTargetVal] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [recipients, setRecipients] = useState<RecipientData>({ departments: [], users: [] });
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendSheetVoice = useVoiceMessaging({
    textValue: content,
    setTextValue: setContent,
    onAttachAudio: (att) => setAttachments((prev) => [...prev, att]),
    onSendAudioNow: (att, recognizedText) => {
      setAttachments((prev) => [...prev, att]);
      if (recognizedText && !content.trim()) {
        setContent(recognizedText);
      }
    },
  });

  useEffect(() => {
    fetch('/api/notifications/recipients', { headers: chatHeaders })
      .then((r) => (r.ok ? r.json() : { departments: [], users: [] }))
      .then((d) => {
        if (d && Array.isArray(d.users)) setRecipients(d);
      })
      .catch(() => {});
  }, [chatHeaders]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setError(`Tệp "${file.name}" vượt quá giới hạn 5MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            dataUrl: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleGroupUser = (id: string) => {
    setGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) {
      setError('Vui lòng nhập nội dung tin nhắn hoặc đính kèm tệp.');
      return;
    }
    if (audience === 'individual' && !targetVal) {
      setError('Vui lòng chọn người nhận.');
      return;
    }
    if (audience === 'group' && groupIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 người nhận.');
      return;
    }

    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...chatHeaders,
        },
        body: JSON.stringify({
          content,
          audienceType: audience,
          audienceValue: audience === 'group' ? groupIds.join(',') : targetVal,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Lỗi gửi');
      }
      onSent();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const audienceOpts = [
    { key: 'individual', label: 'Cá nhân', icon: 'bi-person-fill' },
    { key: 'group', label: 'Nhóm người', icon: 'bi-people-fill' },
  ] as const;

  const filteredUsers = recipients.users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      (u.code || '').toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      (u.position || '').toLowerCase().includes(q)
    );
  });

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '8px 11px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#0f172a',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'linear-gradient(135deg,#fafafe,#f4f6fb)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            flexShrink: 0,
          }}
        >
          <i className="bi bi-arrow-left" style={{ fontSize: '13px' }} />
        </button>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
            Soạn tin nhắn mới
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
            Gửi tin nhắn trực tiếp cho nhân sự hoặc khách hàng
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSend}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {error && (
          <div
            style={{
              padding: '8px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '12px',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            <i className="bi bi-exclamation-circle-fill" style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <div>
          <label
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#475569',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            Gửi đến <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {audienceOpts.map((opt) => {
              const active = audience === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setAudience(opt.key);
                    setTargetVal('');
                    setGroupIds([]);
                    setUserSearch('');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: active ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
                    background: active ? '#eef2ff' : '#fff',
                    color: active ? '#4f46e5' : '#475569',
                    fontWeight: active ? 600 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className={`bi ${opt.icon}`} style={{ fontSize: '13px' }} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {(audience === 'individual' || audience === 'group') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
                {audience === 'individual' ? 'Chọn người nhận' : 'Chọn thành viên nhận tin'}{' '}
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {audience === 'group' && groupIds.length > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#6366f1',
                    background: '#eef2ff',
                    padding: '1px 8px',
                    borderRadius: '99px',
                  }}
                >
                  Đã chọn {groupIds.length} người
                </span>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <i
                className="bi bi-search"
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: '12px',
                }}
              />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc phòng ban..."
                style={{ ...inp, paddingLeft: '28px', fontSize: '12px', padding: '6px 10px 6px 28px' }}
              />
            </div>

            <div
              style={{
                maxHeight: '165px',
                overflowY: 'auto',
                border: '1.5px solid #e2e8f0',
                borderRadius: '8px',
                background: '#fff',
              }}
            >
              {filteredUsers.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    padding: '12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#94a3b8',
                  }}
                >
                  Không tìm thấy người nhận phù hợp
                </p>
              ) : (
                filteredUsers.map((u) => {
                  const checked =
                    audience === 'individual' ? targetVal === u.id : groupIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        if (audience === 'individual') {
                          setTargetVal(u.id);
                        } else {
                          toggleGroupUser(u.id);
                        }
                      }}
                      style={{
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f8fafc',
                        background: checked ? '#eef2ff' : 'transparent',
                      }}
                    >
                      {audience === 'individual' ? (
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: checked ? '5px solid #6366f1' : '1.5px solid #cbd5e1',
                            background: '#fff',
                            flexShrink: 0,
                            boxSizing: 'border-box',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: checked ? 'none' : '1.5px solid #cbd5e1',
                            background: checked ? '#6366f1' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {checked && (
                            <i
                              className="bi bi-check"
                              style={{ color: '#fff', fontSize: '12px', lineHeight: 1 }}
                            />
                          )}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '12.5px',
                            fontWeight: checked ? 600 : 500,
                            color: '#1e293b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {u.name}
                        </p>
                        {(u.code || u.position || u.department) && (
                          <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                            {[u.code, u.position, u.department].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '5px',
            }}
          >
            <label
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#475569',
              }}
            >
              Nội dung tin nhắn <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button
                type="button"
                onClick={() => sendSheetVoice.startVoice('dictation')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border:
                    sendSheetVoice.isActive && sendSheetVoice.mode === 'dictation'
                      ? '1px solid #f43f5e'
                      : '1px solid #c7d2fe',
                  background:
                    sendSheetVoice.isActive && sendSheetVoice.mode === 'dictation'
                      ? '#fff1f2'
                      : '#eef2ff',
                  color:
                    sendSheetVoice.isActive && sendSheetVoice.mode === 'dictation'
                      ? '#e11d48'
                      : '#4f46e5',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Nhập nội dung bằng giọng nói"
              >
                <i className="bi bi-mic-fill" style={{ fontSize: '11px' }} />
                <span>Nói thành chữ</span>
              </button>
              <button
                type="button"
                onClick={() => sendSheetVoice.startVoice('audio')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border:
                    sendSheetVoice.isActive && sendSheetVoice.mode === 'audio'
                      ? '1px solid #f43f5e'
                      : '1px solid #e2e8f0',
                  background:
                    sendSheetVoice.isActive && sendSheetVoice.mode === 'audio'
                      ? '#fff1f2'
                      : '#f8fafc',
                  color:
                    sendSheetVoice.isActive && sendSheetVoice.mode === 'audio'
                      ? '#e11d48'
                      : '#475569',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Ghi âm tin nhắn thoại đính kèm"
              >
                <i className="bi bi-soundwave" style={{ fontSize: '12px' }} />
                <span>Ghi âm thoại</span>
              </button>
            </div>
          </div>
          {sendSheetVoice.isActive && (
            <div style={{ marginBottom: '6px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #c7d2fe' }}>
              <VoiceControlPanel voice={sendSheetVoice} textValue={content} />
            </div>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập tin nhắn hoặc bấm Micro để nói bằng giọng nói..."
            rows={4}
            style={{ ...inp, resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
              Đính kèm ảnh / tệp tin / ghi âm
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #c7d2fe',
                background: '#eef2ff',
                color: '#4f46e5',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="bi bi-paperclip" style={{ fontSize: '13px' }} />
              Chọn tệp
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar,.txt"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {attachments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {attachments.map((att, idx) =>
                isAudioAttachment(att) ? (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                    <PendingAudioAttachmentChip att={att} onRemove={() => removeAttachment(idx)} />
                  </div>
                ) : (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 9px',
                      background: '#f8fafc',
                      borderRadius: '7px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {att.type.startsWith('image/') ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '5px',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <i
                        className={`bi ${getFileIcon(att.type, att.name)}`}
                        style={{ fontSize: '16px', color: '#6366f1', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '11.5px',
                          fontWeight: 500,
                          color: '#1e293b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {att.name}
                      </p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {formatFileSize(att.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: '13px',
                      }}
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={sending}
          style={{
            marginTop: 'auto',
            padding: '10px',
            borderRadius: '9px',
            border: 'none',
            background: sending ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '13px',
            cursor: sending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            boxShadow: sending ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
          }}
        >
          <i className="bi bi-send-fill" />
          {sending ? 'Đang gửi...' : 'Gửi tin nhắn ngay'}
        </button>
      </form>
    </div>
  );
}

// ── Main MessageOffcanvas Component ──────────────────────────────────────────
export const MessageOffcanvas: React.FC<MessageOffcanvasProps> = ({
  isOpen,
  onClose,
  salesStaffList = [],
  selectedSalesStaff = null,
  onUnreadChange,
}) => {
  const { user } = useAuth();

  const isCustomer =
    user?.role === 'CUSTOMER' ||
    user?.departmentCode === 'customer' ||
    user?.email?.includes('@customer.');

  const currentChatUserId = isCustomer
    ? String(user?.id || 'guest-customer')
    : String(user?.id || user?.employee?.id || user?.employee?.code || '');

  const getChatHeaders = useCallback((): Record<string, string> => {
    const token =
      sessionStorage.getItem('seajong_token') || localStorage.getItem('seajong_token') || '';
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (currentChatUserId) headers['X-Chat-User-Id'] = currentChatUserId;
    return headers;
  }, [currentChatUserId]);

  // ── 1. State dành cho Khách hàng (Chat trực tiếp 1-1 với Nhân viên bán hàng đã chọn theo mã định danh) ──
  const activeStaff: SalesStaffMember = selectedSalesStaff ||
    salesStaffList[0] || {
      id: 'cmsbc9bfu00voyg9msjo51cs3',
      code: 'EMP-20260802-0737-W52I',
      name: 'Nguyên Văn Thành',
      position: 'Bán hàng',
      department: 'Phòng Kinh doanh',
      departmentCode: 'sales',
      phone: '0981183234',
      avatarText: 'NT',
    };

  const [customerThread, setCustomerThread] = useState<ThreadMsg[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerInput, setCustomerInput] = useState('');
  const [customerAttachments, setCustomerAttachments] = useState<AttachmentItem[]>([]);
  const [customerSending, setCustomerSending] = useState(false);
  const customerEndRef = useRef<HTMLDivElement>(null);
  const customerFileRef = useRef<HTMLInputElement>(null);

  const fetchCustomerThread = useCallback(
    async (silent = false) => {
      if (!isCustomer || !activeStaff?.id) return;
      if (!silent) setCustomerLoading(true);
      try {
        const res = await fetch(
          `/api/messages/conversation?with=${encodeURIComponent(activeStaff.id)}`,
          { headers: getChatHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          const newThread: ThreadMsg[] = data.thread || [];
          setCustomerThread((prev) => {
            if (prev.length !== newThread.length) {
              setTimeout(
                () => customerEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
                60
              );
            }
            return newThread;
          });
          onUnreadChange?.(0);
        }
      } catch {
        // ignore network errors during polling
      } finally {
        if (!silent) setCustomerLoading(false);
      }
    },
    [isCustomer, activeStaff?.id, getChatHeaders, onUnreadChange]
  );

  // Nạp hội thoại & tự động polling mỗi 2.5s khi Khách hàng đang mở khung chat
  useEffect(() => {
    if (!isOpen || !isCustomer) return;
    fetchCustomerThread(false);
    const timer = setInterval(() => {
      fetchCustomerThread(true);
    }, 2500);
    return () => clearInterval(timer);
  }, [isOpen, isCustomer, activeStaff?.id, fetchCustomerThread]);

  const handleSendCustomerMessage = async (
    rawText?: string,
    directAttachments?: AttachmentItem[]
  ) => {
    const text = (rawText ?? customerInput).trim();
    const effectiveAttachments = directAttachments ?? customerAttachments;
    if ((!text && effectiveAttachments.length === 0) || customerSending) return;

    if (rawText === undefined || directAttachments !== undefined) setCustomerInput('');
    const filesToSend = [...effectiveAttachments];
    if (!directAttachments) setCustomerAttachments([]);
    setCustomerSending(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getChatHeaders(),
        },
        body: JSON.stringify({
          content: text,
          audienceType: 'individual',
          audienceValue: activeStaff.id,
          attachments: filesToSend.length > 0 ? filesToSend : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setCustomerThread((prev) => [...prev, data.message]);
          setTimeout(() => customerEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        } else {
          fetchCustomerThread(true);
        }
      }
    } catch {
      // ignore
    } finally {
      setCustomerSending(false);
    }
  };

  const customerVoice = useVoiceMessaging({
    textValue: customerInput,
    setTextValue: setCustomerInput,
    onAttachAudio: (att) => setCustomerAttachments((prev) => [...prev, att]),
    onSendAudioNow: (att, recognizedText) => {
      handleSendCustomerMessage(recognizedText || '', [att]);
    },
    onSendTextNow: (text) => {
      handleSendCustomerMessage(text);
    },
  });

  const handleCustomerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = () => {
        setCustomerAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            dataUrl: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (customerFileRef.current) customerFileRef.current.value = '';
  };

  // ── 2. State dành cho Nhân viên nội bộ (Giống client-seajong: list / detail / send) ──
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'send' | 'detail'>('list');
  const [selected, setSelected] = useState<MessageItem | null>(null);
  const [thread, setThread] = useState<ThreadMsg[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [replyContent, setReplyContent] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<AttachmentItem[]>([]);
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState('');
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (isCustomer) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch('/api/messages', { headers: getChatHeaders() });
        if (res.ok) {
          const d = await res.json();
          setMessages(d.messages || []);
          setUnreadCount(d.unreadCount || 0);
          onUnreadChange?.(d.unreadCount || 0);
        }
      } catch {
        // ignore
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isCustomer, getChatHeaders, onUnreadChange]
  );

  // Polling danh sách tin nhắn nội bộ mỗi 3s khi mở Offcanvas
  useEffect(() => {
    if (!isOpen || isCustomer) return;
    setView('list');
    fetchMessages(false);
    const timer = setInterval(() => {
      fetchMessages(true);
    }, 3000);
    return () => clearInterval(timer);
  }, [isOpen, isCustomer, fetchMessages]);

  const getPartnerUserId = useCallback((m: MessageItem | null): string | null => {
    if (!m) return null;
    return m.isSentByMe ? m.recipientUserId || null : m.senderId;
  }, []);

  const fetchStaffConversation = useCallback(
    async (partnerId: string, silent = false) => {
      if (!silent) setThreadLoading(true);
      try {
        const res = await fetch(
          `/api/messages/conversation?with=${encodeURIComponent(partnerId)}`,
          { headers: getChatHeaders() }
        );
        if (res.ok) {
          const d = await res.json();
          const newThread: ThreadMsg[] = d.thread || [];
          setThread((prev) => {
            if (prev.length !== newThread.length) {
              setTimeout(
                () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
                60
              );
            }
            return newThread;
          });
        }
      } catch {
        // ignore
      } finally {
        if (!silent) setThreadLoading(false);
      }
    },
    [getChatHeaders]
  );

  // Polling hội thoại chi tiết mỗi 2.5s khi nhân viên đang mở 1 cuộc trò chuyện
  useEffect(() => {
    if (!isOpen || isCustomer || view !== 'detail' || !selected) return;
    const partnerId = getPartnerUserId(selected);
    if (!partnerId) return;
    const timer = setInterval(() => {
      fetchStaffConversation(partnerId, true);
    }, 2500);
    return () => clearInterval(timer);
  }, [isOpen, isCustomer, view, selected, getPartnerUserId, fetchStaffConversation]);

  const markRead = async (m: MessageItem) => {
    setSelected(m);
    setView('detail');
    setReplyContent('');
    setReplyAttachments([]);
    setReplyError('');

    const partnerUserId = getPartnerUserId(m);

    if (!m.isRead) {
      try {
        await fetch('/api/messages/read', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getChatHeaders(),
          },
          body: JSON.stringify({
            participantId: m.participantId,
            withUserId: partnerUserId,
          }),
        });
        setMessages((prev) =>
          prev.map((x) =>
            x.participantId === m.participantId || x.senderId === partnerUserId
              ? { ...x, isRead: true }
              : x
          )
        );
        const next = Math.max(0, unreadCount - 1);
        setUnreadCount(next);
        onUnreadChange?.(next);
      } catch {
        // ignore
      }
    }

    if (partnerUserId) {
      fetchStaffConversation(partnerUserId, false);
    } else {
      setThread([
        {
          id: m.id,
          content: m.content,
          attachments: m.attachments || [],
          createdAt: m.createdAt,
          senderId: m.senderId,
          senderName: m.senderName,
          isSentByMe: !!m.isSentByMe,
          isRead: m.isRead,
        },
      ]);
    }
  };

  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setReplyError(`Tệp "${file.name}" vượt quá 5MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setReplyAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            dataUrl: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
  };

  const handleSendReply = async (
    e?: React.FormEvent,
    directText?: string,
    directAttachments?: AttachmentItem[]
  ) => {
    if (e) e.preventDefault();
    if (!selected) return;
    const textToSend = (directText ?? replyContent).trim();
    const filesToSend = directAttachments ?? replyAttachments;
    if (!textToSend && filesToSend.length === 0) {
      setReplyError('Vui lòng nhập nội dung phản hồi hoặc đính kèm tệp.');
      return;
    }

    const replyTargetId = selected.isSentByMe ? selected.recipientUserId : selected.senderId;
    if (!replyTargetId) {
      setReplyError('Không xác định được người nhận.');
      return;
    }

    setReplySending(true);
    setReplyError('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getChatHeaders(),
        },
        body: JSON.stringify({
          content: textToSend,
          audienceType: 'individual',
          audienceValue: replyTargetId,
          attachments: filesToSend.length > 0 ? filesToSend : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Lỗi gửi phản hồi');
      }
      const data = await res.json();
      setReplyContent('');
      if (!directAttachments) setReplyAttachments([]);
      if (data.message) {
        setThread((prev) => [...prev, data.message]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      }
      fetchMessages(true);
    } catch (err: any) {
      setReplyError(err.message);
    } finally {
      setReplySending(false);
    }
  };

  const replyVoice = useVoiceMessaging({
    textValue: replyContent,
    setTextValue: setReplyContent,
    onAttachAudio: (att) => setReplyAttachments((prev) => [...prev, att]),
    onSendAudioNow: (att, recognizedText) => {
      handleSendReply(undefined, recognizedText || '', [att]);
    },
    onSendTextNow: (text) => {
      handleSendReply(undefined, text);
    },
  });

  const markAllRead = async () => {
    try {
      await fetch('/api/messages/read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getChatHeaders(),
        },
        body: JSON.stringify({ markAll: true }),
      });
      setMessages((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
      onUnreadChange?.(0);
    } catch {
      // ignore
    }
  };

  // Gom nhóm theo từng người hội thoại (1 người = 1 dòng hội thoại mới nhất)
  const conversationList = React.useMemo(() => {
    const convMap = new Map<string, MessageItem>();
    for (const m of messages) {
      const partnerId = m.isSentByMe ? m.recipientUserId || `group_${m.id}` : m.senderId;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, { ...m });
      } else {
        const existing = convMap.get(partnerId)!;
        if (!m.isSentByMe && !m.isRead) {
          existing.isRead = false;
        }
        if (!existing.senderPosition && !m.isSentByMe && m.senderPosition) {
          existing.senderPosition = m.senderPosition;
          existing.senderDepartment = m.senderDepartment;
        }
      }
    }
    return Array.from(convMap.values());
  }, [messages]);

  const displayed = conversationList.filter((m) => {
    if (tab === 'unread' && m.isRead) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const partnerName = m.isSentByMe ? m.recipientName || '' : m.senderName;
      const matchSender = partnerName.toLowerCase().includes(q);
      const matchDept = (m.senderDepartment || '').toLowerCase().includes(q);
      const matchContent = m.content.toLowerCase().includes(q);
      if (!matchSender && !matchDept && !matchContent) return false;
    }
    return true;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GIAO DIỆN 1: KHÁCH HÀNG CHAT TRỰC TIẾP VỚI NHÂN VIÊN BÁN HÀNG (DATABASE REALTIME)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isCustomer) {
    return (
      <Offcanvas
        isOpen={isOpen}
        onClose={onClose}
        title="Chat với Nhân viên Bán hàng"
        description={`Đang tư vấn trực tiếp: ${activeStaff.name} (${activeStaff.position})`}
        icon={<i className="bi bi-chat-dots text-[18px]" />}
        width="400px"
        bodyClassName="p-0 overflow-hidden flex flex-col bg-slate-50/40"
      >
        <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
          {/* Header thông tin Nhân viên bán hàng đang phụ trách */}
          <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  {activeStaff.avatarText || getAvatarInitials(activeStaff.name)}
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px] font-bold text-slate-900 truncate">
                    {activeStaff.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-semibold">
                    {activeStaff.position}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                    <i className="bi bi-person-check-fill text-[10px]" />
                    Đang hỗ trợ
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Phòng Kinh doanh
                  </span>
                  {activeStaff.phone && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-slate-600">{activeStaff.phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {activeStaff.phone && (
              <a
                href={`tel:${activeStaff.phone}`}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors no-underline"
                title={`Gọi điện trực tiếp cho ${activeStaff.name}`}
              >
                <i className="bi bi-telephone-outbound-fill text-[11px]" />
                <span>{activeStaff.phone}</span>
              </a>
            )}
          </div>

          {/* Danh sách tin nhắn hội thoại thực tế từ CSDL */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/60">
            {/* Lời chào mở đầu của nhân viên bán hàng */}
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10.5px] font-semibold text-slate-600">
                  {activeStaff.name}
                </span>
                <span className="text-[10px] text-slate-400">Hỗ trợ trực tuyến</span>
              </div>
              <div className="max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed shadow-xs bg-white text-slate-800 border border-slate-200/90 rounded-tl-md">
                Xin chào Quý khách! Tôi là <strong>{activeStaff.name}</strong> (
                {activeStaff.position} - Phòng Kinh doanh Seajong
                {activeStaff.phone ? `, SĐT: ${activeStaff.phone}` : ''}). Quý khách cần tư vấn sản
                phẩm, nhận báo giá ưu đãi hay hỗ trợ đặt hàng trực tuyến cứ nhắn trực tiếp cho tôi
                nhé!
              </div>
            </div>

            {customerLoading && customerThread.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Đang tải lịch sử trò chuyện...
              </div>
            ) : (
              customerThread.map((msg) => {
                const isMe = msg.isSentByMe;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10.5px] font-semibold text-slate-600">
                        {isMe ? 'Khách hàng Seajong' : activeStaff.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatClock(msg.createdAt)}
                      </span>
                    </div>
                    <div
                      className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-md'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-md'
                      }`}
                    >
                      {msg.content && (
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      )}
                      <AttachmentList items={msg.attachments} isBubbleSentByMe={isMe} />
                    </div>
                  </div>
                );
              })
            )}
            <div ref={customerEndRef} />
          </div>

          {/* Gợi ý câu hỏi nhanh */}
          <div
            className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {CUSTOMER_QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendCustomerMessage(q)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200/80 hover:border-indigo-200 text-[11px] font-medium transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Thanh điều khiển nhắn tin bằng giọng nói */}
          <VoiceControlPanel voice={customerVoice} textValue={customerInput} />

          {/* File đính kèm đang chọn */}
          {customerAttachments.length > 0 && (
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5 shrink-0">
              {customerAttachments.map((att, idx) =>
                isAudioAttachment(att) ? (
                  <PendingAudioAttachmentChip
                    key={idx}
                    att={att}
                    onRemove={() =>
                      setCustomerAttachments((prev) => prev.filter((_, i) => i !== idx))
                    }
                  />
                ) : (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700"
                  >
                    <i className={`bi ${getFileIcon(att.type, att.name)} text-indigo-600`} />
                    <span className="max-w-[140px] truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomerAttachments((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-rose-500 hover:text-rose-700 border-0 bg-transparent cursor-pointer p-0"
                    >
                      <i className="bi bi-x" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {/* Ô nhập tin nhắn */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customerVoice.isActive) {
                const combinedText = [customerInput.trim(), customerVoice.interimText.trim()]
                  .filter(Boolean)
                  .join(' ');
                if (customerVoice.mode === 'audio' || !combinedText) {
                  customerVoice.stopAndSendAudio();
                } else {
                  customerVoice.stopAndSendText();
                }
                return;
              }
              handleSendCustomerMessage();
            }}
            className="p-2.5 sm:p-3 bg-white border-t border-slate-100 flex items-center gap-1.5 sm:gap-2 shrink-0"
          >
            <button
              type="button"
              onClick={() => customerFileRef.current?.click()}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Đính kèm hình ảnh / tệp tin"
            >
              <i className="bi bi-paperclip text-sm" />
            </button>
            <input
              ref={customerFileRef}
              type="file"
              multiple
              accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleCustomerFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => customerVoice.startVoice('audio')}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                customerVoice.isActive && customerVoice.mode === 'audio'
                  ? 'border-rose-500 bg-rose-500 text-white shadow-xs animate-pulse'
                  : 'border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-600'
              }`}
              title="Ghi âm tin nhắn thoại"
            >
              <i className="bi bi-soundwave text-[15px]" />
            </button>
            <div className="flex-1 relative flex items-center min-w-0">
              <input
                type="text"
                value={
                  customerVoice.interimText
                    ? `${customerInput}${customerInput && !customerInput.endsWith(' ') ? ' ' : ''}${customerVoice.interimText}`
                    : customerInput
                }
                onChange={(e) => setCustomerInput(e.target.value)}
                placeholder={`Nhắn tin hoặc nói cho ${activeStaff.name}...`}
                className="w-full pl-3 pr-9 py-2 text-[16px] sm:text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-400 bg-slate-50/70 focus:bg-white text-slate-800"
              />
              <button
                type="button"
                onClick={() => customerVoice.startVoice('dictation')}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center border-0 transition-all cursor-pointer ${
                  customerVoice.isActive && customerVoice.mode === 'dictation'
                    ? 'bg-rose-500 text-white shadow-2xs animate-pulse'
                    : 'bg-transparent hover:bg-indigo-50 text-indigo-600'
                }`}
                title="Nhập tin nhắn bằng giọng nói (Tiếng Việt)"
              >
                <i
                  className={`bi ${
                    customerVoice.isActive && customerVoice.mode === 'dictation'
                      ? 'bi-mic-fill'
                      : 'bi-mic'
                  } text-[13px]`}
                />
              </button>
            </div>
            <button
              type="submit"
              disabled={
                (!customerInput.trim() &&
                  customerAttachments.length === 0 &&
                  !customerVoice.isActive) ||
                customerSending
              }
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border-0 shrink-0 ${
                (customerInput.trim() ||
                  customerAttachments.length > 0 ||
                  customerVoice.isActive) &&
                !customerSending
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <i className="bi bi-send-fill text-[11px]" />
              <span>{customerSending ? '...' : 'Gửi'}</span>
            </button>
          </form>
        </div>
      </Offcanvas>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GIAO DIỆN 2: NHÂN VIÊN NỘI BỘ (CHUẨN CLIENT-SEAJONG: LIST / SEND / DETAIL)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.28)',
          backdropFilter: 'blur(2px)',
          zIndex: 1040,
        }}
      />

      <div
        className="offcanvas-panel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          maxWidth: '100vw',
          background: '#fff',
          zIndex: 1050,
          boxShadow: '-8px 0 32px rgba(15,23,42,0.12)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #f1f5f9',
        }}
      >
        {view === 'send' ? (
          <SendSheet
            onBack={() => setView('list')}
            onSent={() => {
              setView('list');
              fetchMessages(false);
            }}
            chatHeaders={getChatHeaders()}
          />
        ) : view === 'detail' && selected ? (
          // ── Màn hình chi tiết cuộc hội thoại 1-1 ──
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header thông tin đối tác hội thoại */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#fff',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setView('list')}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                }}
              >
                <i className="bi bi-arrow-left" style={{ fontSize: '13px' }} />
              </button>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                  {(selected.isSentByMe
                    ? selected.recipientName || 'N'
                    : selected.senderName
                  )
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: '13.5px',
                    color: '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selected.isSentByMe
                    ? selected.recipientName || 'Người nhận'
                    : selected.senderName}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '11px',
                    color: '#6366f1',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {[selected.senderPosition, selected.senderDepartment]
                    .filter(Boolean)
                    .join(' • ') || 'Trực tuyến'}
                </p>
              </div>
              <span
                style={{
                  fontSize: '10.5px',
                  color: '#94a3b8',
                  background: '#f1f5f9',
                  padding: '3px 8px',
                  borderRadius: '99px',
                  flexShrink: 0,
                }}
              >
                {thread.length} tin
              </span>
            </div>

            {/* Lịch sử hội thoại */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px 14px 8px',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {threadLoading && thread.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <p style={{ margin: 0, fontSize: '12.5px' }}>Đang tải lịch sử hội thoại...</p>
                </div>
              ) : thread.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <i
                    className="bi bi-chat-dots"
                    style={{ fontSize: '28px', display: 'block', marginBottom: '6px' }}
                  />
                  <p style={{ margin: 0, fontSize: '12.5px' }}>Chưa có tin nhắn nào</p>
                </div>
              ) : (
                thread.map((msg, idx) => {
                  const isMe = msg.isSentByMe;
                  const msgDate = new Date(msg.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });
                  const prevDate =
                    idx > 0
                      ? new Date(thread[idx - 1].createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : null;
                  const showDateSep = idx === 0 || msgDate !== prevDate;
                  const msgTime = formatClock(msg.createdAt);

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateSep && (
                        <div style={{ textAlign: 'center', margin: '4px 0' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              color: '#94a3b8',
                              background: '#e2e8f0',
                              padding: '2px 10px',
                              borderRadius: '99px',
                              fontWeight: 500,
                            }}
                          >
                            {msgDate ===
                            new Date().toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                              ? 'Hôm nay'
                              : msgDate}
                          </span>
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: isMe ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          gap: '6px',
                        }}
                      >
                        {!isMe && (
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginBottom: '2px',
                            }}
                          >
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: '11px' }}>
                              {msg.senderName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        <div
                          style={{
                            maxWidth: '78%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <div
                            style={{
                              padding: msg.content ? '9px 13px' : '6px',
                              borderRadius: isMe
                                ? '14px 14px 3px 14px'
                                : '14px 14px 14px 3px',
                              background: isMe
                                ? 'linear-gradient(135deg,#6366f1,#7c3aed)'
                                : '#fff',
                              color: isMe ? '#fff' : '#1e293b',
                              border: isMe ? 'none' : '1px solid #e8edf2',
                              boxShadow: isMe
                                ? '0 2px 8px rgba(99,102,241,0.25)'
                                : '0 1px 3px rgba(0,0,0,0.05)',
                              wordBreak: 'break-word',
                            }}
                          >
                            {msg.content && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: '13px',
                                  lineHeight: '1.55',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {msg.content}
                              </p>
                            )}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div style={{ marginTop: msg.content ? '6px' : 0 }}>
                                <AttachmentList
                                  items={msg.attachments}
                                  isBubbleSentByMe={isMe}
                                />
                              </div>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              color: '#94a3b8',
                              marginTop: '3px',
                              paddingLeft: '3px',
                              paddingRight: '3px',
                            }}
                          >
                            {msgTime}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Thanh điều khiển nhắn tin bằng giọng nói */}
            <VoiceControlPanel voice={replyVoice} textValue={replyContent} />

            {/* Khung nhập phản hồi */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (replyVoice.isActive) {
                  const combinedText = [replyContent.trim(), replyVoice.interimText.trim()]
                    .filter(Boolean)
                    .join(' ');
                  if (replyVoice.mode === 'audio' || !combinedText) {
                    replyVoice.stopAndSendAudio();
                  } else {
                    replyVoice.stopAndSendText();
                  }
                  return;
                }
                handleSendReply(e);
              }}
              style={{
                padding: '10px 12px 12px',
                borderTop: '1px solid #f1f5f9',
                background: '#fff',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {replyError && (
                <div
                  style={{
                    padding: '6px 10px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '7px',
                    color: '#dc2626',
                    fontSize: '11.5px',
                  }}
                >
                  {replyError}
                </div>
              )}

              {replyAttachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {replyAttachments.map((att, idx) =>
                    isAudioAttachment(att) ? (
                      <PendingAudioAttachmentChip
                        key={idx}
                        att={att}
                        onRemove={() =>
                          setReplyAttachments((prev) => prev.filter((_, i) => i !== idx))
                        }
                      />
                    ) : (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          background: '#f8fafc',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          fontSize: '11px',
                        }}
                      >
                        <i
                          className={`bi ${getFileIcon(att.type, att.name)}`}
                          style={{ color: '#6366f1' }}
                        />
                        <span
                          style={{
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: '#334155',
                          }}
                        >
                          {att.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setReplyAttachments((prev) => prev.filter((_, i) => i !== idx))
                          }
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '11px',
                          }}
                        >
                          <i className="bi bi-x" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => replyFileInputRef.current?.click()}
                  title="Đính kèm ảnh / tệp tin"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#6366f1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className="bi bi-paperclip" style={{ fontSize: '15px' }} />
                </button>
                <input
                  ref={replyFileInputRef}
                  type="file"
                  multiple
                  accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar,.txt"
                  onChange={handleReplyFileChange}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  onClick={() => replyVoice.startVoice('audio')}
                  title="Ghi âm tin nhắn thoại"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border:
                      replyVoice.isActive && replyVoice.mode === 'audio'
                        ? '1.5px solid #f43f5e'
                        : '1.5px solid #c7d2fe',
                    background:
                      replyVoice.isActive && replyVoice.mode === 'audio' ? '#f43f5e' : '#eef2ff',
                    color:
                      replyVoice.isActive && replyVoice.mode === 'audio' ? '#fff' : '#4f46e5',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className="bi bi-soundwave" style={{ fontSize: '15px' }} />
                </button>

                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <textarea
                    value={
                      replyVoice.interimText
                        ? `${replyContent}${replyContent && !replyContent.endsWith(' ') ? ' ' : ''}${replyVoice.interimText}`
                        : replyContent
                    }
                    onChange={(e) => {
                      setReplyContent(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(e as any);
                      }
                    }}
                    placeholder={`Nhắn tin hoặc nói cho ${
                      selected.isSentByMe
                        ? selected.recipientName || 'người nhận'
                        : selected.senderName
                    }...`}
                    rows={1}
                    style={{
                      width: '100%',
                      padding: '7px 32px 7px 11px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '9px',
                      fontSize: '12.5px',
                      color: '#0f172a',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      lineHeight: '1.45',
                      minHeight: '34px',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => replyVoice.startVoice('dictation')}
                    title="Nhập tin nhắn bằng giọng nói (Tiếng Việt)"
                    style={{
                      position: 'absolute',
                      right: '5px',
                      bottom: '4px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      border: 'none',
                      background:
                        replyVoice.isActive && replyVoice.mode === 'dictation'
                          ? '#f43f5e'
                          : 'transparent',
                      color:
                        replyVoice.isActive && replyVoice.mode === 'dictation'
                          ? '#fff'
                          : '#4f46e5',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i
                      className={`bi ${
                        replyVoice.isActive && replyVoice.mode === 'dictation'
                          ? 'bi-mic-fill'
                          : 'bi-mic'
                      }`}
                      style={{ fontSize: '13px' }}
                    />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={replySending}
                  style={{
                    height: '34px',
                    padding: '0 13px',
                    borderRadius: '8px',
                    border: 'none',
                    background: replySending
                      ? '#a5b4fc'
                      : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: replySending ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    flexShrink: 0,
                  }}
                >
                  <i className="bi bi-send-fill" style={{ fontSize: '12px' }} />
                  {replySending ? '...' : 'Gửi'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          // ── Màn hình danh sách cuộc trò chuyện (List view) ──
          <>
            <div
              style={{
                padding: '15px 18px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg,#fafafe,#f4f6fb)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 8px rgba(99,102,241,0.3)',
                  }}
                >
                  <i className="bi bi-chat-dots-fill" style={{ color: '#fff', fontSize: '15px' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#0f172a' }}>
                      Tin nhắn nội bộ
                    </span>
                    {unreadCount > 0 && (
                      <span
                        style={{
                          background: '#6366f1',
                          color: '#fff',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '99px',
                          lineHeight: '16px',
                        }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                    Trò chuyện nội bộ & hỗ trợ Khách hàng trực tuyến
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    style={{
                      padding: '5px 9px',
                      borderRadius: '7px',
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      fontSize: '11px',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    <i className="bi bi-check2-all" style={{ marginRight: '3px' }} />
                    Đọc hết
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#f1f5f9',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                  }}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px 6px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div style={{ position: 'relative' }}>
                <i
                  className="bi bi-search"
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: '13px',
                  }}
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm tin nhắn, khách hàng, đồng nghiệp..."
                  style={{
                    width: '100%',
                    padding: '7px 30px 7px 32px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                  >
                    <i className="bi bi-x-circle-fill" style={{ fontSize: '13px' }} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['all', 'unread'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: '7px',
                        border: 'none',
                        background: tab === t ? '#eef2ff' : 'transparent',
                        color: tab === t ? '#4f46e5' : '#64748b',
                        fontWeight: tab === t ? 600 : 500,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {t === 'unread'
                        ? `Chưa đọc${unreadCount > 0 ? ` (${unreadCount})` : ''}`
                        : 'Tất cả'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setView('send')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '7px',
                    border: 'none',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <i className="bi bi-pencil-square" style={{ fontSize: '11px' }} />
                  Soạn tin nhắn mới
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading && displayed.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                  <p style={{ margin: 0, fontSize: '13px' }}>Đang tải tin nhắn...</p>
                </div>
              ) : displayed.length === 0 ? (
                <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: '#f8fafc',
                      border: '1.5px dashed #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <i
                      className="bi bi-chat-square-Text"
                      style={{ fontSize: '24px', color: '#cbd5e1' }}
                    />
                  </div>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontWeight: 600,
                      fontSize: '13.5px',
                      color: '#475569',
                    }}
                  >
                    {tab === 'unread' ? 'Không có tin nhắn chưa đọc' : 'Chưa có tin nhắn nào'}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                    {tab === 'unread'
                      ? 'Bạn đã xem hết tất cả tin nhắn.'
                      : 'Bấm "Soạn tin nhắn mới" để bắt đầu trò chuyện.'}
                  </p>
                </div>
              ) : (
                displayed.map((m) => {
                  const partnerName = m.isSentByMe
                    ? m.recipientName || 'Người nhận'
                    : m.senderName;
                  const isCustomerPartner =
                    m.senderId === 'guest-customer' ||
                    m.recipientUserId === 'guest-customer' ||
                    m.senderDepartmentCode === 'customer';

                  return (
                    <div
                      key={m.participantId}
                      onClick={() => markRead(m)}
                      style={{
                        padding: '13px 16px',
                        borderBottom: '1px solid #f8fafc',
                        display: 'flex',
                        gap: '11px',
                        alignItems: 'flex-start',
                        background: m.isRead ? '#fff' : '#fafafe',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '11px',
                          background: isCustomerPartner
                            ? 'linear-gradient(135deg,#10b981,#059669)'
                            : m.isRead
                            ? '#f1f5f9'
                            : 'linear-gradient(135deg,#eef2ff,#e0e7ff)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '1px',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            color: isCustomerPartner
                              ? '#fff'
                              : m.isRead
                              ? '#64748b'
                              : '#6366f1',
                          }}
                        >
                          {partnerName.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            marginBottom: '2px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              minWidth: 0,
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: '13px',
                                fontWeight: m.isRead ? 600 : 700,
                                color: m.isRead ? '#334155' : '#0f172a',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {partnerName}
                            </p>
                            {isCustomerPartner && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#047857',
                                  background: '#ecfdf5',
                                  border: '1px solid #a7f3d0',
                                  padding: '1px 6px',
                                  borderRadius: '99px',
                                  flexShrink: 0,
                                }}
                              >
                                Khách hàng
                              </span>
                            )}
                          </div>
                          {!m.isRead && (
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: '#6366f1',
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>

                        {!m.isSentByMe && (m.senderPosition || m.senderDepartment) && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              color: '#6366f1',
                              fontWeight: 500,
                              display: 'block',
                              marginBottom: '2px',
                            }}
                          >
                            {[m.senderPosition, m.senderDepartment].filter(Boolean).join(' • ')}
                          </span>
                        )}

                        <p
                          style={{
                            margin: '0 0 4px',
                            fontSize: '12px',
                            color: m.isRead ? '#64748b' : '#334155',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {m.isSentByMe && (
                            <span style={{ color: '#94a3b8', fontWeight: 500 }}>Bạn: </span>
                          )}
                          {m.content ||
                            (m.attachments && m.attachments.length > 0
                              ? m.attachments.some((a) => isAudioAttachment(a))
                                ? '🎤 [Tin nhắn thoại]'
                                : `[Đính kèm ${m.attachments.length} tệp]`
                              : '')}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {timeAgo(m.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};
