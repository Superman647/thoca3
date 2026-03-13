import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { Send, Volume2, Loader2, ArrowLeft, User, Sparkles, BookOpen, X, Activity, Lightbulb, Feather } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
- AI nhận định nhanh về giọng điệu chính.
- Câu hỏi gợi mở: "Để nhập vai vào chủ thể trữ tình trong đoạn thơ này, bạn nghĩ chúng ta nên ngắt nhịp thế nào và đọc với giọng điệu ra sao để bộc lộ đúng nỗi niềm của tác giả?"
-> DỪNG LẠI CHỜ.

BƯỚC 2: XÁC ĐỊNH TÍN HIỆU THẨM MĨ (Identification)
- AI yêu cầu học sinh nhặt ra các từ/cụm từ "lạ", "đặc biệt" hoặc "có sức gợi" nhất.
-> DỪNG LẠI CHỜ.

BƯỚC 3: PHÂN DẠNG TÍN HIỆU (Classification)
- AI hướng dẫn học sinh xếp các tín hiệu đã tìm được vào 4 nhóm chuẩn.
-> DỪNG LẠI CHỜ.

BƯỚC 4: GIẢI MÃ TÍN HIỆU (Decoding)
- Hỏi: "Tại sao tác giả lại dùng [Tín hiệu] mà không dùng [Từ thông thường]?
-> DỪNG LẠI CHỜ TỪNG TÍN HIỆU MỘT.

