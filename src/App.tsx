/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PoemInput } from './components/PoemInput';
import { ChatInterface } from './components/ChatInterface';

export default function App() {
  const [step, setStep] = useState<'input' | 'chat'>('input');
  const [poemData, setPoemData] = useState({ poem: '', author: '' });

  const handleStart = (poem: string, author: string) => {
    setPoemData({ poem, author });
    setStep('chat');
  };

  const handleBack = () => {
    setStep('input');
    setPoemData({ poem: '', author: '' });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {step === 'input' ? (
        <PoemInput onSubmit={handleStart} />
      ) : (
        <ChatInterface 
          poem={poemData.poem} 
          author={poemData.author} 
          onBack={handleBack} 
        />
      )}
    </div>
  );
}

