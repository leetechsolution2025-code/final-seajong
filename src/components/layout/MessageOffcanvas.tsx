import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAvatarInitials } from '../../utils/avatar';
import { Offcanvas } from '../common/Offcanvas';
import {
  MessageSquare,
  Search,
  X,
  ArrowLeft,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  User,
  Users,
  Plus,
  Paperclip,
  Mic,
  Send,
  Loader2,
  Phone,
  Sparkles,
} from 'lucide-react';

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
        background: isBubbleSentByMe ? 'rgba(0, 104, 255, 0.08)' : '#f8fafc',
        border: isBubbleSentByMe ? '1px solid rgba(0, 104, 255, 0.2)' : '1px solid #e2e8f0',
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
          background: '#0068ff',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0, 104, 255, 0.25)',
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
                      ? '#0068ff'
                      : 'rgba(0, 104, 255, 0.25)'
                    : active
                    ? '#0068ff'
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
            color: isBubbleSentByMe ? '#081c36' : '#64748b',
            fontWeight: 600,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <i className="bi bi-mic-fill" style={{ fontSize: '10px', color: '#0068ff' }} />
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
            border: '1px solid #dbeafe',
            fontSize: '11.5px',
            color: '#081c36',
            lineHeight: 1.4,
          }}
        >
          <i className="bi bi-quote text-[#0068ff]" style={{ marginRight: '4px' }} />
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
                ? '1px solid #c7dcfc'
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
                background: isBubbleSentByMe ? 'rgba(255,255,255,0.9)' : '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: '#081c36',
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
                  color: '#0068ff',
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
              background: isBubbleSentByMe ? 'rgba(255,255,255,0.85)' : '#f8fafc',
              borderRadius: '8px',
              border: isBubbleSentByMe
                ? '1px solid #c7dcfc'
                : '1px solid #e2e8f0',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: isBubbleSentByMe ? '#e5efff' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <i
                className={`bi ${getFileIcon(att.type, att.name)}`}
                style={{ fontSize: '14px', color: '#0068ff' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#081c36',
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
                  color: '#64748b',
                }}
              >
                {formatFileSize(att.size)}
              </span>
            </div>
            <i
              className="bi bi-download"
              style={{
                fontSize: '13px',
                color: '#0068ff',
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
    if (sending) return;
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
    <div className="flex flex-col h-full bg-white">
      <form
        onSubmit={handleSend}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5"
      >
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-medium flex items-center gap-2">
            <i className="bi bi-exclamation-circle-fill shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5">
            Gửi đến <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
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
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    active
                      ? 'border-[#0068ff] bg-[#0068ff]/10 text-[#0068ff] shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <i className={`bi ${opt.icon}`} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {(audience === 'individual' || audience === 'group') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                {audience === 'individual' ? 'Chọn người nhận' : 'Chọn thành viên nhận tin'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              {audience === 'group' && groupIds.length > 0 && (
                <span className="text-[11px] font-semibold text-[#0068ff] bg-[#0068ff]/10 px-2 py-0.5 rounded-full border border-[#0068ff]/20">
                  Đã chọn {groupIds.length} người
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc phòng ban..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0068ff] focus:border-[#0068ff] focus:bg-white text-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="max-h-[160px] overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 shadow-2xs">
              {filteredUsers.length === 0 ? (
                <p className="m-0 p-3 text-center text-xs text-slate-400">
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
                      className={`p-2.5 flex items-center gap-2.5 cursor-pointer transition-colors ${
                        checked ? 'bg-[#0068ff]/8' : 'hover:bg-slate-50'
                      }`}
                    >
                      {audience === 'individual' ? (
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            checked
                              ? 'border-[#0068ff] bg-[#0068ff]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      ) : (
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            checked
                              ? 'border-[#0068ff] bg-[#0068ff] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <CheckCheck className="w-3 h-3 text-white" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`m-0 text-xs truncate ${
                            checked ? 'font-bold text-[#0068ff]' : 'font-semibold text-slate-800'
                          }`}
                        >
                          {u.name}
                        </p>
                        {(u.code || u.position || u.department) && (
                          <span className="text-[10.5px] text-slate-500 block truncate">
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">
              Nội dung tin nhắn <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => sendSheetVoice.startVoice('dictation')}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  sendSheetVoice.isActive && sendSheetVoice.mode === 'dictation'
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : 'bg-[#0068ff]/10 border-[#0068ff]/20 text-[#0068ff] hover:bg-[#0068ff]/20'
                }`}
                title="Nhập nội dung bằng giọng nói"
              >
                <Mic className="w-3 h-3" />
                <span>Nói thành chữ</span>
              </button>
              <button
                type="button"
                onClick={() => sendSheetVoice.startVoice('audio')}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  sendSheetVoice.isActive && sendSheetVoice.mode === 'audio'
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                title="Ghi âm tin nhắn thoại đính kèm"
              >
                <i className="bi bi-soundwave text-[11px]" />
                <span>Ghi âm</span>
              </button>
            </div>
          </div>
          {sendSheetVoice.isActive && (
            <div className="mb-2 rounded-xl overflow-hidden border border-[#0068ff]/20">
              <VoiceControlPanel voice={sendSheetVoice} textValue={content} />
            </div>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập tin nhắn hoặc bấm Micro để nói..."
            rows={3}
            className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0068ff] focus:border-[#0068ff] focus:bg-white text-slate-800 placeholder-slate-400 resize-none transition-all leading-relaxed"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">
              Đính kèm tệp / ghi âm
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 rounded-lg border border-[#0068ff]/20 bg-[#0068ff]/10 hover:bg-[#0068ff]/20 text-[#0068ff] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Chọn tệp</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {attachments.map((att, idx) =>
                isAudioAttachment(att) ? (
                  <div key={idx} className="flex items-center">
                    <PendingAudioAttachmentChip att={att} onRemove={() => removeAttachment(idx)} />
                  </div>
                ) : (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    {att.type.startsWith('image/') ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-7 h-7 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <Paperclip className="w-4 h-4 text-[#0068ff] shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="m-0 text-xs font-semibold text-slate-800 truncate">
                        {att.name}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {formatFileSize(att.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
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
          className="mt-auto py-2.5 px-4 rounded-xl bg-[#0068ff] hover:bg-[#0058db] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{sending ? 'Đang gửi...' : 'Gửi tin nhắn ngay'}</span>
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

  const isCustomerSendingRef = useRef(false);

  const handleSendCustomerMessage = async (
    rawText?: string,
    directAttachments?: AttachmentItem[]
  ) => {
    if (isCustomerSendingRef.current || customerSending) return;
    const text = (rawText ?? customerInput).trim();
    const effectiveAttachments = directAttachments ?? customerAttachments;
    if (!text && effectiveAttachments.length === 0) return;

    isCustomerSendingRef.current = true;
    setCustomerSending(true);

    if (rawText === undefined) setCustomerInput('');
    const filesToSend = [...effectiveAttachments];
    if (!directAttachments) setCustomerAttachments([]);

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
      if (rawText === undefined) setCustomerInput(text);
      if (!directAttachments) setCustomerAttachments(filesToSend);
    } finally {
      isCustomerSendingRef.current = false;
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
  const isSendingReplyRef = useRef(false);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
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

  // Mở offcanvas: khởi tạo lại về Slide 1 danh sách
  useEffect(() => {
    if (isOpen && !isCustomer) {
      setView('list');
      setSelected(null);
      setSearchQuery('');
      fetchMessages(false);
    }
  }, [isOpen]);

  // Polling danh sách tin nhắn định kỳ mà KHÔNG reset view của người dùng
  useEffect(() => {
    if (!isOpen || isCustomer) return;
    const timer = setInterval(() => {
      fetchMessages(true);
    }, 3500);
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
    if (!selected || isSendingReplyRef.current) return;
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

    // Atomic synchronous guard to prevent duplicate submission on Enter or fast click
    isSendingReplyRef.current = true;
    setReplySending(true);
    setReplyError('');

    // Clear input immediately so subsequent events or keystrokes find an empty box
    if (directText === undefined) {
      setReplyContent('');
      if (replyTextareaRef.current) {
        replyTextareaRef.current.style.height = 'auto';
      }
    }
    if (!directAttachments) setReplyAttachments([]);

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
      if (data.message) {
        setThread((prev) => [...prev, data.message]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      }
      fetchMessages(true);
    } catch (err: any) {
      // Restore input text and attachments on failure
      if (directText === undefined) {
        setReplyContent(textToSend);
      }
      if (!directAttachments) {
        setReplyAttachments(filesToSend);
      }
      setReplyError(err.message || 'Lỗi gửi tin nhắn');
    } finally {
      isSendingReplyRef.current = false;
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
                <div className="w-10 h-10 rounded-full bg-[#0068ff] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  {activeStaff.avatarText || getAvatarInitials(activeStaff.name)}
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px] font-bold text-slate-900 truncate">
                    {activeStaff.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[#0068ff]/10 text-[#0068ff] border border-[#0068ff]/20 text-[10px] font-semibold">
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

          {/* Danh sách tin nhắn hội thoại thực tế từ CSDL - Zalo Theme */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#eef3f7]">
            {/* Lời chào mở đầu của nhân viên bán hàng */}
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10.5px] font-semibold text-[#0068ff]">
                  {activeStaff.name}
                </span>
                <span className="text-[10px] text-slate-400">Hỗ trợ trực tuyến</span>
              </div>
              <div className="max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed shadow-2xs bg-white text-[#081c36] border border-[#e2e8f0] rounded-bl-xs">
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
                      className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed shadow-2xs break-words ${
                        isMe
                          ? 'bg-[#e5efff] text-[#081c36] border border-[#c7dcfc] rounded-br-xs'
                          : 'bg-white text-[#081c36] border border-[#e2e8f0] rounded-bl-xs'
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
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-[#0068ff]/10 text-slate-600 hover:text-[#0068ff] border border-slate-200/80 hover:border-[#0068ff]/30 text-[11px] font-medium transition-colors cursor-pointer"
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
                    <i className={`bi ${getFileIcon(att.type, att.name)} text-[#0068ff]`} />
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
              className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-[#0068ff]/10 text-slate-500 hover:text-[#0068ff] flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
                  : 'border-[#0068ff]/30 bg-[#0068ff]/10 hover:bg-[#0068ff]/20 text-[#0068ff]'
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if ((e.nativeEvent as any)?.isComposing) return;
                    e.preventDefault();
                    if (isCustomerSendingRef.current || customerSending) return;
                    handleSendCustomerMessage();
                  }
                }}
                placeholder={`Nhắn tin hoặc nói cho ${activeStaff.name}...`}
                className="w-full pl-3 pr-9 py-2 text-[16px] sm:text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0068ff] bg-slate-50/70 focus:bg-white text-slate-800"
              />
              <button
                type="button"
                onClick={() => customerVoice.startVoice('dictation')}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center border-0 transition-all cursor-pointer ${
                  customerVoice.isActive && customerVoice.mode === 'dictation'
                    ? 'bg-rose-500 text-white shadow-2xs animate-pulse'
                    : 'bg-transparent hover:bg-[#0068ff]/10 text-[#0068ff]'
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
              type="button"
              onClick={() => {
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
                  ? 'bg-[#0068ff] hover:bg-[#0058db] text-white shadow-xs cursor-pointer'
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
  // GIAO DIỆN 2: NHÂN VIÊN NỘI BỘ (CHUẨN ENTERPRISE SEAJONG DESIGN SYSTEM)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1050] overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel - Chuẩn AGENTS.md width 400px */}
      <div className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 max-w-full flex pl-0 md:pl-10 pointer-events-none">
        <div 
          className="offcanvas-panel pointer-events-auto w-full sm:w-[400px] max-w-[400px] h-full bg-white shadow-2xl flex flex-col border-0 sm:border-l border-slate-200 animate-slide-left overflow-hidden"
          style={{ width: '400px' }}
        >
          {/* HEADER CHUẨN ĐỒNG BỘ TOÀN DỰ ÁN */}
          <div className="offcanvas-header bg-slate-50/90 border-b border-slate-200 py-3.5 px-4 flex items-center justify-between shrink-0">
            {view === 'list' ? (
              <div className="offcanvas-header-content flex items-center gap-3 min-w-0 flex-1">
                <div 
                  className="offcanvas-header-icon shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 104, 255, 0.12) 0%, rgba(0, 104, 255, 0.22) 100%)',
                    color: '#0068ff',
                    borderColor: 'rgba(0, 104, 255, 0.25)',
                  }}
                  aria-hidden="true"
                >
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="offcanvas-header-text min-w-0 flex-1">
                  <h3 className="offcanvas-title">Tin nhắn nội bộ</h3>
                  <div className="offcanvas-description">
                    {unreadCount > 0 ? `${unreadCount} tin nhắn chưa đọc` : 'Tất cả đã đọc'}
                  </div>
                </div>
              </div>
            ) : view === 'detail' && selected ? (
              <div className="offcanvas-header-content flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="px-2 py-1.5 -ml-1 rounded-lg text-slate-700 hover:text-[#0068ff] hover:bg-slate-200/70 transition-colors flex items-center gap-1.5 text-sm font-semibold cursor-pointer shrink-0"
                  title="Quay về danh sách tin nhắn"
                >
                  <ArrowLeft className="w-4 h-4 text-[#0068ff]" />
                  <span>Quay lại</span>
                </button>
                <div className="h-4 w-px bg-slate-300 mx-1 shrink-0" />
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-full bg-[#0068ff] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {(selected.isSentByMe ? selected.recipientName || 'N' : selected.senderName).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="offcanvas-title text-sm font-bold text-slate-900 truncate">
                      {selected.isSentByMe ? selected.recipientName || 'Người nhận' : selected.senderName}
                    </h4>
                    <div className="text-[11px] text-[#0068ff] font-medium truncate">
                      {[selected.senderPosition, selected.senderDepartment].filter(Boolean).join(' • ') || 'Trực tuyến'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="offcanvas-header-content flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="px-2 py-1.5 -ml-1 rounded-lg text-slate-700 hover:text-[#0068ff] hover:bg-slate-200/70 transition-colors flex items-center gap-1.5 text-sm font-semibold cursor-pointer shrink-0"
                  title="Quay về danh sách tin nhắn"
                >
                  <ArrowLeft className="w-4 h-4 text-[#0068ff]" />
                  <span>Quay lại</span>
                </button>
                <div className="h-4 w-px bg-slate-300 mx-1 shrink-0" />
                <h3 className="offcanvas-title text-sm sm:text-base font-bold text-slate-900">
                  Soạn tin nhắn mới
                </h3>
              </div>
            )}

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {view === 'list' && unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-[#0068ff] hover:bg-slate-200/60 transition-colors text-xs flex items-center gap-1 font-semibold cursor-pointer"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className="w-4 h-4 text-[#0068ff]" />
                  <span className="hidden sm:inline">Đọc hết</span>
                </button>
              )}
              {view === 'detail' && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold shrink-0">
                  {thread.length} tin
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="offcanvas-close-btn p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Đóng bảng trượt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* VÙNG CHỨA 2 SLIDE CHUYỂN ĐỘNG TRƯỢT NGANG */}
          <div className="flex-1 overflow-hidden relative w-full h-full">
            <div 
              className="flex w-full h-full transition-transform duration-300 ease-in-out"
              style={{ transform: view === 'list' ? 'translateX(0%)' : 'translateX(-100%)' }}
            >
              {/* ══════════════ SLIDE 1: DANH SÁCH HỘI THOẠI ══════════════ */}
              <div className="w-full min-w-full shrink-0 h-full flex flex-col bg-white overflow-hidden">
                {/* Hộp tìm kiếm tin nhắn */}
                <div className="px-3.5 pt-2.5 pb-2 bg-slate-50/50 border-b border-slate-100 shrink-0">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm tin nhắn, đồng nghiệp, phòng ban..."
                      className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0068ff] focus:border-[#0068ff] transition-all text-slate-800 placeholder-slate-400"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Xóa tìm kiếm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs & Nút soạn tin nhắn mới */}
                <div className="flex items-center justify-between px-4 pt-2 border-b border-slate-100 bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTab('all')}
                      className={`pb-2.5 text-sm font-semibold px-2 border-b-2 transition-colors cursor-pointer ${
                        tab === 'all'
                          ? 'border-[#0068ff] text-[#0068ff]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tất cả ({conversationList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('unread')}
                      className={`pb-2.5 text-sm font-semibold px-2 border-b-2 transition-colors cursor-pointer ${
                        tab === 'unread'
                          ? 'border-[#0068ff] text-[#0068ff]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Chưa đọc{unreadCount > 0 ? ` (${unreadCount})` : ''}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setView('send')}
                    className="mb-2 px-2.5 py-1.5 rounded-lg bg-[#0068ff] hover:bg-[#0058db] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Soạn tin</span>
                  </button>
                </div>

                {/* Danh sách các cuộc trò chuyện */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {loading && displayed.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="w-8 h-8 text-[#0068ff] animate-spin mb-2" />
                      <p className="text-sm font-medium">Đang tải tin nhắn...</p>
                    </div>
                  ) : displayed.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center px-4">
                      <CheckCircle2 className="w-11 h-11 stroke-[1.5] text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-700">
                        {searchQuery
                          ? 'Không tìm thấy tin nhắn phù hợp'
                          : tab === 'unread'
                          ? 'Không có tin nhắn chưa đọc'
                          : 'Chưa có cuộc trò chuyện nào'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {tab === 'unread'
                          ? 'Bạn đã xem hết tất cả tin nhắn.'
                          : 'Bấm "Soạn tin" để bắt đầu trò chuyện nội bộ.'}
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
                      const isGroup =
                        partnerName.startsWith('Nhóm') ||
                        partnerName.includes('người nhận');

                      return (
                        <div
                          key={m.participantId}
                          onClick={() => markRead(m)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer relative group flex gap-3 items-start ${
                            !m.isRead
                              ? 'bg-[#0068ff]/6 border-[#0068ff]/30 shadow-xs hover:border-[#0068ff]/50 hover:bg-[#0068ff]/10'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Avatar */}
                          <div className="relative shrink-0 mt-0.5">
                            <div
                              className={`w-10 h-10 rounded-full text-white font-bold text-sm flex items-center justify-center shadow-xs ${
                                isCustomerPartner
                                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                  : isGroup
                                  ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                                  : 'bg-[#0068ff]'
                              }`}
                            >
                              {isGroup ? (
                                <Users className="w-5 h-5 text-white" />
                              ) : (
                                partnerName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
                          </div>

                          {/* Nội dung tóm tắt */}
                          <div className="flex-1 min-w-0">
                            {/* Dòng 1: Tên & Thời gian & Chấm chưa đọc */}
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0068ff] transition-colors truncate">
                                  {partnerName}
                                </h4>
                                {isCustomerPartner && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 shrink-0">
                                    Khách hàng
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs text-slate-400 font-medium">
                                  {timeAgo(m.createdAt)}
                                </span>
                                {!m.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-[#0068ff] ring-2 ring-[#0068ff]/20" />
                                )}
                              </div>
                            </div>

                            {/* Dòng 2: Chức vụ & Bộ phận */}
                            {!m.isSentByMe && (m.senderPosition || m.senderDepartment) && (
                              <div className="mb-1">
                                <span className="inline-block text-[11px] font-semibold text-[#0068ff] bg-[#0068ff]/10 border border-[#0068ff]/20 px-1.5 py-0.5 rounded-md truncate max-w-full">
                                  {[m.senderPosition, m.senderDepartment].filter(Boolean).join(' • ')}
                                </span>
                              </div>
                            )}

                            {/* Dòng 3: Nội dung tin nhắn cuối */}
                            <p className="text-xs text-slate-600 line-clamp-1 leading-relaxed">
                              {m.isSentByMe && (
                                <span className="font-semibold text-slate-500">Bạn: </span>
                              )}
                              {m.content ||
                                (m.attachments && m.attachments.length > 0
                                  ? m.attachments.some((a) => isAudioAttachment(a))
                                    ? '🎤 [Tin nhắn thoại]'
                                    : `📎 [Đính kèm ${m.attachments.length} tệp]`
                                  : '')}
                            </p>
                          </div>

                          {/* Mũi tên hover */}
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0068ff] group-hover:translate-x-0.5 transition-all shrink-0 mt-3 hidden sm:block" />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Slide 1 */}
                <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
                  <span>Hệ thống tin nhắn Seajong v2.0</span>
                  <span className="font-semibold text-[#0068ff]">{displayed.length} cuộc hội thoại</span>
                </div>
              </div>

              {/* ══════════════ SLIDE 2: CHI TIẾT HỘI THOẠI HOẶC SOẠN TIN ══════════════ */}
              <div className="w-full min-w-full shrink-0 h-full flex flex-col bg-white overflow-hidden">
                {view === 'send' ? (
                  <SendSheet
                    onBack={() => setView('list')}
                    onSent={() => {
                      setView('list');
                      fetchMessages(false);
                    }}
                    chatHeaders={getChatHeaders()}
                  />
                ) : selected ? (
                  <div className="flex flex-col h-full bg-[#eef3f7]">
                    {/* Danh sách tin nhắn trong thread - Zalo Look & Feel */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#eef3f7]">
                      {threadLoading && thread.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                          <Loader2 className="w-8 h-8 text-[#0068ff] animate-spin mb-2" />
                          <p className="text-sm font-medium">Đang tải lịch sử hội thoại...</p>
                        </div>
                      ) : thread.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center px-4">
                          <MessageSquare className="w-10 h-10 stroke-[1.5] text-slate-300 mb-2" />
                          <p className="text-sm font-medium text-slate-700">Chưa có tin nhắn nào</p>
                          <p className="text-xs text-slate-400 mt-1">Gửi tin nhắn đầu tiên để bắt đầu trò chuyện</p>
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
                                <div className="text-center my-1">
                                  <span className="text-[10.5px] font-semibold text-[#556575] bg-[#dce6ee] px-2.5 py-0.5 rounded-full inline-block">
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
                                className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                              >
                                {!isMe && (
                                  <div className="w-7 h-7 rounded-full bg-[#0068ff] text-white font-bold text-xs flex items-center justify-center shrink-0 mb-1 shadow-2xs">
                                    {msg.senderName.charAt(0).toUpperCase()}
                                  </div>
                                )}

                                <div
                                  className={`max-w-[82%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                >
                                  {!isMe && thread.some((t) => t.senderId !== msg.senderId && !t.isSentByMe) && (
                                    <span className="text-[10px] font-bold text-[#0068ff] px-1 mb-0.5">
                                      {msg.senderName}
                                    </span>
                                  )}

                                  <div
                                    className={`p-3 rounded-2xl break-words transition-all ${
                                      isMe
                                        ? 'bg-[#e5efff] text-[#081c36] border border-[#c7dcfc] shadow-2xs rounded-br-xs'
                                        : 'bg-white text-[#081c36] border border-[#e2e8f0] shadow-2xs rounded-bl-xs'
                                    }`}
                                  >
                                    {msg.content && (
                                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap m-0">
                                        {msg.content}
                                      </p>
                                    )}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                      <div className={msg.content ? 'mt-2 pt-2 border-t border-slate-200/60' : ''}>
                                        <AttachmentList
                                          items={msg.attachments}
                                          isBubbleSentByMe={isMe}
                                        />
                                      </div>
                                    )}
                                  </div>

                                  <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
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
                      className="p-3 border-t border-slate-200 bg-white flex flex-col gap-2 shrink-0"
                    >
                      {replyError && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-xs font-medium">
                          {replyError}
                        </div>
                      )}

                      {/* Pending attachments */}
                      {replyAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
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
                                className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-700"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-[#0068ff] shrink-0" />
                                <span className="max-w-[120px] truncate">{att.name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReplyAttachments((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="text-slate-400 hover:text-rose-500 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* Hàng ô nhập + nút hành động */}
                      <div className="flex items-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => replyFileInputRef.current?.click()}
                          title="Đính kèm ảnh / tệp tin"
                          className="p-2 rounded-xl text-slate-500 hover:text-[#0068ff] hover:bg-[#0068ff]/10 border border-slate-200 transition-colors shrink-0 cursor-pointer"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <input
                          ref={replyFileInputRef}
                          type="file"
                          multiple
                          accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar,.txt"
                          onChange={handleReplyFileChange}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => replyVoice.startVoice('audio')}
                          title="Ghi âm tin nhắn thoại"
                          className={`p-2 rounded-xl border transition-colors shrink-0 cursor-pointer ${
                            replyVoice.isActive && replyVoice.mode === 'audio'
                              ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                              : 'bg-[#0068ff]/10 text-[#0068ff] border-[#0068ff]/30 hover:bg-[#0068ff]/20'
                          }`}
                        >
                          <Mic className="w-4 h-4" />
                        </button>

                        <div className="flex-1 relative flex items-center min-w-0">
                          <textarea
                            ref={replyTextareaRef}
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
                                if ((e.nativeEvent as any)?.isComposing) return;
                                e.preventDefault();
                                if (isSendingReplyRef.current || replySending) return;
                                handleSendReply();
                              }
                            }}
                            placeholder={`Nhắn tin cho ${
                              selected.isSentByMe
                                ? selected.recipientName || 'người nhận'
                                : selected.senderName
                            }...`}
                            rows={1}
                            className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0068ff] focus:border-[#0068ff] focus:bg-white text-slate-800 placeholder-slate-400 resize-none min-h-[38px] max-h-[120px] transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => replyVoice.startVoice('dictation')}
                            title="Nhập tin nhắn bằng giọng nói (Tiếng Việt)"
                            className={`absolute right-2 bottom-2 p-1 rounded-lg transition-colors cursor-pointer ${
                              replyVoice.isActive && replyVoice.mode === 'dictation'
                                ? 'bg-rose-500 text-white animate-pulse'
                                : 'text-slate-400 hover:text-[#0068ff]'
                            }`}
                          >
                            <Mic className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
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
                            handleSendReply();
                          }}
                          disabled={
                            replySending ||
                            (!replyContent.trim() &&
                              replyAttachments.length === 0 &&
                              !replyVoice.isActive)
                          }
                          className="p-2 rounded-xl bg-[#0068ff] hover:bg-[#0058db] text-white shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <MessageSquare className="w-10 h-10 stroke-[1.5] text-slate-300 mb-2" />
                    <p className="text-sm font-medium">Chưa chọn cuộc trò chuyện nào</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
