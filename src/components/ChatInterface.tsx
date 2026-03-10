
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Check, X, Settings2, FileCode, Paperclip } from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { SimulationConfig, StepData, AIConfig, AIProvider } from '../simulation/types';
import Markdown from 'react-markdown';

interface ChatInterfaceProps {
  config: SimulationConfig;
  history: StepData[];
  aiConfig: AIConfig;
  onUpdateSettings: (newConfig: any) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ config, history, aiConfig, onUpdateSettings }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your Telic System Analyst. I can help you interpret the simulation data or suggest parameter changes to explore new emergent behaviors. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<any | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string, content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasKey = aiConfig.apiKey || (aiConfig.provider === AIProvider.GEMINI && process.env.GEMINI_API_KEY);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || isLoading || !hasKey) return;

    const userMessage = input.trim();
    const fileContent = attachedFile ? `\n\n[ATTACHED FILE: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\`` : '';
    const fullMessage = userMessage + fileContent;

    setInput('');
    setAttachedFile(null);
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage || `Analyzed file: ${attachedFile?.name}` 
    }]);
    setIsLoading(true);

    const response = await chatWithAI(
      fullMessage, 
      config, 
      history, 
      aiConfig, 
      (suggestedConfig) => {
        setPendingConfig(prev => ({ ...(prev || {}), ...suggestedConfig }));
      }
    );
    
    setMessages(prev => [...prev, { role: 'assistant', content: response || "I'm not sure how to respond to that." }]);
    setIsLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachedFile({ name: file.name, content });
    };
    reader.readAsText(file);
  };

  const approveChanges = () => {
    if (pendingConfig) {
      onUpdateSettings(pendingConfig);
      setPendingConfig(null);
      setMessages(prev => [...prev, { role: 'assistant', content: "Settings updated successfully! You can now run the simulation with the new parameters." }]);
    }
  };

  const rejectChanges = () => {
    setPendingConfig(null);
  };

  return (
    <div className="flex flex-col h-[500px] bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-100">AI Analyst</h3>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-full">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase">Live Analysis</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 relative">
        {!hasKey && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-zinc-900/60 backdrop-blur-sm">
            <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 border border-zinc-700">
              <Sparkles className="w-6 h-6 text-zinc-500" />
            </div>
            <h4 className="text-sm font-bold text-zinc-200 mb-2 uppercase tracking-wider">AI Analysis Offline</h4>
            <p className="text-xs text-zinc-500 max-w-[240px] mb-6">
              Connect an AI provider to enable live simulation analysis and automated parameter optimization.
            </p>
            <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-2">Configure in settings panel</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-zinc-800' : 'bg-emerald-600 shadow-lg shadow-emerald-900/20'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-zinc-400" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-zinc-800 text-zinc-200 rounded-tr-none' 
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none'
              }`}>
                <div className="markdown-body prose prose-invert prose-sm max-w-none">
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-sm animate-pulse">
                Analyzing simulation data...
              </div>
            </div>
          </div>
        )}
      </div>

      {pendingConfig && (
        <div className="mx-4 mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Proposed Changes</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={approveChanges}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-lg transition-colors"
              >
                <Check className="w-3 h-3" /> Approve
              </button>
              <button 
                onClick={rejectChanges}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-bold uppercase rounded-lg transition-colors"
              >
                <X className="w-3 h-3" /> Ignore
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(pendingConfig).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between px-2 py-1 bg-zinc-950/50 rounded-md border border-zinc-800/50">
                <span className="text-[10px] text-zinc-500 font-mono">{key}</span>
                <span className="text-[10px] text-emerald-400 font-bold font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-zinc-900/80 border-t border-zinc-800">
        {attachedFile && (
          <div className="mb-2 flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-in fade-in slide-in-from-bottom-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileCode className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-[10px] text-emerald-500 font-mono truncate">{attachedFile.name}</span>
            </div>
            <button 
              onClick={() => setAttachedFile(null)}
              className="p-1 hover:bg-emerald-500/20 rounded-md transition-colors"
            >
              <X className="w-3 h-3 text-emerald-500" />
            </button>
          </div>
        )}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".py,.txt,.json,.js,.ts"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!hasKey || isLoading}
            className="p-2 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 disabled:opacity-50 transition-all border border-zinc-700"
            title="Attach a file (Python, Text, etc.)"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!hasKey}
            placeholder={hasKey ? "Ask about results or upload a script..." : "Connect AI to start chatting..."}
            className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !attachedFile) || !hasKey}
            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
