/**
 * CoogpawsAiPanel
 * ---------------------------------------------------------------------------
 * The Coog Paws AI assistant, preserved.
 *
 * Extracted verbatim in behaviour from the previous `CoogpawsChat` page: the
 * same `/ai` namespace, the same `ai-message` request, the same `ai-chunk`
 * streaming accumulation, the same feature-flag gate and the same feedback
 * endpoint. Nothing about the AI subsystem changed — it moved, so the page
 * that used to be a two-tab card can become an immersive room without the
 * assistant being lost in the process.
 *
 * It connects only when opened. The old page opened the AI socket on mount
 * whenever the flag was on, whether or not the member ever looked at that tab.
 */

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export function CoogpawsAiPanel({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io("/ai", { withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => { setConnected(true); setProblem(null); });
    socket.on("disconnect", () => setConnected(false));
    /* The listener the original page lacked — an AI socket refusal was as
     * invisible as the group-chat one. */
    socket.on("connect_error", (error: Error) => {
      setConnected(false);
      setProblem(error?.message || "The assistant is unavailable.");
    });

    socket.on("ai-chunk", (data: any) => {
      const { id, fullResponse, isComplete } = data;
      const key = String(id ?? "streaming");
      setMessages((prior) => {
        const existing = prior.find((message) => message.id === key);
        if (existing) {
          return prior.map((message) =>
            message.id === key
              ? { ...message, content: fullResponse, isStreaming: !isComplete }
              : message,
          );
        }
        return [...prior, {
          id: key,
          role: "assistant" as const,
          content: fullResponse,
          timestamp: new Date(),
          isStreaming: !isComplete,
        }];
      });
    });

    socket.on("ai-response", (data: any) => {
      if (data?.error) setProblem(String(data.error));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const send = () => {
    const text = draft.trim();
    const socket = socketRef.current;
    if (!text || !socket?.connected) return;

    setMessages((prior) => [...prior, {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    }]);

    socket.emit("ai-message", { message: text, conversationId: `conv_${Date.now()}` });
    setDraft("");
  };

  const sendFeedback = async (messageId: string, feedback: "1" | "-1") => {
    try {
      const response = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: parseInt(messageId, 10), feedback }),
      });
      if (response.ok) {
        toast({ title: "Feedback sent", description: "Thank you for helping CoogAI learn." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send feedback", variant: "destructive" });
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-x-2 bottom-2 top-2 z-30 flex flex-col overflow-hidden rounded-lg border border-white/15 bg-black/85 text-white backdrop-blur-md sm:inset-auto sm:bottom-4 sm:left-4 sm:top-4 sm:w-[22rem]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3">
        <span
          className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`}
          aria-hidden
        />
        <div className="flex-1 text-sm font-semibold">AI Assistant</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
        >
          Close
        </button>
      </div>

      {problem && (
        <p className="border-b border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {problem}
        </p>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3" role="log" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-xs text-white/50">Ask about campus, teams, or the community.</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="text-sm">
            <div className="text-xs font-semibold text-amber-200">
              {message.role === "user" ? "You" : "CoogAI"}
            </div>
            <p className="whitespace-pre-wrap break-words text-white/90">
              {message.content}
              {message.isStreaming && <span className="animate-pulse">▍</span>}
            </p>
            {message.role === "assistant" && !message.isStreaming && (
              <div className="mt-1 flex gap-2 text-[11px] text-white/50">
                <button type="button" onClick={() => sendFeedback(message.id, "1")} className="hover:text-white">
                  Helpful
                </button>
                <button type="button" onClick={() => sendFeedback(message.id, "-1")} className="hover:text-white">
                  Not helpful
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-2">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            disabled={!connected}
            placeholder={connected ? "Ask CoogAI…" : "Assistant unavailable"}
            aria-label="Message the AI assistant"
            className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
          />
          <Button type="button" size="sm" onClick={send} disabled={!connected || !draft.trim()}>
            Send
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-white/40">
          AI responses are generated automatically and may not always be accurate.
        </p>
      </div>
    </div>
  );
}

export default CoogpawsAiPanel;