BƯỚC 5: TỔNG KẾT (Summary)
- Tổng hợp lại thành chỉnh thể nghệ thuật. Bắt buộc dùng thẻ [SUMMARY_MODE] và định dạng JSON như mẫu cũ.`;

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface SummaryData {
  tone: string;
  rhythm: string;
  highlights: { word: string; analysis: string }[];
  mainIdea: string;
}

interface ChatInterfaceProps {
  poem: string;
  author: string;
  onBack: () => void;
}

// ── HÀM GỌI API PUTER.JS (MIỄN PHÍ 100%, KHÔNG CẦN API KEY) ──
const callPuterAI = async (messages: any[], systemPrompt?: string) => {
  // 1. Kiểm tra xem thư viện Puter đã load chưa
  if (typeof (window as any).puter === 'undefined') {
    throw new Error("Puter.js chưa được tải. Vui lòng F5 lại trang web.");
  }

  // 2. Chuyển đổi định dạng tin nhắn cho AI
  const apiMessages = [];
  if (systemPrompt) {
    apiMessages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.forEach(msg => {
    apiMessages.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text
    });
  });

  // 3. Gọi model Gemini 3 Flash mới nhất của Google qua mạng lưới Puter
  const response = await (window as any).puter.ai.chat(apiMessages, {
    model: "gemini-3-flash-preview" 
  });

  // 4. Lấy kết quả trả về
  if (typeof response === 'string') return response;
  return response?.message?.content || response?.text || "";
};

export function ChatInterface({ poem, author, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [initStage, setInitStage] = useState<'analyzing' | 'reading' | 'ready'>('analyzing');
  const [poemTone, setPoemTone] = useState('');
  const [readingPoemLine, setReadingPoemLine] = useState<number | null>(null);
  const activePoemLineRef = useRef<HTMLDivElement>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [showMobilePoem, setShowMobilePoem] = useState(false);
  
  const [highlights, setHighlights] = useState<string[]>([]);
  const [isSummaryMode, setIsSummaryMode] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [rhythmLines, setRhythmLines] = useState<string[]>([]);
  
  const initializedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isLoading, initStage]);

  useEffect(() => {
    if (readingPoemLine !== null && activePoemLineRef.current) {
      activePoemLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [readingPoemLine]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const speakText = (text: string, onStart?: () => void, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95;
    
    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    utterance.onerror = () => { if (onEnd) onEnd(); };

    window.speechSynthesis.speak(utterance);
  };

  const stopAllAudio = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setPlayingAudioId(null);
  };

  const parseMarkup = (text: string) => {
    const rhythmMatch = text.match(/\[RHYTHM:\s*(.*?)\]/);
    if (rhythmMatch) {
      const lines = rhythmMatch[1].split(',').map(l => l.trim());
      setRhythmLines(lines);
    }
    
    const highlightMatch = text.match(/\[HIGHLIGHT:\s*(.*?)\]/);
    if (highlightMatch) {
      const words = highlightMatch[1].split(',').map(w => w.trim());
      setHighlights(words);
    }
    
    if (text.includes('[CLEAR_MARKUP]')) {
      setHighlights([]);
      setRhythmLines([]);
    }
    
    if (text.includes('[SUMMARY_MODE]')) {
      setIsSummaryMode(true);
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          setSummaryData(parsed);
        } catch (e) {
          console.error("Failed to parse summary JSON", e);
        }
      }
      const cleanText = text.replace(/\[SUMMARY_MODE\]/g, '').replace(/\[RHYTHM:.*?\]/g, '').replace(/\[HIGHLIGHT:.*?\]/g, '').replace(/```json[\s\S]*?```/g, '').trim();
      setSummaryText(cleanText);
    }
  };

  const renderPoem = () => {
    let lines = poem.split('\n');
    return lines.map((line, index) => {
      let displayLine = line;
      if (rhythmLines.length > 0) {
        const getWords = (s: string) => s.replace(/[.,!?/]/g, '').trim().toLowerCase().split(/\s+/).filter(Boolean);
        const originalWords = getWords(line).join(' ');
        const matchedRhythm = rhythmLines.find(rl => {
          const aiWords = getWords(rl).join(' ');
          return originalWords === aiWords && originalWords.length > 0;
        });
        if (matchedRhythm) displayLine = matchedRhythm;
      }
      
      let lineElements: React.ReactNode[] = [displayLine];
      let spanCounter = 0;
      if (highlights.length > 0) {
        highlights.forEach(word => {
          if (!word) return;
          const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
          lineElements = lineElements.flatMap(part => {
            if (typeof part === 'string') {
              const splits = part.split(regex);
              return splits.map((s) => {
                if (s.toLowerCase() === word.toLowerCase()) {
                  spanCounter++;
                  return <span key={`highlight-${spanCounter}`} className="bg-gradient-to-r from-yellow-200 to-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-md font-semibold transition-all duration-500 shadow-sm inline-block hover:scale-110 hover:-translate-y-0.5 cursor-default">{s}</span>;
                }
                return s;
              });
            }
            return part;
          });
        });
      }
      
      lineElements = lineElements.flatMap(part => {
        if (typeof part === 'string') {
          const splits = part.split(/(\/)/);
          return splits.map((s) => {
            if (s === '/') {
              spanCounter++;
              return <span key={`rhythm-${spanCounter}`} className="text-red-500/80 font-bold mx-2 animate-pulse scale-125 inline-block select-none">/</span>;
            }
            return s;
          });
        }
        return part;
      });

      const isReading = readingPoemLine === index || readingPoemLine === -1;
      return (
        <div key={index} ref={isReading ? activePoemLineRef : null}
          className={`min-h-[1.5rem] transition-all duration-500 hover:bg-white/60 hover:pl-2 rounded-lg cursor-default ${isReading ? 'bg-yellow-100/80 text-yellow-900 font-medium px-4 py-1 rounded-xl -mx-4 shadow-sm scale-[1.02] transform' : 'py-1'}`}>
          {lineElements}
        </div>
      );
    });
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initializeMentoring = async () => {
      try {
        setInitStage('analyzing');
        const tonePrompt = `Đoạn thơ: "${poem}"\nTác giả: ${author}\nHãy chỉ ra giọng điệu và cảm xúc chủ đạo của đoạn thơ này trong 1-3 từ (ví dụ: hào hùng, bi tráng, tha thiết, buồn bã, vui tươi...). Chỉ trả về các từ chỉ giọng điệu, không giải thích thêm.`;
        
        const tone = await callPuterAI([{ role: 'user', text: tonePrompt }]);
        setPoemTone(tone.trim() || 'truyền cảm');
        
        setInitStage('reading');
        setMessages([{ id: 'system-reading', role: 'model', text: `*Đã phân tích giọng điệu: **${tone.trim()}**. Đang đọc đoạn thơ...*` }]);
        setPlayingAudioId('system-reading');
        
        speakText(
          poem,
          () => setReadingPoemLine(-1),
          async () => {
            setReadingPoemLine(null);
            setPlayingAudioId(null);
            setInitStage('ready');
            
            const initialPrompt = `Đoạn thơ: ${poem}\nTác giả: ${author}\nHãy bắt đầu BƯỚC 1.`;
            const firstMessageId = Date.now().toString();
            
            setMessages(prev => [...prev, { id: firstMessageId, role: 'model', text: '...' }]);
            
            const aiResponse = await callPuterAI([{ role: 'user', text: initialPrompt }], SYSTEM_PROMPT);
            
            const displayText = aiResponse.replace(/\[RHYTHM:.*?\]/g, '').replace(/\[HIGHLIGHT:.*?\]/g, '').replace(/\[CLEAR_MARKUP\]/g, '').trim();
            setMessages((prev) => prev.map(m => m.id === firstMessageId ? { ...m, text: displayText } : m));
            parseMarkup(aiResponse);
            setIsLoading(false);
          }
        );
      } catch (error: any) {
        console.error('Initialization error:', error);
        setMessages([{ id: Date.now().toString(), role: 'model', text: 'Mentor đang bận chút xíu, bạn thử tải lại trang (F5) nhé!' }]);
        setIsLoading(false);
      }
    };
    initializeMentoring();
  }, [poem, author]);

  const sendChatMessage = async (userMessage: string) => {
    stopAllAudio();
    const newMessageId = Date.now().toString();
    const newUserMsg: Message = { id: newMessageId, role: 'user', text: userMessage };
    
    const currentHistory = [...messages.filter(m => m.id !== 'system-reading'), newUserMsg];
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const modelMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: modelMessageId, role: 'model', text: '...' }]);
      
      const aiResponse = await callPuterAI(currentHistory, SYSTEM_PROMPT);
      
      const displayText = aiResponse.replace(/\[RHYTHM:.*?\]/g, '').replace(/\[HIGHLIGHT:.*?\]/g, '').replace(/\[CLEAR_MARKUP\]/g, '').trim();
      setMessages((prev) => prev.map(m => m.id === modelMessageId ? { ...m, text: displayText } : m));
      parseMarkup(aiResponse);
      
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: 'Mạng đang chập chờn, bạn gửi lại câu vừa rồi nhé!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || initStage !== 'ready') return;
    const text = input.trim();
    setInput('');
    await sendChatMessage(text);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f0] max-w-5xl mx-auto shadow-2xl overflow-hidden md:rounded-3xl md:h-[95vh] md:my-[2.5vh]">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-[#e0e0d8] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-[#f5f5f0] rounded-full transition-colors text-[#5A5A40]"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#2c2c28]">Mentor Thơ Ca</h2>
            <p className="text-xs text-[#7A7A5A] uppercase tracking-wider font-medium">{author}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMobilePoem(!showMobilePoem)} className="md:hidden p-2 hover:bg-[#f5f5f0] rounded-full transition-colors text-[#5A5A40]">
            {showMobilePoem ? <X className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Poem Context Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className={`absolute inset-0 z-20 bg-[#fafafa] border-r border-[#e0e0d8] p-4 md:p-8 lg:p-12 overflow-y-auto transition-all duration-1000 ease-in-out md:relative md:block md:translate-x-0 ${showMobilePoem ? 'translate-x-0' : '-translate-x-full'} ${isSummaryMode ? 'md:w-full border-r-0 flex flex-col items-center' : 'md:w-1/2'}`}>
          {!isSummaryMode ? (
            <>
              <h3 className="text-sm font-medium text-[#5A5A40] uppercase tracking-widest mb-6 flex items-center gap-2"><BookOpen className="w-4 h-4" />Nội dung tác phẩm</h3>
              <div className="transition-all duration-1000 w-full">
                <div className="font-serif text-xl leading-[2.2] text-[#2c2c28] whitespace-pre-wrap italic pl-6 py-6 bg-gradient-to-br from-white/80 to-white/40 rounded-3xl shadow-sm backdrop-blur-sm">
                  {renderPoem()}
                </div>
              </div>
            </>
          ) : (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-6xl mx-auto py-8">
                {/* Header Section */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-16">
                  <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] text-sm font-medium tracking-widest uppercase">Kết quả giải mã tín hiệu thẩm mĩ</div>
                  <h2 className="text-4xl md:text-5xl font-serif text-[#2c2c28] font-bold mb-4">Hành Trình Thẩm Mĩ</h2>
                  <div className="w-24 h-1 bg-[#5A5A40] mx-auto rounded-full opacity-30"></div>
                </motion.div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
                  <div className="lg:col-span-4 flex flex-col gap-6">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="bg-white p-8 rounded-[32px] shadow-sm border border-[#e0e0d8] flex-1 group hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Volume2 className="w-6 h-6 text-blue-600" /></div>
                      <h4 className="text-xs font-bold text-[#7A7A5A] uppercase tracking-[0.2em] mb-3">Giọng điệu</h4>
                      <p className="text-2xl font-serif text-[#2c2c28] leading-tight italic">{summaryData?.tone || "Đang cập nhật..."}</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="bg-white p-8 rounded-[32px] shadow-sm border border-[#e0e0d8] flex-1 group hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Activity className="w-6 h-6 text-red-600" /></div>
                      <h4 className="text-xs font-bold text-[#7A7A5A] uppercase tracking-[0.2em] mb-3">Nhịp thơ</h4>
                      <p className="text-2xl font-serif text-[#2c2c28] leading-tight italic">{summaryData?.rhythm || "Đang cập nhật..."}</p>
                    </motion.div>
                  </div>

                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8 }} className="lg:col-span-4 bg-[#2c2c28] text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden flex items-center justify-center min-h-[400px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                    <div className="relative z-10 w-full text-center">
                      <div className="font-serif text-xl md:text-2xl leading-[2.4] italic whitespace-pre-wrap opacity-90">{renderPoem()}</div>
                      <div className="mt-8 pt-6 border-t border-white/10"><p className="text-xs uppercase tracking-[0.3em] text-white/40 font-medium">{author}</p></div>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="lg:col-span-4 bg-white p-8 rounded-[32px] shadow-sm border border-[#e0e0d8] overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-xs font-bold text-[#7A7A5A] uppercase tracking-[0.2em]">Điểm sáng ngôn từ</h4>
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {summaryData?.highlights?.map((h, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + (i * 0.1) }} className="relative pl-6 border-l-2 border-yellow-400/30 py-1">
                          <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                          <span className="text-lg font-serif font-bold text-[#2c2c28] block mb-1">{h.word}</span>
                          <p className="text-sm text-[#5A5A40] leading-relaxed italic">{h.analysis}</p>
                        </motion.div>
                      ))}
                      {!summaryData?.highlights?.length && <div className="text-center py-12"><p className="text-[#7A7A5A] italic text-sm">Chưa có điểm sáng nào được ghi nhận.</p></div>}
                    </div>
                  </motion.div>
                </div>

                {/* Main Idea Section */}
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }} className="bg-gradient-to-br from-[#5A5A40] to-[#4a4a35] text-white p-12 rounded-[40px] shadow-xl relative overflow-hidden mb-12">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><Lightbulb className="w-32 h-32" /></div>
                  <div className="relative z-10 max-w-3xl mx-auto text-center">
                    <h4 className="text-xs font-bold text-white/60 uppercase tracking-[0.3em] mb-6">Cảm hứng chủ đạo & Nội dung chính</h4>
                    <p className="text-2xl md:text-3xl font-serif leading-relaxed italic">"{summaryData?.mainIdea || "Đang tổng hợp nội dung..."}"</p>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                  <button onClick={onBack} className="group px-10 py-5 bg-[#5A5A40] text-white rounded-full font-medium hover:bg-[#4a4a35] transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 flex items-center gap-3">
                    <BookOpen className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Khám phá tác phẩm mới
                  </button>
                  <button onClick={() => window.print()} className="px-10 py-5 bg-white text-[#5A5A40] border border-[#e0e0d8] rounded-full font-medium hover:bg-[#f5f5f0] transition-all duration-300 shadow-sm flex items-center gap-3">
                    <Feather className="w-5 h-5" /> Lưu lại hành trình
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
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#e0e0d8] text-[#5A5A40]' : 'bg-[#5A5A40] text-white'}`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  </div>
                  <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-5 ${msg.role === 'user' ? 'bg-[#f5f5f0] text-[#2c2c28] rounded-tr-sm' : 'bg-white border border-[#e0e0d8] text-[#2c2c28] rounded-tl-sm shadow-sm'}`}>
                    {msg.role === 'model' && <div className="markdown-body text-[15px] leading-relaxed"><Markdown>{msg.text}</Markdown></div>}
                    {msg.role === 'user' && <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</div>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {initStage === 'analyzing' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-4">
                <div className="bg-[#f5f5f0] text-[#5A5A40] px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-sm border border-[#e0e0d8]"><Loader2 className="w-4 h-4 animate-spin" />Đang phân tích giọng điệu bài thơ...</div>
              </motion.div>
            )}
            
            {initStage === 'reading' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-4">
                <div className="bg-[#f5f5f0] text-[#5A5A40] px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-sm border border-[#e0e0d8]"><Volume2 className="w-4 h-4 animate-pulse" />Đang đọc bài thơ với giọng: <span className="font-semibold">{poemTone}</span></div>
              </motion.div>
            )}

            {isLoading && initStage === 'ready' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></div>
                <div className="bg-white border border-[#e0e0d8] rounded-2xl rounded-tl-sm p-5 flex items-center gap-2 shadow-sm">
                  <div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-[#e0e0d8]">
            <form onSubmit={handleSend} className="relative flex items-end gap-2 max-w-4xl mx-auto">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} placeholder="Nhập câu trả lời của bạn..." className="w-full bg-[#f5f5f0] border-none rounded-2xl py-3 pl-4 pr-14 focus:ring-2 focus:ring-[#5A5A40] resize-none max-h-32 min-h-[52px]" rows={1} disabled={isLoading || initStage !== 'ready'} />
              <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
                <button type="submit" disabled={!input.trim() || isLoading || initStage !== 'ready'} className="p-2 bg-[#5A5A40] text-white rounded-xl hover:bg-[#4a4a34] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Send className="w-4 h-4" /></button>
              </div>
            </form>
            <div className="text-center mt-2"><span className="text-[10px] text-[#7A7A5A] uppercase tracking-wider">Nhấn Enter để gửi, Shift + Enter để xuống dòng.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
