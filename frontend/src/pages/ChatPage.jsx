import { createSignal, createEffect, Show, For, onMount } from 'solid-js'
import { ethers } from 'ethers'
import {
  activeContract, setActiveContract, wallet, selectedModel, selectedNetwork,
  sessions, activeSessionId, setActiveSessionId,
  newSession, appendMessage, getActiveSession, toast, API_BASE
} from '../stores/app'
import { api } from '../lib/api'

export default function ChatPage() {
  const [contractInput, setContractInput] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [chatLoading, setChatLoading] = createSignal(false)
  const [inputText, setInputText] = createSignal('')
  let messagesEl, textareaEl

  const session = () => getActiveSession()
  const messages = () => session()?.messages || []

  createEffect(() => {
    if (messagesEl && messages().length) {
      setTimeout(() => messagesEl.scrollTop = messagesEl.scrollHeight, 50)
    }
  })

  async function handleLoad() {
    const addr = contractInput().trim()
    if (!addr || !ethers.utils.isAddress(addr)) {
      toast('请输入有效的合约地址', 'error'); return
    }
    setLoading(true)
    try {
      const { abi, skill: skillId } = await api.abi(addr)
      const finalABI = abi || MINIMAL_ERC20_ABI
      const rpc = NETWORKS_RPC[selectedNetwork()] || 'https://cloudflare-eth.com'
      const provider = wallet()?.provider || new ethers.providers.JsonRpcProvider(rpc)
      const runner = wallet()?.signer || provider
      const contract = new ethers.Contract(addr, finalABI, runner)

      let name = 'Unknown', symbol = ''
      try { name = await contract.name() } catch {}
      try { symbol = await contract.symbol() } catch {}

      const iface = new ethers.utils.Interface(finalABI)
      const functions = Object.values(iface.functions)

      const skill = skillId ? await api.skill(skillId) : null

      setActiveContract({ address: addr, abi: finalABI, name, symbol, skill, functions, contract })

      const sid = newSession(addr, name + (symbol ? ` (${symbol})` : ''))

      appendMessage(sid, {
        role: 'assistant',
        content: `合约 **${name}${symbol ? ` (${symbol})` : ''}** 已加载成功。\n\nSkill: ${skill?.name || 'Generic'} ${skill?.ui?.icon || '📄'} · ${functions.length} 个函数\n\n你可以用自然语言告诉我你想做什么。`,
        type: 'text'
      })
      toast(`${name} 加载成功`, 'success')
    } catch (e) {
      toast('加载失败: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    const text = inputText().trim()
    if (!text || chatLoading()) return
    if (!activeContract()) { toast('请先加载合约', 'error'); return }

    const sid = activeSessionId()
    if (!sid) return

    setInputText('')
    textareaEl && (textareaEl.style.height = 'auto')
    appendMessage(sid, { role: 'user', content: text, type: 'text' })
    setChatLoading(true)

    try {
      const s = getActiveSession()
      const history = (s?.messages || [])
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }))

      const contract = activeContract()
      const iface = new ethers.utils.Interface(contract.abi)
      const fnList = Object.values(iface.functions)
        .map(f => `${f.name}(${f.inputs.map(i => i.type + ' ' + i.name).join(', ')}) ${f.stateMutability}`)
        .join('\n')

      const system = `合约名称：${contract.name}\n合约地址：${contract.address}\n\n函数列表：\n${fnList}\n\n${contract.skill?.systemPrompt || DEFAULT_SYSTEM_PROMPT}`

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, system, model: selectedModel(), skillId: contract.skill?.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '请求失败')

      const reply = data.text
      const parsed = tryParseAction(reply)

      if (parsed?.action === 'call') {
        appendMessage(sid, { role: 'assistant', content: reply.replace(JSON.stringify(parsed), '').trim(), type: 'text', provider: data.provider })
        await executeRead(sid, parsed)
      } else if (parsed?.action === 'write') {
        appendMessage(sid, {
          role: 'assistant',
          content: reply.replace(JSON.stringify(parsed), '').trim(),
          type: 'write_prompt',
          writeData: parsed,
          provider: data.provider
        })
      } else if (parsed?.action === 'audit') {
        appendMessage(sid, {
          role: 'assistant',
          content: reply.replace(JSON.stringify(parsed), '').trim(),
          type: 'audit',
          auditItems: parsed.items,
          provider: data.provider
        })
      } else {
        appendMessage(sid, { role: 'assistant', content: reply, type: 'text', provider: data.provider })
      }

    } catch (e) {
      appendMessage(sid, { role: 'assistant', content: `错误：${e.message}`, type: 'error' })
    } finally {
      setChatLoading(false)
    }
  }

  async function executeRead(sid, parsed) {
    const contract = activeContract()?.contract
    if (!contract) return
    try {
      const result = await contract[parsed.fn](...(parsed.args || []))
      let display = result?.toString?.() ?? JSON.stringify(result)
      try { if (BigInt(display) > BigInt(1e15)) display = ethers.utils.formatEther(result) + ' (×10¹⁸)' } catch {}
      appendMessage(sid, { role: 'system', type: 'result', fn: parsed.fn, value: display, raw: result?.toString() })
    } catch (e) {
      appendMessage(sid, { role: 'system', type: 'result_error', fn: parsed.fn, error: e.message })
    }
  }

  async function executeWrite(writeData) {
    if (!wallet()?.signer) { toast('请先连接钱包', 'error'); return }
    const contract = new ethers.Contract(activeContract().address, activeContract().abi, wallet().signer)
    try {
      const tx = await contract[writeData.fn](...(writeData.args || []))
      toast('交易已发送，等待确认…', 'info')
      const receipt = await tx.wait()
      const sid = activeSessionId()
      appendMessage(sid, {
        role: 'system', type: 'tx_success',
        hash: receipt.transactionHash,
        block: receipt.blockNumber
      })
      toast('交易成功', 'success')
    } catch (e) {
      toast('交易失败: ' + e.message, 'error')
    }
  }

  return (
    <div class="flex h-full">
      {/* Chat area */}
      <div class="flex flex-col flex-1 min-w-0">
        {/* Contract loader bar */}
        <div class="px-5 py-3 border-b border-white/[0.07] bg-zinc-900/50 flex gap-2 items-center shrink-0">
          <input
            value={contractInput()}
            onInput={e => setContractInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLoad()}
            placeholder="输入合约地址 0x… 然后按 Enter"
            class="flex-1 h-9 px-3 bg-zinc-800 border border-white/[0.08] rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-purple-500/50 transition-colors"
          />
          <button
            onClick={handleLoad}
            disabled={loading()}
            class="h-9 px-4 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 disabled:opacity-40 transition-colors shrink-0"
          >
            {loading() ? '加载中…' : '加载合约'}
          </button>
        </div>

        {/* Messages */}
        <div ref={el => messagesEl = el} class="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
          <Show when={!session()} fallback={null}>
            <EmptyState />
          </Show>

          <For each={messages()}>
            {msg => <MessageBubble msg={msg} onExecuteWrite={executeWrite} />}
          </For>

          <Show when={chatLoading()}>
            <div class="flex gap-3 items-start msg-enter">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-emerald-400 flex items-center justify-center text-black text-xs font-bold shrink-0">AI</div>
              <div class="bg-zinc-900 border border-white/[0.07] rounded-2xl px-4 py-3">
                <div class="flex gap-1 items-center h-4">
                  <span class="w-1.5 h-1.5 rounded-full bg-zinc-500 dot-1"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-zinc-500 dot-2"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-zinc-500 dot-3"></span>
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* Quick chips from skill */}
        <Show when={activeContract()?.skill?.ui?.quickActions?.length}>
          <div class="px-5 pb-2 flex flex-wrap gap-1.5">
            <For each={activeContract().skill.ui.quickActions}>
              {a => (
                <button
                  onClick={() => { setInputText(a.prompt); textareaEl?.focus() }}
                  class="px-3 py-1 rounded-full border border-white/10 text-zinc-400 text-xs hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
                >
                  {a.label}
                </button>
              )}
            </For>
          </div>
        </Show>

        {/* Input */}
        <div class="px-5 pb-5 pt-2 border-t border-white/[0.07] shrink-0">
          <div class="flex gap-2 items-end">
            <textarea
              ref={el => textareaEl = el}
              value={inputText()}
              onInput={e => {
                setInputText(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="用自然语言描述你想做的事…"
              rows="1"
              class="flex-1 bg-zinc-900 border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-purple-500/40 resize-none transition-colors min-h-[44px] max-h-[120px]"
            />
            <button
              onClick={handleSend}
              disabled={!inputText().trim() || chatLoading()}
              class="w-11 h-11 rounded-xl bg-emerald-500 text-black flex items-center justify-center text-lg font-bold hover:bg-emerald-400 disabled:opacity-30 transition-all shrink-0"
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* Right panel: contract info */}
      <Show when={activeContract()}>
        <ContractPanel />
      </Show>
    </div>
  )
}

