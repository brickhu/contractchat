import { For, Show, createSignal } from 'solid-js'
import { models, selectedModel, setSelectedModel, selectedNetwork, setSelectedNetwork, NETWORKS, API_BASE } from '../stores/app'

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = createSignal(API_BASE)

  return (
    <div class="h-full overflow-y-auto">
      <div class="max-w-2xl mx-auto px-6 py-6">
        <h1 class="text-xl font-bold text-zinc-100 mb-6">设置</h1>

        <Section title="AI 模型">
          <div class="flex flex-col gap-2">
            <For each={models()} fallback={<p class="text-sm text-zinc-600">后端未连接或无可用模型</p>}>
              {m => (
                <label class={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
                  ${selectedModel() === m.id ? 'border-purple-500/40 bg-purple-500/5' : 'border-white/[0.07] hover:border-white/15'}`}>
                  <div class="flex items-center gap-3">
                    <input type="radio" name="model" checked={selectedModel() === m.id} onChange={() => setSelectedModel(m.id)} class="accent-purple-400" />
                    <div>
                      <div class="text-sm font-medium text-zinc-200">{m.name}</div>
                      <div class="text-xs text-zinc-500">{m.provider}</div>
                    </div>
                  </div>
                  <span class={`text-[10px] px-2 py-0.5 rounded-full border font-mono
                    ${m.tier === 'free' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                    {m.tier}
                  </span>
                </label>
              )}
            </For>
          </div>
        </Section>

        <Section title="默认网络">
          <div class="grid grid-cols-2 gap-2">
            <For each={NETWORKS}>
              {n => (
                <label class={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                  ${selectedNetwork() === n.id ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/[0.07] hover:border-white/15'}`}>
                  <input type="radio" name="network" checked={selectedNetwork() === n.id} onChange={() => setSelectedNetwork(n.id)} class="accent-emerald-400" />
                  <span class="text-sm text-zinc-200">{n.label}</span>
                </label>
              )}
            </For>
          </div>
        </Section>

        <Section title="后端地址">
          <div class="flex gap-2">
            <input
              value={apiUrl()}
              onInput={e => setApiUrl(e.target.value)}
              placeholder="http://localhost:3001"
              class="flex-1 h-9 px-3 bg-zinc-800 border border-white/[0.08] rounded-lg text-sm font-mono text-zinc-300 outline-none focus:border-purple-500/40 transition-colors"
            />
            <button class="h-9 px-4 rounded-lg bg-zinc-700 text-zinc-200 text-sm hover:bg-zinc-600 transition-colors">
              保存
            </button>
          </div>
          <p class="text-xs text-zinc-600 mt-1.5">默认从 <code class="font-mono bg-zinc-800 px-1 rounded">VITE_API_URL</code> 环境变量读取</p>
        </Section>

        <Section title="关于">
          <div class="text-sm text-zinc-500 space-y-1">
            <p>ContractChat v3 · SolidJS + Tailwind CSS 4</p>
            <p>前端部署：GitHub Pages · 后端部署：Railway</p>
            <p class="text-xs text-zinc-600 mt-2">对话历史存储在浏览器本地 localStorage</p>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div class="mb-6">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">{title}</h2>
      <div class="bg-zinc-900 border border-white/[0.07] rounded-xl p-4">
        {children}
      </div>
    </div>
  )
}
