// HistoryPage.jsx
import { For, Show } from 'solid-js'
import { sessions, deleteSession, activeSessionId, setActiveSessionId, setPage } from '../stores/app'

export default function HistoryPage() {
  return (
    <div class="h-full overflow-y-auto">
      <div class="max-w-3xl mx-auto px-6 py-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-xl font-bold text-zinc-100 mb-1">对话历史</h1>
            <p class="text-sm text-zinc-500">{sessions().length} 条记录，存储在本地</p>
          </div>
          <Show when={sessions().length > 0}>
            <button
              onClick={() => {
                if (confirm('确认清空所有对话历史？')) {
                  localStorage.removeItem('cc_sessions')
                  window.location.reload()
                }
              }}
              class="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              清空全部
            </button>
          </Show>
        </div>

        <Show when={sessions().length === 0}>
          <div class="text-center py-20 text-zinc-600">
            <div class="text-4xl mb-3 opacity-30">💬</div>
            <div class="text-sm">暂无对话历史</div>
          </div>
        </Show>

        <div class="flex flex-col gap-2">
          <For each={sessions()}>
            {s => (
              <div
                class={`group bg-zinc-900 border rounded-xl px-4 py-3 cursor-pointer hover:border-white/15 transition-all
                  ${activeSessionId() === s.id ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/[0.07]'}`}
                onClick={() => { setActiveSessionId(s.id); setPage('chat') }}
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-zinc-200 truncate">{s.contractName}</div>
                    <div class="flex items-center gap-3 mt-0.5">
                      <span class="text-[10px] font-mono text-zinc-600 truncate">{s.contractAddress?.slice(0,16)}…</span>
                      <span class="text-[10px] text-zinc-600">{s.messages?.length || 0} 条消息</span>
                      <span class="text-[10px] text-zinc-600">{new Date(s.createdAt).toLocaleDateString('zh')}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span class="text-xs text-purple-400">继续 →</span>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                      class="text-zinc-600 hover:text-red-400 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}
