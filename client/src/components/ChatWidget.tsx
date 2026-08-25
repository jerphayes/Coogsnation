import { formatCentralChatTimestamp } from "@/lib/chatPresentation";
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Send, X, Minimize2, Paperclip, Youtube } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  source?: 'faq' | 'learned' | 'provider' | 'ai' | 'error';
  provider?: string;
  model?: string;
  routeReason?: string;
}

interface PublicAIStatus {
  enabled: boolean;
  provider: string | null;
  model: string | null;
  routing?: {
    allowUserChoice: boolean;
    gemini: {
      enabled: boolean;
      model: string | null;
      youtubeEnabled: boolean;
      uploadsEnabled: boolean;
      maxMediaBytes: number;
      allowedMediaMimeTypes: string[];
    };
  };
}

type ProviderPreference = 'auto' | 'primary' | 'gemini';

const routeLabels: Record<string, string> = {
  approved_knowledge: 'Merlin knowledge',
  primary_text: 'Merlin',
  gemini_requested: 'Merlin media',
  gemini_media: 'Merlin media',
  gemini_default: 'Merlin',
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Greetings! I’m Merlin, your Knowing Wizard. Ask me anything about CoogsNation, sports, products, images, videos, documents, or whatever else you need help with.",
      sender: 'ai',
      timestamp: new Date(),
      source: 'ai'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => `conv_${crypto.randomUUID()}`);
  const [providerPreference, setProviderPreference] = useState<ProviderPreference>('auto');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [showMedia, setShowMedia] = useState(false);
  const [status, setStatus] = useState<PublicAIStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/ai/v3/status')
      .then((response) => response.json())
      .then((data) => setStatus(data.ai || null))
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const gemini = status?.routing?.gemini;
  const mediaEnabled = Boolean(gemini?.enabled && (gemini.uploadsEnabled || gemini.youtubeEnabled));

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const attachmentText = [
      mediaFile ? `Attached: ${mediaFile.name}` : '',
      youtubeUrl.trim() ? 'YouTube link attached' : '',
    ].filter(Boolean).join(' • ');

    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      text: attachmentText ? `${question}\n${attachmentText}` : question,
      sender: 'user',
      timestamp: new Date(),
    }]);
    setInput('');
    setIsLoading(true);

    try {
      if (mediaFile && gemini?.maxMediaBytes && mediaFile.size > gemini.maxMediaBytes) {
        throw new Error(`File exceeds the ${Math.round(gemini.maxMediaBytes / 1024 / 1024)} MB limit`);
      }

      const form = new FormData();
      form.append('message', question);
      form.append('conversationId', conversationId);
      form.append('providerPreference', providerPreference);
      if (youtubeUrl.trim()) form.append('youtubeUrl', youtubeUrl.trim());
      if (mediaFile) form.append('media', mediaFile);

      const response = await fetch('/api/ai/v3/chat', {
        method: 'POST',
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'AI request failed');

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        text: data.answer || data.response || "I'm sorry, I couldn't process your question.",
        sender: 'ai',
        timestamp: new Date(),
        source: data.source || 'provider',
        provider: data.provider,
        model: data.model,
        routeReason: data.routeReason,
      }]);
      setYoutubeUrl('');
      setMediaFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error ? error.message : "I'm experiencing technical difficulties. Please try again later.",
        sender: 'ai',
        timestamp: new Date(),
        source: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => formatCentralChatTimestamp(date);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-uh-red hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
          data-testid="button-chat-open"
          aria-label="Open chat widget"
        >
          <img src="/merlin/merlin-mark.svg" alt="" className="h-11 w-11 object-contain" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[22rem] md:w-[28rem]">
      <Card className="shadow-2xl border-2 border-gray-200">
        <CardHeader className="bg-gradient-to-r from-[#23053f] via-[#4b168c] to-[#23053f] text-white p-3 flex flex-row items-center justify-between rounded-t-lg border-b-2 border-[#d6a62e]">
          <CardTitle className="flex items-center gap-2">
            <img src="/merlin/merlin-mark.svg" alt="Merlin" className="h-12 w-16 object-contain shrink-0" />
            <div className="leading-tight">
              <div className="text-[13px] italic text-white/90">Ask</div>
              <div className="text-xl font-bold tracking-wide text-[#f1c75b]">MERLIN</div>
              <div className="text-[10px] font-medium text-white">Our CoogsNation Wizard Assist</div>
            </div>
          </CardTitle>
          <div className="flex gap-1">
            <Button onClick={() => setIsOpen(false)} variant="ghost" size="sm" className="text-white hover:bg-red-700 p-1 h-8 w-8" aria-label="Minimize chat">
              <Minimize2 size={16} />
            </Button>
            <Button onClick={() => setIsOpen(false)} variant="ghost" size="sm" className="text-white hover:bg-red-700 p-1 h-8 w-8" aria-label="Close chat">
              <X size={16} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="h-80 overflow-y-auto p-4 bg-gray-50" data-testid="chat-messages">
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-lg shadow-sm ${
                    message.sender === 'user'
                      ? 'bg-uh-red text-white'
                      : message.source === 'error'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : message.source === 'faq'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    <div className={`text-xs mt-1 opacity-70 ${message.sender === 'user' ? 'text-red-100' : 'text-gray-500'}`}>
                      {formatTime(message.timestamp)}
                      {message.sender === 'ai' && ' • Merlin'}
                      {message.routeReason && message.sender === 'ai' && ` • ${routeLabels[message.routeReason] || 'Merlin'}`}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 p-3 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse flex space-x-1">
                        <div className="rounded-full bg-gray-400 h-2 w-2" />
                        <div className="rounded-full bg-gray-400 h-2 w-2" />
                        <div className="rounded-full bg-gray-400 h-2 w-2" />
                      </div>
                      <span className="text-sm text-gray-600">Merlin is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg space-y-3">
            <div className="flex gap-2 items-center">
              <select
                value={providerPreference}
                onChange={(event) => setProviderPreference(event.target.value as ProviderPreference)}
                className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-2 text-xs"
                aria-label="Merlin mode"
              >
                <option value="auto">Ask Merlin (Auto route)</option>
                <option value="primary">Conversation</option>
                <option value="gemini" disabled={!gemini?.enabled}>Media &amp; YouTube</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMedia((value) => !value)}
                disabled={!mediaEnabled}
                title={mediaEnabled ? 'Add image, video, audio, PDF, or YouTube URL' : 'Merlin media tools are not available'}
              >
                <Paperclip size={15} className="mr-1" /> Media
              </Button>
            </div>

            {showMedia && mediaEnabled && (
              <div className="rounded-md border border-gray-200 p-3 space-y-2 bg-gray-50">
                {gemini?.youtubeEnabled && (
                  <div className="flex items-center gap-2">
                    <Youtube size={16} className="text-red-600 shrink-0" />
                    <Input
                      value={youtubeUrl}
                      onChange={(event) => setYoutubeUrl(event.target.value)}
                      placeholder="Public YouTube URL"
                      className="h-9 text-xs"
                    />
                  </div>
                )}
                {gemini?.uploadsEnabled && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={gemini.allowedMediaMimeTypes.join(',')}
                      onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
                      className="block w-full text-xs text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-200 file:px-3 file:py-2 file:text-xs file:font-medium"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Maximum {Math.round(gemini.maxMediaBytes / 1024 / 1024)} MB. Files are sent for this request and are not stored by CoogsNation.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Merlin anything about CoogsNation, products, or attached media..."
                className="flex-1 min-h-[42px] max-h-[120px] resize-none focus:ring-uh-red focus:border-uh-red"
                disabled={isLoading || status?.enabled === false}
                maxLength={4000}
                data-testid="input-chat-message"
              />
              <Button onClick={sendMessage} disabled={!input.trim() || isLoading || status?.enabled === false} className="bg-uh-red hover:bg-red-700 text-white px-4 self-end">
                <Send size={16} />
              </Button>
            </div>
            <div className="text-xs text-gray-500 text-center">
              Merlin can make mistakes. Never share passwords, payment data, or confidential information.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
