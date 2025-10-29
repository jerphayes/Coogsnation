import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, X, Minimize2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  source?: 'faq' | 'ai' | 'error';
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm the CoogsNation AI Assistant. I can help you with questions about our community, UH sports, and platform features. What would you like to know?",
      sender: 'ai',
      timestamp: new Date(),
      source: 'ai'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: question,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || "I'm sorry, I couldn't process your question.",
        sender: 'ai',
        timestamp: new Date(),
        source: data.source || 'ai'
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm experiencing technical difficulties. Please try again later.",
        sender: 'ai',
        timestamp: new Date(),
        source: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-uh-red hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
          data-testid="button-chat-open"
          aria-label="Open chat widget"
        >
          <MessageCircle size={24} />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 md:w-96">
      <Card className="shadow-2xl border-2 border-gray-200">
        <CardHeader className="bg-uh-red text-white p-4 flex flex-row items-center justify-between rounded-t-lg">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle size={20} />
            Ask CoogsNation AI
          </CardTitle>
          <div className="flex gap-1">
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-red-700 p-1 h-8 w-8"
              data-testid="button-chat-minimize"
              aria-label="Minimize chat"
            >
              <Minimize2 size={16} />
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="sm" 
              className="text-white hover:bg-red-700 p-1 h-8 w-8"
              data-testid="button-chat-close"
              aria-label="Close chat"
            >
              <X size={16} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Messages Area */}
          <div className="h-80 overflow-y-auto p-4 bg-gray-50" data-testid="chat-messages">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-uh-red text-white'
                        : message.source === 'error'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : message.source === 'faq'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                    data-testid={`message-${message.sender}-${message.id}`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.text}
                    </p>
                    <div className={`text-xs mt-1 opacity-70 ${
                      message.sender === 'user' ? 'text-red-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                      {message.source === 'faq' && ' • FAQ'}
                      {message.source === 'ai' && ' • AI'}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 p-3 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse flex space-x-1">
                        <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                        <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                        <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                      </div>
                      <span className="text-sm text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question about CoogsNation..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none focus:ring-uh-red focus:border-uh-red"
                disabled={isLoading}
                data-testid="input-chat-message"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-uh-red hover:bg-red-700 text-white px-4 self-end"
                data-testid="button-chat-send"
              >
                <Send size={16} />
              </Button>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Ask about CoogsNation features, UH sports, or community topics
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}