import { For } from 'solid-js'
import { page, setPage, sessions, activeSessionId, setActiveSessionId,
         activeContract, deleteSession } from '../stores/app'

const NAV = [
  { id: 'chat',     icon: IconChat,     label: '新对话' },
  { id: 'discover', icon: IconDiscover, label: '合约发现' },
  { id: 'history',  icon: IconHistory,  label: '对话历史' },
  { id: 'settings', icon: IconSettings, label: '设置' },
]

export default function Sidebar() {
  return (
    <aside class="w-64 bg-zinc-900 border-r border-white/[0.07] flex flex-col shrink-0">
      {/* Logo */}
      <div class="px-5 py-5 border-b border-white/[0.07]">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-emerald-400 flex items-center justify-center text-black font-bold text-sm shrink-0">
            ⬡
          </div>
          <div>
            <div class="text-sm font-bold tracking-tight text-zinc-100">ContractChat</div>
            <div class="text-[10px] text-zinc-500 font-mono">v3 · AI × EVM</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav class="px-3 py-3 border-b border-white/[0.07]">
        <For each={NAV}>
          {item => (
            <button
              onClick={() => setPage(item.id)}
              class={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 border transition-all duration-150
                ${page() === item.id
                  ? 'nav-active border-emerald-500/20'
                  : 'text-zinc-400 border-transparent hover:bg-white/[0.04] hover:text-zinc-200'}`}
            >
              <item.icon class="w-4 h-4 shrink-0" />
              <span class="font-medium">{item.label}</span>
            </button>
          )}
        </For>
      </nav>

      {/* Recent sessions */}
      <div class="flex-1 overflow-y-auto px-3 py-3">
        <div class="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-2 mb-2">
          最近对话
        </div>
        <For each={sessions().slice(0, 20)} fallback={
          <div class="text-xs text-zinc-600 px-2 py-1">暂无历史</div>
        }>
          {s => (
            <div
              class={`group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer text-xs mb-0.5 transition-all
                ${activeSessionId() === s.id
                  ? 'bg-zinc-800 text-zinc-200'
                  : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300'}`}
              onClick={() => { setActiveSessionId(s.id); setPage('chat') }}
            >
              <div class="min-w-0">
                <div class="truncate font-medium">{s.contractName}</div>
                <div class="text-zinc-600 text-[10px] font-mono truncate">{s.contractAddress?.slice(0,10)}…</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 ml-1 shrink-0 transition-opacity"
              >
                ✕
              </button>
            </div>
          )}
        </For>
      </div>

      {/* Active contract indicator */}
      <Show when={activeContract()}>
        <div class="px-3 pb-3">
          <div class="bg-zinc-800 rounded-lg px-3 py-2 border border-white/[0.06]">
            <div class="text-[10px] text-zinc-500 mb-0.5">当前合约</div>
            <div class="text-xs font-semibold text-emerald-400 truncate">{activeContract()?.name}</div>
            <div class="text-[10px] font-mono text-zinc-600 truncate">{activeContract()?.address?.slice(0,20)}…</div>
          </div>
        </div>
      </Show>
    </aside>
  )
}

// ── Icons (inline SVG) ───────────────────────────────
function IconChat(props) {
  return <svg {...props} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M2 10c0-4.4 3.6-8 8-8s8 3.6 8 8c0 1.6-.5 3.1-1.3 4.4L18 17l-2.6-.7A7.9 7.9 0 0 1 10 18c-4.4 0-8-3.6-8-8Z"/>
  </svg>
}
function IconDiscover(props) {
  return <svg {...props} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="10" cy="10" r="8"/>
    <path stroke-linecap="round" d="M10 6v4l2.5 2.5"/>
    <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
}
function IconHistory(props) {
  return <svg {...props} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z"/>
    <path stroke-linecap="round" d="M10 7v3l2 2"/>
    <path stroke-linecap="round" d="M3 4l-.5-2M3 4l2-.5"/>
  </svg>
}
function IconSettings(props) {
  return <svg {...props} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="10" cy="10" r="2.5"/>
    <path d="M10 2.5v1.3M10 16.2v1.3M3.7 6l1.1.7M15.2 13.3l1.1.7M2.5 10h1.3M16.2 10h1.3M3.7 14l1.1-.7M15.2 6.7l1.1-.7"/>
  </svg>
}
