import { useState, useCallback, useRef } from 'react'

interface AppState {
  apiKey: string
  model: string
  outputFormat: 'images_text' | 'images_only'
  temperature: number
  aspectRatio: string
  resolution: string
  thinkingLevel: string
  groundingGoogleSearch: boolean
  imageSearch: boolean
  stopSequence: string
  outputLength: number
  topP: number
  prompt: string
  referenceImages: string[]
}

type Message = {
  id: string
  role: 'user' | 'model'
  text?: string
  images?: string[]
  loading?: boolean
  error?: string
}

const ASPECT_RATIOS = ['Auto', '1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9']
const RESOLUTIONS = ['512', '1K', '2K', '4K']
const THINKING_LEVELS = ['minimal', 'low', 'medium', 'high']
const MODELS = [
  { id: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2 (gemini-3.1-flash-image-preview)' },
  { id: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro (gemini-3-pro-image-preview)' },
]

export default function App() {
  const [state, setState] = useState<AppState>({
    apiKey: localStorage.getItem('gemini_api_key') || '',
    model: 'gemini-3.1-flash-image-preview',
    outputFormat: 'images_text',
    temperature: 1.0,
    aspectRatio: 'Auto',
    resolution: '1K',
    thinkingLevel: 'high',
    groundingGoogleSearch: false,
    imageSearch: false,
    stopSequence: '',
    outputLength: 65536,
    topP: 0.95,
    prompt: '',
    referenceImages: [],
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showTools, setShowTools] = useState(true)
  const [apiKeyInput, setApiKeyInput] = useState(state.apiKey)
  const [showApiKey, setShowApiKey] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateState = useCallback((partial: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...partial }))
  }, [])

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKeyInput)
    updateState({ apiKey: apiKeyInput })
  }

  const handleGenerate = async () => {
    if (!state.apiKey) return
    if (!state.prompt.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: state.prompt,
    }

    const loadingMsg: Message = {
      id: 'loading-' + Date.now().toString(),
      role: 'model',
      loading: true,
    }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setState(prev => ({ ...prev, prompt: '' }))

    const controller = new AbortController()
    abortRef.current = controller

    try {
      // Build content parts
      const contents = buildRequest(state, controller.signal)
      const result = await contents
      
      // Parse result
      const modelMsg: Message = {
        id: 'resp-' + Date.now().toString(),
        role: 'model',
        text: result.text || undefined,
        images: result.images,
      }

      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? modelMsg : m))
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages(prev => prev.filter(m => m.id !== loadingMsg.id))
        return
      }
      const errorMsg: Message = {
        id: 'err-' + Date.now().toString(),
        role: 'model',
        error: err.message || 'Terjadi kesalahan',
        loading: false,
      }
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? errorMsg : m))
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    abortRef.current = null
  }

  const handleClearChat = () => {
    setMessages([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-[360px]'} border-r border-border flex-shrink-0 transition-all duration-200 flex flex-col bg-white`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h1 className="text-[15px] font-semibold text-text-primary whitespace-nowrap">
            🍌 Nano Banana 2
          </h1>
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-[13px]">
          {/* API Key */}
          <Section label="API Key">
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="Masukkan Gemini API key"
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[13px] focus:outline-none focus:border-text-primary transition-colors pr-8"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                >
                  {showApiKey ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput}
                className="px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-[13px] font-medium transition-colors"
              >
                Save
              </button>
            </div>
            {state.apiKey && (
              <p className="text-[11px] text-green-600 mt-1">✅ API key tersimpan</p>
            )}
          </Section>

          {/* Model */}
          <Section label="Model">
            <select
              value={state.model}
              onChange={e => updateState({ model: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[13px] focus:outline-none focus:border-text-primary bg-white"
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </Section>

          {/* Output Format */}
          <Section label="Output format">
            <div className="flex gap-2">
              {(['images_text', 'images_only'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => updateState({ outputFormat: f })}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all ${
                    state.outputFormat === f
                      ? 'border-text-primary bg-surface-hover text-text-primary'
                      : 'border-border text-text-secondary hover:border-text-tertiary'
                  }`}
                >
                  {f === 'images_text' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                  )}
                  {f === 'images_text' ? 'Images & text' : 'Images only'}
                </button>
              ))}
            </div>
          </Section>

          {/* Temperature */}
          <Section label={`Temperature: ${state.temperature}`}>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={state.temperature}
                onChange={e => updateState({ temperature: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={state.temperature}
                onChange={e => updateState({ temperature: Math.min(2, Math.max(0, parseFloat(e.target.value) || 0)) })}
                className="w-14 px-2 py-1.5 border border-border rounded-lg text-[13px] text-center focus:outline-none focus:border-text-primary"
              />
            </div>
          </Section>

          {/* Aspect Ratio */}
          <Section label="Aspect ratio">
            <select
              value={state.aspectRatio}
              onChange={e => updateState({ aspectRatio: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[13px] focus:outline-none focus:border-text-primary bg-white"
            >
              {ASPECT_RATIOS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Section>

          {/* Resolution */}
          <Section label="Resolution">
            <select
              value={state.resolution}
              onChange={e => updateState({ resolution: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[13px] focus:outline-none focus:border-text-primary bg-white"
            >
              {RESOLUTIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Section>

          {/* Thinking Level */}
          <Section label="Thinking level">
            <select
              value={state.thinkingLevel}
              onChange={e => updateState({ thinkingLevel: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[13px] focus:outline-none focus:border-text-primary bg-white"
            >
              {THINKING_LEVELS.map(l => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </Section>

          {/* Tools Section */}
          <div>
            <button
              onClick={() => setShowTools(!showTools)}
              className="flex items-center justify-between w-full text-[13px] font-medium text-text-primary py-1"
            >
              <span>Tools</span>
              <svg className={`transition-transform ${showTools ? 'rotate-180' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showTools && (
              <div className="mt-2 space-y-3">
                <ToggleOption
                  label="Grounding with Google Search"
                  description="Source: Google Search"
                  enabled={state.groundingGoogleSearch}
                  onChange={v => updateState({ groundingGoogleSearch: v })}
                />
                <ToggleOption
                  label="Image search"
                  description="Source: Google Search"
                  enabled={state.imageSearch}
                  onChange={v => updateState({ imageSearch: v })}
                  disabled={!state.groundingGoogleSearch}
                />
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-[13px] font-medium text-text-primary py-1"
            >
              <span>Advanced settings</span>
              <svg className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showAdvanced && (
              <div className="mt-2 space-y-3">
                <Section label="Add stop sequence">
                  <input
                    type="text"
                    value={state.stopSequence}
                    onChange={e => updateState({ stopSequence: e.target.value })}
                    placeholder="Add stop..."
                    className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[13px] focus:outline-none focus:border-text-primary"
                  />
                </Section>
                <Section label="Output length">
                  <input
                    type="number"
                    value={state.outputLength}
                    onChange={e => updateState({ outputLength: parseInt(e.target.value) || 8192 })}
                    className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[13px] focus:outline-none focus:border-text-primary"
                  />
                </Section>
                <Section label={`Top P: ${state.topP}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={state.topP}
                      onChange={e => updateState({ topP: parseFloat(e.target.value) })}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={state.topP}
                      onChange={e => updateState({ topP: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)) })}
                      className="w-14 px-2 py-1.5 border border-border rounded-lg text-[13px] text-center focus:outline-none focus:border-text-primary"
                    />
                  </div>
                </Section>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-main">
        {/* Main Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white">
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}
            <h2 className="text-[15px] font-semibold text-text-primary">Nano Banana 2 Generator</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="px-2.5 py-1.5 border border-border rounded-lg text-[13px] text-text-secondary hover:bg-surface-hover transition-colors"
            >
              Clear chat
            </button>
            <a
              href="https://github.com/iqbalfa/Nano-Banana-2-Generator"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 border border-border rounded-lg text-[13px] text-text-secondary hover:bg-surface-hover transition-colors flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
              <div className="text-5xl mb-4">🍌</div>
              <p className="text-[15px] font-medium text-text-secondary">Nano Banana 2 Generator</p>
              <p className="text-[13px] mt-1">Generate images using Google's Gemini Nano Banana API</p>
              <p className="text-[12px] mt-4 text-text-tertiary">Enter your prompt below to get started</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-accent text-white'
                  : 'bg-white border border-border'
              }`}>
                {msg.loading && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                    <span className="text-[13px] text-text-secondary">Generating...</span>
                  </div>
                )}
                {msg.error && (
                  <div className="text-red-500 text-[13px] whitespace-pre-wrap">{msg.error}</div>
                )}
                {msg.text && (
                  <div className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                )}
                {msg.images && msg.images.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Generated ${i + 1}`}
                        className="max-w-full rounded-lg border border-border"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Prompt Input */}
        <div className="border-t border-border bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={state.prompt}
                  onChange={e => updateState({ prompt: e.target.value })}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the image you want to generate..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-[13px] focus:outline-none focus:border-text-primary resize-none transition-colors"
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 border border-border rounded-xl hover:bg-surface-hover text-text-secondary transition-colors"
                  title="Attach reference images"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={() => {
                    // Reference image upload — coming soon
                  }}
                />
                <button
                  onClick={handleGenerate}
                  disabled={!state.apiKey || !state.prompt.trim()}
                  className="px-4 py-2.5 bg-accent text-white rounded-xl hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-[13px] font-medium transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
                {messages.some(m => m.loading) && (
                  <button
                    onClick={handleStop}
                    className="px-3 py-2.5 border border-red-300 text-red-500 rounded-xl hover:bg-red-50 text-[13px] font-medium transition-colors"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ToggleOption({ label, description, enabled, onChange, disabled }: {
  label: string
  description: string
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center justify-between ${disabled ? 'opacity-40' : ''}`}>
      <div>
        <div className="text-[13px] text-text-primary font-medium">{label}</div>
        <div className="text-[11px] text-text-tertiary mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? 'bg-accent' : 'bg-gray-200'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div style={{
          position: 'absolute',
          top: '2px',
          width: '16px',
          height: '16px',
          backgroundColor: 'white',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'transform 0.15s ease',
          transform: enabled ? 'translateX(18px)' : 'translateX(2px)',
        }} />
      </button>
    </div>
  )
}

async function buildRequest(state: AppState, signal: AbortSignal): Promise<{ text?: string; images?: string[] }> {
  const apikey = state.apiKey
  const model = state.model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const modalities = state.outputFormat === 'images_only' ? ['IMAGE'] : ['TEXT', 'IMAGE']

  const generationConfig: Record<string, any> = {
    temperature: state.temperature,
    topP: state.topP,
    maxOutputTokens: state.outputLength,
    responseModalities: modalities,
  }

  if (state.aspectRatio !== 'Auto') {
    generationConfig.responseFormat = {
      image: {
        aspectRatio: state.aspectRatio,
        imageSize: state.resolution,
      }
    }
  }

  if (state.thinkingLevel) {
    generationConfig.thinkingConfig = {
      thinkingLevel: state.thinkingLevel,
    }
  }

  if (state.stopSequence) {
    generationConfig.stopSequences = [state.stopSequence]
  }

  const tools: Record<string, any>[] = []
  if (state.groundingGoogleSearch) {
    const searchTool: Record<string, any> = { googleSearch: {} }
    if (state.imageSearch) {
      searchTool.googleSearch.searchTypes = {
        webSearch: {},
        imageSearch: {},
      }
    }
    tools.push(searchTool)
  }

  const body: Record<string, any> = {
    contents: [
      {
        parts: [{ text: state.prompt }],
      },
    ],
    generationConfig,
  }

  if (tools.length > 0) {
    body.tools = tools
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apikey,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`API Error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  
  const result: { text?: string; images?: string[] } = {}
  
  if (data.candidates?.[0]?.content?.parts) {
    const images: string[] = []
    let textParts: string[] = []

    for (const part of data.candidates[0].content.parts) {
      if (part.text) {
        textParts.push(part.text)
      }
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`)
      }
    }

    if (textParts.length > 0) result.text = textParts.join('\n')
    if (images.length > 0) result.images = images
  }

  // Also check for grounding metadata
  if (data.candidates?.[0]?.groundingMetadata) {
    const gm = data.candidates[0].groundingMetadata
    if (gm.searchEntryPoint?.renderedContent) {
      // Could show search suggestions chip if needed
    }
  }

  return result
}
