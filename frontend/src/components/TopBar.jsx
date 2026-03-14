import { Show, createSignal } from 'solid-js'
import { wallet, connectWallet, disconnectWallet,
         selectedNetwork, setSelectedNetwork, NETWORKS,
         selectedModel, setSelectedModel, models, toast, page } from '../stores/app'

const PAGE_TITLES = {
  chat:     '新对话',
  discover: '合约发现',
  history:  '对话历史',
  settings: '设置',
}

export default function TopBar() {
  const [connecting, setConnecting] = createSignal(false)

  async function handleConnect() {
    if (wallet()) { disconnectWallet(); return }
    setConnecting(true)
    try {
      await connectWallet()
      toast('钱包已连接', 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <header class="h-14 border-b border-white/[0.07] px-5 flex items-center justify-between bg-zinc-950 shrink-0">
      {/* Left: page title */}
      <span class="text-sm font-semibold text-zinc-400">{PAGE_TITLES[page()] || 'ContractChat'}</span>

      {/* Right: controls */}
      <div class="flex items-center gap-2">

        {/* Network selector */}
        <select
          value={selectedNetwork()}
          onChange={e => setSelectedNetwork(e.target.value)}
          class="h-8 px-2 bg-zinc-800 border border-white/[0.08] rounded-lg text-xs font-mono text-zinc-300 outline-none hover:border-white/20 transition-colors cursor-pointer"
        >
          <For each={NETWORKS}>
            {n => <option value={n.id}>{n.label}</option>}
          </For>
        </select>

        {/* Model selector */}
        <Show when={models().length > 0}>
          <select
            value={selectedModel()}
            onChange={e => setSelectedModel(e.target.value)}
            class="h-8 px-2 bg-zinc-800 border border-white/[0.08] rounded-lg text-xs text-zinc-300 outline-none hover:border-white/20 transition-colors cursor-pointer max-w-36"
          >
            <For each={models()}>
              {m => <option value={m.id}>{m.name}</option>}
            </For>
          </select>
        </Show>

        {/* Wallet button */}
        <button
          onClick={handleConnect}
          disabled={connecting()}
          class={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all duration-150
            ${wallet()
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-zinc-800 border-white/[0.1] text-zinc-300 hover:bg-zinc-700 hover:border-white/20'}
            disabled:opacity-50`}
        >
          <Show when={connecting()}>
            <span class="opacity-60">连接中…</span>
          </Show>
          <Show when={!connecting() && wallet()}>
            <span class="flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              <span class="font-mono">{wallet()?.address?.slice(0,6)}…{wallet()?.address?.slice(-4)}</span>
              <span class="text-zinc-500 font-normal">· {wallet()?.chainName}</span>
            </span>
          </Show>
          <Show when={!connecting() && !wallet()}>
            连接钱包
          </Show>
        </button>
      </div>
    </header>
  )
}

// For needs to be imported
import { For } from 'solid-js'
