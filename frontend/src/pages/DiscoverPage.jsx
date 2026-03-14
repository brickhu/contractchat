import { createSignal, createResource, For, Show } from 'solid-js'
import { selectedNetwork, setPage, toast } from '../stores/app'
import { api } from '../lib/api'

const CATEGORY_COLORS = {
  DeFi: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  NFT: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Governance: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Token: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Other: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
}

export default function DiscoverPage() {
  const [search, setSearch] = createSignal('')
  const [category, setCategory] = createSignal('all')

  const [contracts] = createResource(selectedNetwork, net => api.discover(net))

  const filtered = () => {
    const list = contracts() || []
    const q = search().toLowerCase()
    return list.filter(c => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      const matchCat = category() === 'all' || c.category === category()
      return matchSearch && matchCat
    })
  }

  const categories = () => {
    const list = contracts() || []
    return ['all', ...new Set(list.map(c => c.category).filter(Boolean))]
  }

  function useContract(c) {
    // Navigate to chat and pre-fill address
    window._pendingContract = c.address
    setPage('chat')
    toast(`已选择 ${c.name}，请点击「加载合约」`, 'info')
  }

  return (
    <div class="h-full overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-6">
        {/* Header */}
        <div class="mb-6">
          <h1 class="text-xl font-bold text-zinc-100 mb-1">合约发现</h1>
          <p class="text-sm text-zinc-500">经过官方审核的安全合约列表，可放心交互</p>
        </div>

        {/* Search + filter */}
        <div class="flex gap-3 mb-5">
          <input
            value={search()}
            onInput={e => setSearch(e.target.value)}
            placeholder="搜索合约名称、地址或描述…"
            class="flex-1 h-9 px-3 bg-zinc-900 border border-white/[0.08] rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-purple-500/40 transition-colors"
          />
          <div class="flex gap-1.5">
            <For each={categories()}>
              {cat => (
                <button
                  onClick={() => setCategory(cat)}
                  class={`px-3 h-9 rounded-lg text-xs font-medium border transition-all
                    ${category() === cat
                      ? 'bg-zinc-700 border-white/20 text-zinc-100'
                      : 'bg-zinc-900 border-white/[0.07] text-zinc-500 hover:text-zinc-300 hover:border-white/15'}`}
                >
                  {cat === 'all' ? '全部' : cat}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Loading */}
        <Show when={contracts.loading}>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <For each={[1,2,3,4]}>
              {() => <div class="h-32 rounded-xl bg-zinc-900 border border-white/[0.07] animate-pulse"/>}
            </For>
          </div>
        </Show>

        {/* Error */}
        <Show when={contracts.error}>
          <div class="text-center py-12 text-zinc-500">
            <div class="text-2xl mb-2">⚠</div>
            <div class="text-sm">无法加载合约列表，请检查后端连接</div>
          </div>
        </Show>

        {/* Contract grid */}
        <Show when={!contracts.loading && !contracts.error}>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <For each={filtered()} fallback={
              <div class="col-span-2 text-center py-12 text-zinc-600 text-sm">没有找到匹配的合约</div>
            }>
              {c => <ContractCard contract={c} onUse={() => useContract(c)} />}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
}

function ContractCard({ contract: c, onUse }) {
  const catStyle = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Other
  return (
    <div class="bg-zinc-900 border border-white/[0.07] rounded-xl p-4 hover:border-white/15 transition-all group">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-lg bg-zinc-800 border border-white/[0.08] flex items-center justify-center text-lg shrink-0">
            {c.icon || '📄'}
          </div>
          <div>
            <div class="text-sm font-semibold text-zinc-100">{c.name}</div>
            <div class="text-[10px] font-mono text-zinc-600">{c.address?.slice(0,10)}…{c.address?.slice(-4)}</div>
          </div>
        </div>
        <span class={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${catStyle}`}>
          {c.category || 'Other'}
        </span>
      </div>

      <p class="text-xs text-zinc-500 leading-relaxed mb-3 line-clamp-2">{c.description || '暂无描述'}</p>

      <div class="flex items-center justify-between">
        <div class="flex gap-1.5">
          <Show when={c.audited}>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ 已审计</span>
          </Show>
          <Show when={c.skill}>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{c.skill} Skill</span>
          </Show>
          <Show when={c.tvl}>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/[0.06]">TVL {c.tvl}</span>
          </Show>
        </div>
        <button
          onClick={onUse}
          class="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors opacity-0 group-hover:opacity-100"
        >
          开始交互 →
        </button>
      </div>
    </div>
  )
}
