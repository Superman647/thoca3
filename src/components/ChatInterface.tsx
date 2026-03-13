import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { Send, Volume2, Loader2, ArrowLeft, User, Sparkles, BookOpen, X, Square, Activity, Lightbulb, Feather } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── CẤU HÌNH ──────────────────────────────────────────────────────────────
// Chỉ cần 1 key OpenRouter duy nhất → openrouter.ai/keys
// Biến môi trường trên Vercel: VITE_OPENROUTER_API_KEY
//
// Khi một model bị rate limit / overloaded → tự động chuyển model tiếp theo
// Thứ tự ưu tiên: DeepSeek V3 → Gemini 2.0 Flash → Llama 3.3 70B
// (đều free, đều mạnh, hỗ trợ tiếng Việt tốt)
const OPENROUTER_KEY = (import.meta as any).env?.VITE_OPENROUTER_API_KEY || '';
const ELEVENLABS_KEY = (import.meta as any).env?.VITE_ELEVENLABS_KEY || '';

const FREE_MODELS = [
  'google/gemma-3-27b-it:free',   // Mạnh nhất trong bộ, hiểu tiếng Việt tốt
  'openai/gpt-oss-120b:free',     // Dự phòng mạnh
  'google/gemma-3-12b-it:free',   // Nhẹ hơn, fallback cuối
];

// Track model hiện tại để xoay khi bị lỗi
let modelIndex = 0;

const ELEVENLABS_VOICE_ID = 'oN0q7mZB5kootbGrbqix';
// ──────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Định vị: Bạn là "Mentor Thẩm mĩ Thơ ca", một chuyên gia Văn học và là người dẫn dắt đầy tính sư phạm. Nhiệm vụ của bạn là hướng dẫn học sinh cấp 3 phát hiện và giải mã tín hiệu thẩm mĩ trong thơ hiện đại dựa trên phương pháp tri giác và tư duy ngôn ngữ nghệ thuật.

Nguyên tắc tối thượng:
1. KHÔNG BAO GIỜ phân tích hộ, giải thích sẵn hay viết thành bài văn dài.
2. KHÔNG BAO GIỜ đưa ra gợi ý hay đáp án trước khi học sinh trả lời.
3. LUÔN LUÔN ĐẶT CÂU HỎI VÀ DỪNG LẠI CHỜ HỌC SINH TRẢ LỜI. Mỗi phản hồi chỉ dài tối đa 3-4 câu.
4. LUÔN KHUYẾN KHÍCH học sinh huy động vốn sống, vốn hiểu biết thực tế và trí tưởng tượng để đối chiếu với các tín hiệu trong thơ.

CÔNG CỤ TƯƠNG TÁC (Đặt ở cuối câu trả lời):
- [RHYTHM: dòng 1 / ngắt nhịp, dòng 2 / ngắt nhịp]: Chỉ dùng khi xác nhận nhịp điệu học sinh nêu.
- [HIGHLIGHT: từ 1, từ 2]: Chỉ dùng khi xác nhận tín hiệu thẩm mĩ học sinh đã chọn.
- [CLEAR_MARKUP]: Xóa hiệu ứng cũ.
- [SUMMARY_MODE]: Kích hoạt giao diện tổng kết ở Bước 5.

LUỒNG XỬ LÝ THEO TÀI LIỆU HƯỚNG DẪN:

BƯỚC 1: TRI GIÁC ĐOẠN THƠ (Perception)
- Mục tiêu: Tái hiện hình tượng thơ qua giọng điệu và nhịp điệu.
- AI nhận định nhanh về giọng điệu chính (hào hùng, trầm lắng, thiết tha...).
- Câu hỏi gợi mở: "Để nhập vai vào chủ thể trữ tình trong đoạn thơ này, bạn nghĩ chúng ta nên ngắt nhịp thế nào và đọc với giọng điệu ra sao để bộc lộ đúng nỗi niềm của tác giả?"
-> DỪNG LẠI CHỜ.

BƯỚC 2: XÁC ĐỊNH TÍN HIỆU THẨM MĨ (Identification)
- Mục tiêu: Phân biệt kí hiệu ngôn ngữ thông thường và tín hiệu thẩm mĩ.
- AI yêu cầu học sinh nhặt ra các từ/cụm từ "lạ", "đặc biệt" hoặc "có sức gợi" nhất.
- Gợi ý: "Hãy tìm những điểm sáng ngôn từ mà bạn thấy không thể thay thế bằng từ khác được."
-> DỪNG LẠI CHỜ.

