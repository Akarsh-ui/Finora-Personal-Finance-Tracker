import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Trash2,
  Sparkles,
  AlertCircle,
  HelpCircle,
  User as UserIcon,
  CheckCircle2,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface AiAssistantPageProps {
  user?: {
    name?: string;
    email?: string;
  };
}

const TOKEN_KEY = 'finora_session_token';

const SUGGESTED_PROMPTS = [
  'How much did I spend this month?',
  'What is my highest spending category?',
  'Compare my income and expenses this month.',
  'Am I staying within my budgets?',
  'Show my spending trends over the last three months.',
  'Where can I reduce unnecessary expenses?',
];

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch {
    // ignore
  }
  return headers;
}

/**
 * Format markdown-like text with bold, bullet points, and clean line breaks
 */
function renderFormattedMessage(text: string) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
              <span className="flex-1">
                {parseInlineFormatting(content)}
              </span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 text-[11px] mt-0.5">
                {numMatch[1]}.
              </span>
              <span className="flex-1">
                {parseInlineFormatting(numMatch[2])}
              </span>
            </div>
          );
        }

        return <p key={idx}>{parseInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

function parseInlineFormatting(str: string) {
  // Simple parser for **bold** text
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export const AiAssistantPage: React.FC<AiAssistantPageProps> = ({ user: propUser }) => {
  const { user: authUser } = useAuth();
  const activeUser = propUser || authUser;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [configNotice, setConfigNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!messageContent || isLoading) return;

    setErrorMessage(null);
    setConfigNotice(null);

    // Create user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: messageContent,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Build conversation history for context (last 8 turns)
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          message: messageContent,
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.configured === false) {
          setConfigNotice(
            data.message ||
              'AI Assistant API key is not configured. Please add GEMINI_API_KEY to your server .env file.'
          );
        } else {
          setErrorMessage(data.message || 'Unable to connect to AI Assistant. Please try again.');
        }

        // Add a gentle error message bubble from the model
        setMessages((prev) => [
          ...prev,
          {
            id: `model-${Date.now()}`,
            role: 'model',
            text:
              data.configured === false
                ? 'AI Assistant API key is not configured. Please add `GEMINI_API_KEY=your_key` to your server `.env` file to enable conversational chat.'
                : data.message || 'Sorry, I encountered an error retrieving a response. Please try again.',
            timestamp: new Date(),
          },
        ]);
        return;
      }

      // Add AI response
      const aiReply: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network request failed';
      setErrorMessage(`Connection error: ${msg}`);
      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: 'Unable to reach the server. Please check your internet connection and verify the server is running.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMessage(null);
    setConfigNotice(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] min-h-[500px]">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-sm mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 shrink-0">
              <Bot className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Finora AI Assistant
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-3 w-3" />
                  AI Financial Intelligence
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Your intelligent financial copilot. Ask about your income, expenses, budgets, savings rate, and spending patterns.
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/50 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              title="Reset conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>

        {/* Missing API Key Notice (if detected) */}
        {configNotice && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold">AI Assistant Configuration Required: </span>
              {configNotice}
            </div>
          </div>
        )}

        {/* Generic Error Notice */}
        {errorMessage && !configNotice && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}
      </div>

      {/* Main Chat Conversation Viewport */}
      <div className="flex-1 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-sm flex flex-col overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            /* Empty State with Welcoming Guide & Suggested Questions */
            <div className="h-full flex flex-col justify-center items-center text-center max-w-xl mx-auto py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
                <Bot className="h-7 w-7" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                How can I assist your wealth goals today, {activeUser?.name || 'Partner'}?
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
                I have secure, read-only access to your real Finora transactions and saved budgets. Tap a suggested question or type your own below:
              </p>

              {/* Clickable Suggested Questions */}
              <div className="mt-6 w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {SUGGESTED_PROMPTS.map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(promptText)}
                    disabled={isLoading}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500/80 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all cursor-pointer group shadow-2xs"
                  >
                    <span>{promptText}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Rendered Messages */
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 shadow-xs text-xs font-bold ${
                      isUser
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                    }`}
                  >
                    {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 shadow-2xs ${
                      isUser
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white rounded-tr-xs'
                        : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-tl-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-75">
                      <span className="font-semibold">{isUser ? 'You' : 'Finora AI'}</span>
                      <span>
                        {msg.timestamp.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {isUser ? (
                      <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      renderFormattedMessage(msg.text)
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Assistant Loading Indicator Bubble */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <div className="rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 px-4 py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 shadow-2xs flex items-center gap-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Analyzing your financial data...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Footer Disclaimer */}
        <div className="border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder="Ask about expenses, income, budgets, or savings trends..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-4 pr-10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 dark:focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 transition-colors disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="flex h-10 w-10 sm:w-auto sm:px-4 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xs hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all disabled:opacity-40 cursor-pointer shrink-0"
              title="Send message"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </form>

          {/* Privacy & Scope Disclaimer */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 text-center">
            <Shield className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Finora AI provides read-only insights based on your verified transactions and saved budgets.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
