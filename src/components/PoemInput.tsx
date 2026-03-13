import React, { useState } from 'react';
import { BookOpen, Feather } from 'lucide-react';

interface PoemInputProps {
  onSubmit: (poem: string, author: string) => void;
}

export function PoemInput({ onSubmit }: PoemInputProps) {
  const [poem, setPoem] = useState('');
  const [author, setAuthor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (poem.trim() && author.trim()) {
      onSubmit(poem, author);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-[32px] p-8 md:p-12 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#f5f5f0] mb-6">
            <Feather className="w-8 h-8 text-[#5A5A40]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#2c2c28] mb-3">Mentor Thẩm Mĩ Thơ Ca</h1>
          <p className="text-[#7A7A5A] font-sans font-light">Cùng nhau khám phá vẻ đẹp ẩn giấu sau từng con chữ.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="author" className="block text-sm font-medium text-[#5A5A40] mb-2 uppercase tracking-wider">
              Tên Tác Giả / Bài Thơ
            </label>
            <input
              type="text"
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="VD: Quang Dũng - Tây Tiến"
              className="w-full px-4 py-3 rounded-xl border border-[#e0e0d8] bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all font-sans"
              required
            />
          </div>

          <div>
            <label htmlFor="poem" className="block text-sm font-medium text-[#5A5A40] mb-2 uppercase tracking-wider">
              Đoạn Thơ Cần Khám Phá
            </label>
            <textarea
              id="poem"
              value={poem}
              onChange={(e) => setPoem(e.target.value)}
              placeholder="Dốc lên khúc khuỷu dốc thăm thẳm&#10;Heo hút cồn mây súng ngửi trời..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-[#e0e0d8] bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all font-serif text-lg resize-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#5A5A40] hover:bg-[#4a4a34] text-white rounded-full py-4 px-8 font-medium tracking-wide transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Bắt đầu hành trình
          </button>
        </form>
      </div>
    </div>
  );
}