BƯỚC 3: PHÂN DẠNG TÍN HIỆU (Classification)
- AI hướng dẫn học sinh xếp các tín hiệu vào 4 nhóm chuẩn:
  1. Đặc trưng thể loại (Thể thơ, vần, nhịp).
  2. Từ ngữ đặc biệt (Từ tượng hình/thanh, từ được cắt nghĩa mới).
  3. Biện pháp tu từ (So sánh, ẩn dụ, hoán dụ, điệp...).
  4. Cấu trúc cú pháp (Đảo ngữ, đối, kết hợp từ lạ).
-> DỪNG LẠI CHỜ.

BƯỚC 4: GIẢI MÃ TÍN HIỆU (Decoding)
- Câu hỏi: "Tại sao tác giả lại dùng [Tín hiệu] mà không dùng [Từ thông thường]?"
-> DỪNG LẠI CHỜ TỪNG TÍN HIỆU MỘT.

BƯỚC 5: TỔNG KẾT (Summary)
- Bắt buộc dùng thẻ [SUMMARY_MODE] và trả về JSON:
\`\`\`json
{
  "tone": "giọng điệu chủ đạo",
  "rhythm": "mô tả nhịp thơ",
  "highlights": [{"word": "từ", "analysis": "phân tích ngắn"}],
  "mainIdea": "cảm hứng chủ đạo một câu"
}
\`\`\``;

// ─── OPENROUTER API ───────────────────────────────────────────────────────
type OAIMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/**
 * Gọi OpenRouter với model rotation tự động.
 * Nếu model hiện tại bị 429/503/overloaded → thử model tiếp theo ngay, không delay.
 * Chỉ throw khi tất cả models đều thất bại.
 */
async function callStream(
  messages: OAIMessage[],
  onChunk: (delta: string) => void
): Promise<string> {
  let attempts = 0;

  while (attempts < FREE_MODELS.length) {
    const model = FREE_MODELS[modelIndex];
    attempts++;

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Mentor Tho Ca',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      // Model bị rate limit hoặc quá tải → chuyển model ngay, không delay
      if (res.status === 429 || res.status === 503 || res.status === 502) {
        console.warn(`[OpenRouter] Model "${model}" bị giới hạn (${res.status}), chuyển sang model tiếp...`);
        modelIndex = (modelIndex + 1) % FREE_MODELS.length;
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        if (errText.includes('overloaded') || errText.includes('rate') || errText.includes('limit')) {
          console.warn(`[OpenRouter] Model "${model}" overloaded, chuyển sang model tiếp...`);
          modelIndex = (modelIndex + 1) % FREE_MODELS.length;
          continue;
        }
        throw Object.assign(new Error(errText), { status: res.status });
      }

      // Stream thành công — đọc SSE
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '', fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const delta = JSON.parse(payload).choices?.[0]?.delta?.content || '';
            if (delta) { fullText += delta; onChunk(delta); }
          } catch { /* skip malformed chunks */ }
        }
      }
      return fullText;

    } catch (e: any) {
      if (e?.status && e.status !== 429 && e.status !== 503 && e.status !== 502) throw e;
      console.warn(`[OpenRouter] Lỗi model "${FREE_MODELS[modelIndex]}":`, e?.message);
      modelIndex = (modelIndex + 1) % FREE_MODELS.length;
    }
  }

  throw new Error('Tất cả models đều đang bận. Vui lòng thử lại sau vài giây.');
}

// ─── ELEVENLABS TTS ───────────────────────────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;

async function speakVI(text: string, onEnd?: () => void): Promise<void> {
  stopSpeech();
  const clean = text
    .replace(/\[.*?\]/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_#`]/g, '')
    .trim();
  if (!clean) { onEnd?.(); return; }

  if (ELEVENLABS_KEY) {
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          method: 'POST',
          headers: { 'xi-api-key': ELEVENLABS_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: clean,
            model_id: 'eleven_flash_v2_5',
            voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
          }),
        }
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudio = audio;
        audio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; onEnd?.(); };
        audio.onerror = () => { currentAudio = null; fallbackSpeak(clean, onEnd); };
        audio.play();
        return;
      }
    } catch (e) { console.warn('ElevenLabs TTS error, fallback', e); }
  }
  fallbackSpeak(clean, onEnd);
}

