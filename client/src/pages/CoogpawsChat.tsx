import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  message: string;
  timestamp?: Date;
}

interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export default function CoogpawsChat() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Regular chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // AI chat state
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInputValue, setAiInputValue] = useState("");
  const [aiSocket, setAiSocket] = useState<Socket | null>(null);
  const [isAiConnected, setIsAiConnected] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  // Fetch feature flags to check if AI is enabled
  useEffect(() => {
    const fetchFeatureFlags = async () => {
      try {
        const response = await fetch('/api/feature-flags');
        const data = await response.json();
        
        if (data.success && data.flags) {
          setIsAiEnabled(data.flags.aiEnabled);
        }
      } catch (error) {
        console.error("Error fetching feature flags:", error);
        setIsAiEnabled(false);
      }
    };

    fetchFeatureFlags();
  }, []);

  // Connect to your existing Socket.io servers
  useEffect(() => {
    // Regular chat socket connection (existing functionality)
    const newSocket = io();

    newSocket.on("connect", () => {
      console.log("Connected to Coog Paws Chat");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Coog Paws Chat");
      setIsConnected(false);
    });

    // Listen for chat messages (using the same event name as your server)
    newSocket.on("chat", (data: ChatMessage) => {
      setMessages((prev) => [...prev, { ...data, timestamp: new Date() }]);
    });

    setSocket(newSocket);

    // AI chat socket connection (only if AI is enabled)
    let aiSocketConnection: any = null;
    if (isAiEnabled) {
      aiSocketConnection = io('/ai');
      
      aiSocketConnection.on("connect", () => {
        console.log("Connected to AI Chat");
        setIsAiConnected(true);
      });

      aiSocketConnection.on("disconnect", () => {
        console.log("Disconnected from AI Chat");
        setIsAiConnected(false);
      });

      // Handle AI streaming chunks
      aiSocketConnection.on("ai-chunk", (data: any) => {
        const { id, chunk, fullResponse, isComplete, memoryUsed } = data;
        
        setAiMessages((prev) => {
          const existing = prev.find(msg => msg.id === id.toString());
          if (existing) {
            // Update existing message with new content
            return prev.map(msg => 
              msg.id === id.toString() 
                ? { ...msg, content: fullResponse, isStreaming: !isComplete }
                : msg
            );
          } else {
            // Create new AI message
            return [...prev, {
              id: id.toString(),
              role: "assistant" as const,
              content: fullResponse,
              timestamp: new Date(),
              isStreaming: !isComplete
            }];
          }
        });
      });

      setAiSocket(aiSocketConnection);
    }

    return () => {
      newSocket.close();
      if (aiSocketConnection) {
        aiSocketConnection.close();
      }
    };
  }, [isAiEnabled]);

  // Regular chat send function (existing)
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if guest mode or not authenticated
    const hasLocalAuth = typeof window !== 'undefined' && localStorage.getItem('currentUser');
    if (!isAuthenticated && !hasLocalAuth) {
      toast({
        title: "Sign in required",
        description: "Please sign in to send messages in the chat.",
        variant: "destructive"
      });
      return;
    }
    
    if (!socket || !inputValue.trim()) return;

    // Send message using the same event name as your server expects
    socket.emit("chat", { message: inputValue.trim() });
    setInputValue("");
  };

  // AI chat send function (new)
  const sendAIMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if guest mode or not authenticated
    const hasLocalAuth = typeof window !== 'undefined' && localStorage.getItem('currentUser');
    if (!isAuthenticated && !hasLocalAuth) {
      toast({
        title: "Sign in required",
        description: "Please sign in to chat with the AI assistant.",
        variant: "destructive"
      });
      return;
    }
    
    if (!aiSocket || !aiInputValue.trim()) return;

    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: aiInputValue.trim(),
      timestamp: new Date()
    };

    setAiMessages(prev => [...prev, userMessage]);

    // Send message to AI socket
    aiSocket.emit("ai-message", {
      message: aiInputValue.trim(),
      conversationId: `conv_${Date.now()}`,
      userId: (user as any)?.id || 'anonymous'
    });

    setAiInputValue("");
  };

  // AI feedback function
  const sendAIFeedback = async (messageId: string, feedback: "1" | "-1") => {
    try {
      const response = await fetch(`/api/ai/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(messageId), feedback })
      });
      
      if (response.ok) {
        toast({
          title: "Feedback sent!",
          description: "Thank you for helping CoogAI learn."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send feedback",
        variant: "destructive"
      });
    }
  };

  // Check for local auth
  const hasLocalAuth = typeof window !== 'undefined' && localStorage.getItem('currentUser');
  const canInteract = isAuthenticated || hasLocalAuth;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-uh-black mb-2">🐾 Coog Paws Chat</h1>
          <p className="text-gray-600">Real-time chat and AI assistance for the University of Houston community</p>
        </div>
        
        {/* Guest Notice */}
        {!canInteract && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-yellow-900">👤 Browsing as Guest</p>
                  <p className="text-xs text-yellow-800 mt-1">Sign in to participate in conversations and chat with AI</p>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                    <a href="/join">Sign Up</a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href="/login">Login</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" data-testid="tab-group-chat">
              💬 Group Chat
              <div className="ml-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="ai" data-testid="tab-ai-chat">
              🤖 AI Assistant
              <div className="ml-2">
                <div className={`w-2 h-2 rounded-full ${isAiConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Group Chat Tab */}
          <TabsContent value="chat" className="mt-6">
            <Card className="h-96 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  Group Chat Messages
                  <span className="text-sm text-gray-600">
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto bg-uh-red rounded p-4 mb-4 space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center text-white py-8">
                      <p>Welcome to Coog Paws Group Chat! 🐾</p>
                      <p className="text-sm">Start a conversation with other Cougar fans...</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-gray-800">{msg.message}</p>
                        {msg.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={sendMessage} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="flex-1"
                    disabled={!isConnected}
                    data-testid="chat-input"
                  />
                  <Button
                    type="submit"
                    disabled={!isConnected || !inputValue.trim()}
                    className="bg-uh-red hover:bg-red-700"
                    data-testid="send-button"
                  >
                    Send
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Chat Tab */}
          <TabsContent value="ai" className="mt-6">
            <Card className="h-96 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  🤖 CoogAI Assistant
                  <span className="text-sm text-gray-600">
                    {isAiConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto bg-blue-50 rounded p-4 mb-4 space-y-2">
                  {aiMessages.length === 0 ? (
                    <div className="text-center text-gray-600 py-8">
                      <p>🤖 Hello! I'm CoogAI, your CoogsNation assistant</p>
                      <p className="text-sm">Ask me anything or get help with questions!</p>
                      {!isAiEnabled && (
                        <p className="text-sm text-orange-600 mt-2">⚠️ AI features are currently disabled</p>
                      )}
                    </div>
                  ) : (
                    aiMessages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg shadow-sm ${
                          msg.role === "user" 
                            ? "bg-uh-red text-white ml-8" 
                            : "bg-white text-gray-800 mr-8"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className={`text-xs ${msg.role === "user" ? "text-gray-200" : "text-gray-500"}`}>
                            {msg.timestamp.toLocaleTimeString()}
                            {msg.isStreaming && " (typing...)"}
                          </p>
                          {msg.role === "assistant" && !msg.isStreaming && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendAIFeedback(msg.id, "1")}
                                className="text-xs px-2 py-1 h-6"
                                data-testid={`thumbs-up-${msg.id}`}
                              >
                                👍
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendAIFeedback(msg.id, "-1")}
                                className="text-xs px-2 py-1 h-6"
                                data-testid={`thumbs-down-${msg.id}`}
                              >
                                👎
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={sendAIMessage} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Ask CoogAI anything..."
                    value={aiInputValue}
                    onChange={(e) => setAiInputValue(e.target.value)}
                    className="flex-1"
                    disabled={!isAiConnected || !isAiEnabled}
                    data-testid="ai-chat-input"
                  />
                  <Button
                    type="submit"
                    disabled={!isAiConnected || !aiInputValue.trim() || !isAiEnabled}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="ai-send-button"
                  >
                    Ask AI
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>💬 Chat responsibly and follow University of Houston community guidelines</p>
          <p className="text-xs mt-1">
            AI responses are generated automatically and may not always be accurate. Please verify important information.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}