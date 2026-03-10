
import React from 'react';
import { AIProvider, AIConfig } from '../simulation/types';
import { Key, Globe, Cpu, ChevronDown } from 'lucide-react';

interface AISettingsProps {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ config, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const providers = [
    { id: AIProvider.GEMINI, name: 'Google Gemini', defaultModel: 'gemini-3.1-pro-preview' },
    { id: AIProvider.OPENAI, name: 'OpenAI ChatGPT', defaultModel: 'gpt-4o' },
    { id: AIProvider.ANTHROPIC, name: 'Anthropic Claude', defaultModel: 'claude-3-5-sonnet-20241022' },
    { id: AIProvider.DEEPSEEK, name: 'DeepSeek', defaultModel: 'deepseek-chat' },
    { id: AIProvider.GROK, name: 'xAI Grok', defaultModel: 'grok-beta' },
  ];

  const handleProviderChange = (provider: AIProvider) => {
    const p = providers.find(p => p.id === provider);
    onChange({
      ...config,
      provider,
      model: p?.defaultModel || '',
      apiKey: '', // Clear key when switching for safety
    });
  };

  const hasKey = config.apiKey || (config.provider === AIProvider.GEMINI && process.env.GEMINI_API_KEY);

  return (
    <div className={`transition-all duration-300 overflow-hidden ${isOpen ? 'p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl' : 'p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl hover:bg-zinc-900/50'}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg transition-colors ${hasKey ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-100">AI Configuration</h3>
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-tighter">
              {config.provider} • {hasKey ? 'Connected' : 'Offline'}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Provider</label>
              <div className="relative">
                <select
                  value={config.provider}
                  onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 appearance-none focus:ring-2 focus:ring-emerald-500/50 outline-none"
                >
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
                  placeholder={`Enter ${config.provider.toUpperCase()} API Key`}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                />
              </div>
              {config.provider === AIProvider.GEMINI && !config.apiKey && (
                <p className="text-[9px] text-zinc-600 italic ml-1">Defaults to system key if empty.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Model</label>
                <input
                  type="text"
                  value={config.model || ''}
                  onChange={(e) => onChange({ ...config, model: e.target.value })}
                  placeholder="Model ID"
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Base URL (Optional)</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                  <input
                    type="text"
                    value={config.baseUrl || ''}
                    onChange={(e) => onChange({ ...config, baseUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