function EmptyState() {
  return (
    <div class="flex-1 flex flex-col items-center justify-center text-center py-20">
      <div class="text-5xl opacity-20 mb-4">⬡</div>
      <div class="text-base font-semibold text-zinc-500 mb-2">ContractChat</div>
      <div class="text-sm text-zinc-600 max-w-xs leading-relaxed">
        输入合约地址加载，或前往「合约发现」选择官方审核的合约
      </div>
    </div>
  )
}

function MessageBubble({ msg, onExecuteWrite }) {
  if (msg.role === 'user') {
    return (
      <div class="flex gap-3 justify-end msg-enter">
        <div class="max-w-[72%] bg-zinc-800 border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
        <div class="w-8 h-8 rounded-xl bg-zinc-700 border border-white/[0.08] flex items-center justify-center text-xs text-zinc-400 font-bold shrink-0">我</div>
      </div>
    )
  }

  if (msg.role === 'system' && msg.type === 'result') {
    return (
      <div class="msg-enter">
        <div class="inline-block bg-zinc-900 border border-emerald-500/20 rounded-xl px-4 py-3 font-mono text-sm">
          <div class="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">✓ {msg.fn}</div>
          <div class="text-emerald-400 text-sm font-medium break-all">{msg.value}</div>
          <Show when={msg.raw && msg.raw !== msg.value}>
            <div class="text-zinc-600 text-[10px] mt-1">raw: {msg.raw}</div>
          </Show>
        </div>
      </div>
    )
  }

  if (msg.role === 'system' && msg.type === 'result_error') {
    return (
      <div class="msg-enter">
        <div class="inline-block bg-red-950/40 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          ✗ {msg.fn}: {msg.error}
        </div>
      </div>
    )
  }

  if (msg.role === 'system' && msg.type === 'tx_success') {
    return (
      <div class="msg-enter">
        <div class="inline-block bg-emerald-950/40 border border-emerald-500/20 rounded-xl px-4 py-3 font-mono text-xs">
          <div class="text-emerald-400 font-semibold mb-1">✅ 交易成功</div>
          <div class="text-zinc-500">Hash: <span class="text-zinc-300">{msg.hash?.slice(0, 20)}…</span></div>
          <div class="text-zinc-500">区块: <span class="text-zinc-300">{msg.block}</span></div>
        </div>
      </div>
    )
  }

  // AI message
  return (
    <div class="flex gap-3 items-start msg-enter">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-emerald-400 flex items-center justify-center text-black text-xs font-bold shrink-0">AI</div>
      <div class="max-w-[74%] flex flex-col gap-2">
        <Show when={msg.content}>
          <div class="bg-zinc-900 border border-white/[0.07] rounded-2xl px-4 py-3 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {msg.content}
            <Show when={msg.provider}>
              <span class={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-mono ${msg.provider === 'deepseek' ? 'bg-blue-900/40 text-blue-400' : 'bg-purple-900/40 text-purple-400'}`}>
                {msg.provider}
              </span>
            </Show>
          </div>
        </Show>

        <Show when={msg.type === 'write_prompt' && msg.writeData}>
          <WritePromptCard data={msg.writeData} onExecute={onExecuteWrite} />
        </Show>

        <Show when={msg.type === 'audit' && msg.auditItems}>
          <AuditCard items={msg.auditItems} />
        </Show>
      </div>
    </div>
  )
}

function WritePromptCard({ data, onExecute }) {
  const [sent, setSent] = createSignal(false)
  return (
    <div class="bg-zinc-900 border border-amber-500/20 rounded-xl overflow-hidden text-sm">
      <div class="px-4 py-2 bg-amber-500/5 border-b border-amber-500/15 flex justify-between items-center text-xs font-mono">
        <span class="text-amber-400">✏ 写操作 · 需要签名</span>
        <span class="text-zinc-600">消耗 Gas</span>
      </div>
      <div class="px-4 py-3 font-mono text-xs text-zinc-500 leading-loose">
        <span class="text-zinc-300">函数:</span> {data.fn}<br/>
        <span class="text-zinc-300">参数:</span> {JSON.stringify(data.args || [])}
        <Show when={data.warning}>
          <br/><span class="text-amber-400">⚠ {data.warning}</span>
        </Show>
      </div>
      <div class="px-4 py-2.5 border-t border-white/[0.05] flex gap-2">
        <Show when={!sent()}>
          <button
            onClick={() => { setSent(true); onExecute(data) }}
            class="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors"
          >
            🔐 签名并发送
          </button>
        </Show>
        <Show when={sent()}>
          <span class="text-xs text-zinc-500">已发送…</span>
        </Show>
      </div>
    </div>
  )
}

function AuditCard({ items }) {
  return (
    <div class="bg-zinc-900 border border-white/[0.07] rounded-xl overflow-hidden text-sm">
      <div class="px-4 py-2 border-b border-white/[0.05] text-[10px] text-zinc-500 uppercase tracking-wider">安全审计报告</div>
      <div class="divide-y divide-white/[0.04]">
        <For each={items}>
          {item => (
            <div class="px-4 py-2.5 flex items-center gap-3 text-xs">
              <span>{item.ok ? '✅' : '⚠️'}</span>
              <span class={item.ok ? 'text-zinc-300' : 'text-amber-400'}>{item.text}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

function ContractPanel() {
  const c = () => activeContract()
  return (
    <div class="w-64 border-l border-white/[0.07] bg-zinc-900 overflow-y-auto shrink-0 p-4 flex flex-col gap-4">
      {/* Contract header */}
      <div>
        <div class="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">当前合约</div>
        <div class="text-sm font-bold text-zinc-100">{c()?.name}{c()?.symbol ? ` (${c()?.symbol})` : ''}</div>
        <div class="text-[10px] font-mono text-zinc-500 break-all mt-0.5">{c()?.address}</div>
      </div>

      {/* Skill badge */}
      <Show when={c()?.skill}>
        <div class="bg-zinc-800 rounded-lg p-3 border border-white/[0.06]">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm">{c()?.skill?.ui?.icon || '📄'}</span>
            <span class="text-xs font-semibold text-zinc-200">{c()?.skill?.name}</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-mono">{c()?.skill?.tier}</span>
          </div>
          <div class="text-[11px] text-zinc-500">{c()?.skill?.description}</div>
        </div>
      </Show>

      {/* Functions list */}
      <div>
        <div class="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">函数 ({c()?.functions?.length})</div>
        <div class="flex flex-col gap-0.5">
          <For each={c()?.functions}>
            {fn => {
              const isWrite = fn.stateMutability === 'payable' || fn.stateMutability === 'nonpayable'
              return (
                <div class="px-2 py-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer group transition-colors">
                  <div class="flex items-center gap-1.5">
                    <span class={`w-1.5 h-1.5 rounded-full shrink-0 ${isWrite ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                    <span class="text-xs font-mono text-zinc-300 truncate group-hover:text-zinc-100">{fn.name}</span>
                  </div>
                  <div class="text-[10px] text-zinc-600 ml-3">{isWrite ? '写操作' : '只读'} · {fn.inputs.length}参数</div>
                </div>
              )
            }}
          </For>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────
function tryParseAction(text) {
  const lines = text.trim().split('\n')
  try { return JSON.parse(lines[lines.length - 1]) } catch {}
  const m = text.match(/\{[\s\S]*\}/)
  if (m) try { return JSON.parse(m[0]) } catch {}
  return null
}

const NETWORKS_RPC = {
  mainnet:  'https://cloudflare-eth.com',
  polygon:  'https://polygon-rpc.com',
  bsc:      'https://bsc-dataseed.binance.org',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
  base:     'https://mainnet.base.org',
}

const MINIMAL_ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]

const DEFAULT_SYSTEM_PROMPT = `你是一个智能合约交互助手。理解用户意图并帮助调用合约函数。
回复简洁，如需触发操作，JSON 放在回复最后一行：
- 只读: {"action":"call","fn":"函数名","args":["参数"]}
- 写操作: {"action":"write","fn":"函数名","args":["参数"],"warning":"提示"}
- 审计: {"action":"audit","items":[{"ok":true,"text":"说明"}]}`