function fallbackSpeak(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(v => v.lang.startsWith('vi'));
  if (viVoice) u.voice = viVoice;
  u.lang = 'vi-VN'; u.rate = 0.85; u.pitch = 1.0;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

function stopSpeech() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
// ─────────────────────────────────────────────────────────────────────────

interface Message { id: string; role: 'user' | 'model'; text: string; }
interface SummaryData { tone: string; rhythm: string; highlights: { word: string; analysis: string }[]; mainIdea: string; }
interface ChatInterfaceProps { poem: string; author: string; onBack: () => void; }

export function ChatInterface({ poem, author, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const chatHistoryRef = useRef<OAIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showMobilePoem, setShowMobilePoem] = useState(false);
  const [initStage, setInitStage] = useState<'analyzing' | 'reading' | 'ready'>('analyzing');
  const [poemTone, setPoemTone] = useState('');
  const [readingPoemLine, setReadingPoemLine] = useState<number | null>(null);
  const activePoemLineRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [isSummaryMode, setIsSummaryMode] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [rhythmLines, setRhythmLines] = useState<string[]>([]);
  const initializedRef = useRef(false);
  const poemToneExtracted = useRef(false);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isLoading, initStage]);
  useEffect(() => { if (readingPoemLine !== null) activePoemLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [readingPoemLine]);
  useEffect(() => () => stopSpeech(), []);

  const parseMarkup = (text: string) => {
    const rm = text.match(/\[RHYTHM:\s*(.*?)\]/); if (rm) setRhythmLines(rm[1].split(',').map(l => l.trim()));
    const hm = text.match(/\[HIGHLIGHT:\s*(.*?)\]/); if (hm) setHighlights(hm[1].split(',').map(w => w.trim()));
    if (text.includes('[CLEAR_MARKUP]')) { setHighlights([]); setRhythmLines([]); }
    if (text.includes('[SUMMARY_MODE]')) {
      setIsSummaryMode(true);
      const jm = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jm) try { setSummaryData(JSON.parse(jm[1])); } catch {}
      setSummaryText(text.replace(/\[SUMMARY_MODE\]/g, '').replace(/\[RHYTHM:.*?\]/g, '').replace(/\[HIGHLIGHT:.*?\]/g, '').replace(/```json[\s\S]*?```/g, '').trim());
    }
  };

  const renderPoem = () => poem.split('\n').map((line, i) => {
    let displayLine = line;
    if (rhythmLines.length > 0) {
      const gw = (s: string) => s.replace(/[.,!?/]/g, '').trim().toLowerCase().split(/\s+/).filter(Boolean).join(' ');
      const m = rhythmLines.find(rl => gw(rl) === gw(line) && gw(line).length > 0);
      if (m) displayLine = m;
    }
    let parts: React.ReactNode[] = [displayLine];
    let sc = 0;
    highlights.forEach(word => { if (!word) return;
      const re = new RegExp(`(${word})`, 'gi');
      parts = parts.flatMap(p => typeof p !== 'string' ? p : p.split(re).map(s => s.toLowerCase() === word.toLowerCase()
        ? <span key={`h-${++sc}`} className="bg-gradient-to-r from-yellow-200 to-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-md font-semibold shadow-sm inline-block hover:scale-110 cursor-default transition-all">{s}</span> : s));
    });
    parts = parts.flatMap(p => typeof p !== 'string' ? p : p.split(/(\/)/). map(s => s === '/'
      ? <span key={`r-${++sc}`} className="text-red-500/80 font-bold mx-2 animate-pulse inline-block select-none">/</span> : s));
    const isR = readingPoemLine === i || readingPoemLine === -1;
    return <div key={i} ref={isR ? activePoemLineRef : null}
      className={`min-h-[1.5rem] transition-all duration-500 hover:bg-white/60 hover:pl-2 rounded-lg cursor-default ${isR ? 'bg-yellow-100/80 text-yellow-900 font-medium px-4 py-1 rounded-xl -mx-4 shadow-sm scale-[1.02]' : 'py-1'}`}>{parts}</div>;
  });

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    (async () => {
      try {
        setInitStage('analyzing');

        // 1 call duy nhất: AI trả GIỌNG_ĐIỆU ở dòng đầu rồi bắt đầu BƯỚC 1 ngay
        const combinedSystem = SYSTEM_PROMPT +
          `\n\nQUY TẮC BẮT BUỘC CHO PHẢN HỒI ĐẦU TIÊN: Dòng đầu tiên PHẢI là "GIỌNG_ĐIỆU: <1-3 từ>" rồi dòng "---" rồi mới bắt đầu BƯỚC 1.\nVí dụ:\nGIỌNG_ĐIỆU: tha thiết, bâng khuâng\n---\n(nội dung BƯỚC 1...)`;

        const initMsg: OAIMessage = { role: 'user', content: `Đoạn thơ: ${poem}\nTác giả: ${author}\nHãy bắt đầu BƯỚC 1.` };
        chatHistoryRef.current = [initMsg];
        const firstId = Date.now().toString();
        setMessages([{ id: firstId, role: 'model', text: '' }]);

        let full = '';
        let toneHandled = false;
        await callStream([{ role: 'system', content: combinedSystem }, ...chatHistoryRef.current], d => {
          full += d;

          if (!toneHandled) {
            const toneMatch = full.match(/GIỌNG_ĐIỆU:\s*([^\n]+)/);
            if (toneMatch) {
              const t = toneMatch[1].trim();
              setPoemTone(t);
              poemToneExtracted.current = true;
              toneHandled = true;
              setInitStage('reading');
              setMessages([{ id: 'sys-reading', role: 'model', text: `*Đã phân tích giọng điệu: **${t}**. Đang đọc đoạn thơ...*` }]);
              speakVI(poem, () => { setReadingPoemLine(null); setInitStage('ready'); });
              setReadingPoemLine(-1);
            }
          }

          const disp = full
            .replace(/GIỌNG_ĐIỆU:[^\n]*\n---\n?/g, '')
            .replace(/\[RHYTHM:.*?\]/g, '').replace(/\[HIGHLIGHT:.*?\]/g, '').replace(/\[CLEAR_MARKUP\]/g, '').trim();
          setMessages(p => p.map(m => m.id === firstId ? { ...m, text: disp } : m));
          parseMarkup(full);
        });

        if (!toneHandled) setInitStage('ready');
        chatHistoryRef.current.push({ role: 'assistant', content: full });
      } catch (e: any) {
        let msg = '❌ Lỗi khởi tạo. Vui lòng thử lại.';
        if (e?.status === 401) msg = '❌ OpenRouter API key không hợp lệ. Kiểm tra VITE_OPENROUTER_API_KEY trên Vercel.';
        if (e?.message?.includes('bận')) msg = '⏳ Các model đang bận, vui lòng thử lại sau vài giây.';
        setMessages([{ id: 'err', role: 'model', text: msg }]);
      } finally { setIsLoading(false); }
    })();
  }, [poem, author]);

  const sendChatMessage = async (userMsg: string) => {
    stopSpeech(); setIsSpeaking(false);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    setIsLoading(true);
    chatHistoryRef.current.push({ role: 'user', content: userMsg });
    try {
      const modelId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: modelId, role: 'model', text: '' }]);
      setIsLoading(false);
      let full = '';
      await callStream([{ role: 'system', content: SYSTEM_PROMPT }, ...chatHistoryRef.current], d => {
        full += d;
        const disp = full.replace(/\[RHYTHM:.*?\]/g, '').replace(/\[HIGHLIGHT:.*?\]/g, '').replace(/\[CLEAR_MARKUP\]/g, '').trim();
        setMessages(p => p.map(m => m.id === modelId ? { ...m, text: disp } : m));
        parseMarkup(full);
      });
      chatHistoryRef.current.push({ role: 'assistant', content: full });
    } catch (e: any) {
      const msg = '⚠️ Không thể trả lời lúc này. Vui lòng thử lại.';
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: 'model', text: msg }]);
      chatHistoryRef.current.pop();
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || initStage !== 'ready') return;
    const t = input.trim(); setInput(''); await sendChatMessage(t);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f0] max-w-5xl mx-auto shadow-2xl overflow-hidden md:rounded-3xl md:h-[95vh] md:my-[2.5vh]">
      <header className="bg-white px-6 py-4 border-b border-[#e0e0d8] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-[#f5f5f0] rounded-full transition-colors text-[#5A5A40]"><ArrowLeft className="w-5 h-5" /></button>
          <div><h2 className="font-serif text-xl font-semibold text-[#2c2c28]">Mentor Thơ Ca</h2>
            <p className="text-xs text-[#7A7A5A] uppercase tracking-wider font-medium">{author}</p></div>
        </div>
        <button onClick={() => setShowMobilePoem(!showMobilePoem)} className="md:hidden p-2 hover:bg-[#f5f5f0] rounded-full transition-colors text-[#5A5A40]">
          {showMobilePoem ? <X className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Poem Panel */}
        <div className={`absolute inset-0 z-20 bg-[#fafafa] border-r border-[#e0e0d8] p-4 md:p-8 lg:p-12 overflow-y-auto transition-all duration-1000 ease-in-out md:relative md:block md:translate-x-0 ${showMobilePoem ? 'translate-x-0' : '-translate-x-full'} ${isSummaryMode ? 'md:w-full border-r-0 flex flex-col items-center' : 'md:w-1/2'}`}>
          {!isSummaryMode ? (
            <>
              <h3 className="text-sm font-medium text-[#5A5A40] uppercase tracking-widest mb-6 flex items-center gap-2"><BookOpen className="w-4 h-4" />Nội dung tác phẩm</h3>
              <div className="font-serif text-xl leading-[2.2] text-[#2c2c28] whitespace-pre-wrap italic pl-6 py-6 bg-gradient-to-br from-white/80 to-white/40 rounded-3xl shadow-sm">{renderPoem()}</div>
            </>
          ) : (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-6xl mx-auto py-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
                  <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] text-sm font-medium tracking-widest uppercase">Kết quả giải mã tín hiệu thẩm mĩ</div>
                  <h2 className="text-4xl md:text-5xl font-serif text-[#2c2c28] font-bold mb-4">Hành Trình Thẩm Mĩ</h2>
                  <div className="w-24 h-1 bg-[#5A5A40] mx-auto rounded-full opacity-30"></div>
                </motion.div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
                  <div className="lg:col-span-4 flex flex-col gap-6">
                    {[{icon: <Volume2 className="w-6 h-6 text-blue-600"/>, bg:'bg-blue-50', label:'Giọng điệu', val:summaryData?.tone, delay:0.2},
                      {icon: <Activity className="w-6 h-6 text-red-600"/>, bg:'bg-red-50', label:'Nhịp thơ', val:summaryData?.rhythm, delay:0.3}].map((item, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: item.delay }} className="bg-white p-8 rounded-[32px] shadow-sm border border-[#e0e0d8] flex-1 group hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>{item.icon}</div>
                        <h4 className="text-xs font-bold text-[#7A7A5A] uppercase tracking-[0.2em] mb-3">{item.label}</h4>
                        <p className="text-2xl font-serif text-[#2c2c28] leading-tight italic">{item.val || 'Đang cập nhật...'}</p>
                      </motion.div>
                    ))}
                  </div>
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-4 bg-[#2c2c28] text-white p-10 rounded-[40px] shadow-2xl flex items-center justify-center min-h-[400px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10 w-full text-center">
                      <div className="font-serif text-xl leading-[2.4] italic whitespace-pre-wrap opacity-90">{renderPoem()}</div>
                      <div className="mt-8 pt-6 border-t border-white/10"><p className="text-xs uppercase tracking-[0.3em] text-white/40">{author}</p></div>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-4 bg-white p-8 rounded-[32px] shadow-sm border border-[#e0e0d8]">
                    <div className="flex items-center justify-between mb-8"><h4 className="text-xs font-bold text-[#7A7A5A] uppercase tracking-[0.2em]">Điểm sáng ngôn từ</h4><Sparkles className="w-5 h-5 text-yellow-500" /></div>
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                      {summaryData?.highlights?.map((h, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="relative pl-6 border-l-2 border-yellow-400/30 py-1">
                          <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-yellow-400"></div>
                          <span className="text-lg font-serif font-bold text-[#2c2c28] block mb-1">{h.word}</span>
                          <p className="text-sm text-[#5A5A40] leading-relaxed italic">{h.analysis}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-gradient-to-br from-[#5A5A40] to-[#4a4a35] text-white p-12 rounded-[40px] shadow-xl relative overflow-hidden mb-12">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><Lightbulb className="w-32 h-32" /></div>
                  <div className="relative z-10 max-w-3xl mx-auto text-center">
                    <h4 className="text-xs font-bold text-white/60 uppercase tracking-[0.3em] mb-6">Cảm hứng chủ đạo & Nội dung chính</h4>
                    <p className="text-2xl md:text-3xl font-serif leading-relaxed italic">"{summaryData?.mainIdea || 'Đang tổng hợp...'}"</p>
                  </div>
                </motion.div>
                {summaryText && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="max-w-3xl mx-auto mb-16 text-center">
                    <div className="text-lg text-[#5A5A40] leading-relaxed font-serif italic"><Markdown>{summaryText}</Markdown></div>
                  </motion.div>
                )}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                  <button onClick={onBack} className="group px-10 py-5 bg-[#5A5A40] text-white rounded-full font-medium hover:bg-[#4a4a35] transition-all shadow-lg hover:shadow-2xl transform hover:-translate-y-1 flex items-center gap-3">
                    <BookOpen className="w-5 h-5 group-hover:rotate-12 transition-transform" />Khám phá tác phẩm mới
                  </button>
                  <button onClick={() => window.print()} className="px-10 py-5 bg-white text-[#5A5A40] border border-[#e0e0d8] rounded-full font-medium hover:bg-[#f5f5f0] transition-all shadow-sm flex items-center gap-3">
                    <Feather className="w-5 h-5" />Lưu lại hành trình
                  </button>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Chat Area */}
        <div className={`flex flex-col bg-white overflow-hidden relative transition-all duration-1000 ease-in-out ${isSummaryMode ? 'w-0 opacity-0' : 'flex-1 md:w-1/2 opacity-100'}`}>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#e0e0d8] text-[#5A5A40]' : 'bg-[#5A5A40] text-white'}`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  </div>
                  <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-5 ${msg.role === 'user' ? 'bg-[#f5f5f0] text-[#2c2c28] rounded-tr-sm' : 'bg-white border border-[#e0e0d8] text-[#2c2c28] rounded-tl-sm shadow-sm'}`}>
                    {msg.role === 'model' ? (
                      <div className="text-[15px] leading-relaxed">
                        <Markdown>{msg.text}</Markdown>
                        {msg.text && <button onClick={() => { if (isSpeaking) { stopSpeech(); setIsSpeaking(false); } else { setIsSpeaking(true); speakVI(msg.text, () => setIsSpeaking(false)); } }}
                          className="mt-2 flex items-center gap-1 text-[11px] text-[#7A7A5A] hover:text-[#5A5A40] transition-colors">
                          {isSpeaking ? <><Square className="w-3 h-3" />Dừng đọc</> : <><Volume2 className="w-3 h-3" />Nghe đọc</>}
                        </button>}
                      </div>
                    ) : <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</div>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {initStage === 'analyzing' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-4"><div className="bg-[#f5f5f0] text-[#5A5A40] px-4 py-2 rounded-full text-sm flex items-center gap-2 border border-[#e0e0d8]"><Loader2 className="w-4 h-4 animate-spin" />Đang phân tích giọng điệu bài thơ...</div></motion.div>}
            {initStage === 'reading' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-4"><div className="bg-[#f5f5f0] text-[#5A5A40] px-4 py-2 rounded-full text-sm flex items-center gap-2 border border-[#e0e0d8]"><Volume2 className="w-4 h-4 animate-pulse" />Đọc thơ với giọng: <span className="font-semibold">{poemTone}</span></div></motion.div>}
            {isLoading && initStage === 'ready' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4"><div className="w-10 h-10 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></div><div className="bg-white border border-[#e0e0d8] rounded-2xl rounded-tl-sm p-5 flex items-center gap-2 shadow-sm"><div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></motion.div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 bg-white border-t border-[#e0e0d8]">
            <form onSubmit={handleSend} className="relative flex items-end gap-2 max-w-4xl mx-auto">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                placeholder="Nhập câu trả lời của bạn..."
                className="w-full bg-[#f5f5f0] border-none rounded-2xl py-3 pl-4 pr-14 focus:ring-2 focus:ring-[#5A5A40] resize-none max-h-32 min-h-[52px]"
                rows={1} disabled={isLoading || initStage !== 'ready'} />
              <div className="absolute right-2 bottom-1.5">
                <button type="submit" disabled={!input.trim() || isLoading || initStage !== 'ready'}
                  className="p-2 bg-[#5A5A40] text-white rounded-xl hover:bg-[#4a4a34] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
            <div className="text-center mt-2"><span className="text-[10px] text-[#7A7A5A] uppercase tracking-wider">Nhấn Enter để gửi · Shift+Enter xuống dòng</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
