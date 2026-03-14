import { createSignal, createEffect } from 'solid-js'
import { ethers } from 'ethers'

// ── Config ──────────────────────────────────────────
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ── Navigation ──────────────────────────────────────
export const [page, setPage] = createSignal('chat') // chat | discover | history | settings

// ── Wallet ──────────────────────────────────────────
export const [wallet, setWallet] = createSignal(null)
// { address, provider, signer, chainId, chainName }

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('请安装 MetaMask 浏览器扩展')
  }
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  if (!accounts?.length) throw new Error('用户取消了连接')

  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const signer   = provider.getSigner()
  const network  = await provider.getNetwork()

  setWallet({
    address:   accounts[0],
    provider,
    signer,
    chainId:   network.chainId,
    chainName: CHAIN_NAMES[network.chainId] || `Chain ${network.chainId}`
  })

  window.ethereum.on('accountsChanged', accs => {
    if (!accs.length) { setWallet(null); return }
    setWallet(w => ({ ...w, address: accs[0] }))
  })
  window.ethereum.on('chainChanged', () => window.location.reload())
}

export function disconnectWallet() { setWallet(null) }

const CHAIN_NAMES = {
  1:     'Ethereum',
  137:   'Polygon',
  56:    'BSC',
  42161: 'Arbitrum',
  10:    'Optimism',
  8453:  'Base',
}

// ── Network selector (read-only RPC, no wallet required) ──
export const NETWORKS = [
  { id: 'mainnet',  label: 'Ethereum',  chainId: 1,     rpc: 'https://cloudflare-eth.com' },
  { id: 'polygon',  label: 'Polygon',   chainId: 137,   rpc: 'https://polygon-rpc.com' },
  { id: 'bsc',      label: 'BSC',       chainId: 56,    rpc: 'https://bsc-dataseed.binance.org' },
  { id: 'arbitrum', label: 'Arbitrum',  chainId: 42161, rpc: 'https://arb1.arbitrum.io/rpc' },
  { id: 'optimism', label: 'Optimism',  chainId: 10,    rpc: 'https://mainnet.optimism.io' },
  { id: 'base',     label: 'Base',      chainId: 8453,  rpc: 'https://mainnet.base.org' },
]
export const [selectedNetwork, setSelectedNetwork] = createSignal('mainnet')

// ── AI Model ────────────────────────────────────────
export const [models, setModels] = createSignal([])
export const [selectedModel, setSelectedModel] = createSignal('')

export async function loadModels() {
  try {
    const r = await fetch(`${API_BASE}/api/models`)
    const data = await r.json()
    setModels(data)
    if (data.length && !selectedModel()) setSelectedModel(data[0].id)
  } catch (e) {
    console.warn('loadModels failed:', e.message)
  }
}

// ── Active Contract ──────────────────────────────────
export const [activeContract, setActiveContract] = createSignal(null)
// { address, abi, name, symbol, skill, functions }

// ── Chat sessions ────────────────────────────────────
export const [sessions, setSessions] = createSignal(
  JSON.parse(localStorage.getItem('cc_sessions') || '[]')
)
export const [activeSessionId, setActiveSessionId] = createSignal(null)

export function getActiveSession() {
  return sessions().find(s => s.id === activeSessionId()) || null
}

export function newSession(contractAddress, contractName) {
  const id = Date.now().toString()
  const session = {
    id,
    contractAddress,
    contractName: contractName || contractAddress.slice(0,8)+'…',
    createdAt: new Date().toISOString(),
    messages: []
  }
  setSessions(s => {
    const updated = [session, ...s].slice(0, 50)
    localStorage.setItem('cc_sessions', JSON.stringify(updated))
    return updated
  })
  setActiveSessionId(id)
  return id
}

export function appendMessage(sessionId, message) {
  setSessions(sessions => {
    const updated = sessions.map(s =>
      s.id === sessionId
        ? { ...s, messages: [...s.messages, message] }
        : s
    )
    localStorage.setItem('cc_sessions', JSON.stringify(updated))
    return updated
  })
}

export function deleteSession(id) {
  setSessions(s => {
    const updated = s.filter(x => x.id !== id)
    localStorage.setItem('cc_sessions', JSON.stringify(updated))
    return updated
  })
  if (activeSessionId() === id) setActiveSessionId(null)
}

// ── Toast notifications ──────────────────────────────
export const [toasts, setToasts] = createSignal([])
export function toast(msg, type = 'info') {
  const id = Date.now()
  setToasts(t => [...t, { id, msg, type }])
  setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
}
