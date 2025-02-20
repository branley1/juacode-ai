// components/ChatInterface.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;
    // Update local state for optimistic UI
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    // Call your API to generate a response
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input }),
    });
    const data = await res.json();
    setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <p className="p-2 bg-gray-200 rounded-md inline-block">{msg.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 p-2 border border-gray-300 rounded-md"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
        />
        <Button onClick={sendMessage}>Send</Button>
      </div>
    </div>
  );
}
