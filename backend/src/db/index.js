import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '../../data')

let db

export async function initDB() {
  mkdirSync(DATA_DIR, { recursive: true })
  db = await open({
    filename: join(DATA_DIR, 'contractchat.db'),
    driver: sqlite3.Database
  })
  await db.run('PRAGMA journal_mode = WAL')

  await db.exec(`
    -- Skills: contract structured display configs
    CREATE TABLE IF NOT EXISTS skills (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      version     TEXT DEFAULT '1.0.0',
      description TEXT,
      tier        TEXT DEFAULT 'free',
      match_abi   TEXT DEFAULT '[]',
      system_prompt TEXT,
      ui_config   TEXT DEFAULT '{}',
      schema_config TEXT DEFAULT '{}',
      active      INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    -- Curated contract discovery list
    CREATE TABLE IF NOT EXISTS contracts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      address     TEXT NOT NULL,
      chain       TEXT DEFAULT 'mainnet',
      category    TEXT DEFAULT 'Other',
      description TEXT,
      icon        TEXT DEFAULT '📄',
      skill_id    TEXT,
      audited     INTEGER DEFAULT 0,
      tvl         TEXT,
      active      INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- Global config (key-value)
    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `)

  // Seed default skills if empty
  const count = await db.get('SELECT COUNT(*) as n FROM skills')
  if (count.n === 0) await seedDefaultSkills()

  // Seed default contracts if empty
  const ccount = await db.get('SELECT COUNT(*) as n FROM contracts')
  if (ccount.n === 0) await seedDefaultContracts()

  console.log('[DB] SQLite ready:', join(DATA_DIR, 'contractchat.db'))
  return db
}

export function getDB() { return db }

// ── Skills ───────────────────────────────────────────
export const skillsDB = {
  all: async () => {
    const rows = await db.all('SELECT * FROM skills WHERE active=1 ORDER BY name')
    return rows.map(parseSkill)
  },
  get: async id => {
    const r = await db.get('SELECT * FROM skills WHERE id=?', id)
    return r ? parseSkill(r) : null
  },
  create: async data => {
    await db.run(
      `INSERT INTO skills (id,name,version,description,tier,match_abi,system_prompt,ui_config,schema_config) VALUES (?,?,?,?,?,?,?,?,?)`,
      data.id, data.name, data.version||'1.0.0', data.description, data.tier||'free',
      JSON.stringify(data.matchABI||[]), data.systemPrompt||'', JSON.stringify(data.ui||{}), JSON.stringify(data.schema||{})
    )
    return skillsDB.get(data.id)
  },
  update: async (id, data) => {
    await db.run(
      `UPDATE skills SET name=?,version=?,description=?,tier=?,match_abi=?,system_prompt=?,ui_config=?,schema_config=?,updated_at=datetime('now') WHERE id=?`,
      data.name, data.version, data.description, data.tier,
      JSON.stringify(data.matchABI||[]), data.systemPrompt||'',
      JSON.stringify(data.ui||{}), JSON.stringify(data.schema||{}), id
    )
    return skillsDB.get(id)
  },
  delete: async id => await db.run('UPDATE skills SET active=0 WHERE id=?', id),
  match: async (fnNames) => {
    const skills = await skillsDB.all()
    let best = null, bestScore = 0
    for (const s of skills) {
      const matches = s.matchABI.filter(m => fnNames.includes(m)).length
      const score = s.matchABI.length ? matches / s.matchABI.length : 0
      if (score > bestScore) { bestScore = score; best = s }
    }
    return bestScore >= 0.4 ? best : null
  }
}

function parseSkill(row) {
  return {
    id: row.id, name: row.name, version: row.version,
    description: row.description, tier: row.tier,
    matchABI: tryParse(row.match_abi, []),
    systemPrompt: row.system_prompt,
    ui: tryParse(row.ui_config, {}),
    schema: tryParse(row.schema_config, {}),
    createdAt: row.created_at, updatedAt: row.updated_at
  }
}

// ── Contracts ─────────────────────────────────────────
export const contractsDB = {
  all: async (chain) => {
    const q = chain && chain !== 'all'
      ? await db.all('SELECT * FROM contracts WHERE active=1 AND chain=? ORDER BY name', chain)
      : await db.all('SELECT * FROM contracts WHERE active=1 ORDER BY name')
    return q
  },
  get: async id => await db.get('SELECT * FROM contracts WHERE id=?', id),
  create: async data => {
    const result = await db.run(
      'INSERT INTO contracts (name,address,chain,category,description,icon,skill_id,audited,tvl) VALUES (?,?,?,?,?,?,?,?,?)',
      data.name, data.address, data.chain||'mainnet', data.category||'Other',
      data.description, data.icon||'📄', data.skillId||null, data.audited?1:0, data.tvl||null
    )
    return contractsDB.get(result.lastID)
  },
  update: async (id, data) => {
    await db.run(
      'UPDATE contracts SET name=?,address=?,chain=?,category=?,description=?,icon=?,skill_id=?,audited=?,tvl=? WHERE id=?',
      data.name, data.address, data.chain||'mainnet', data.category||'Other',
      data.description, data.icon||'📄', data.skillId||null, data.audited?1:0, data.tvl||null, id
    )
    return contractsDB.get(id)
  },
  delete: async id => await db.run('UPDATE contracts SET active=0 WHERE id=?', id)
}

// ── Config ────────────────────────────────────────────
export const configDB = {
  get: async key => {
    const r = await db.get('SELECT value FROM config WHERE key=?', key)
    return r ? tryParse(r.value, r.value) : null
  },
  set: async (key, value) => await db.run('INSERT OR REPLACE INTO config (key,value) VALUES (?,?)', key, JSON.stringify(value)),
  all: async () => {
    const rows = await db.all('SELECT key,value FROM config')
    return Object.fromEntries(rows.map(r => [r.key, tryParse(r.value, r.value)]))
  }
}

function tryParse(str, fallback) { try { return JSON.parse(str) } catch { return fallback } }

// ── Seeds ─────────────────────────────────────────────
async function seedDefaultSkills() {
  const skills = [
    {
      id: 'erc20',
      name: 'ERC-20 Token',
      version: '1.0.0',
      description: '标准同质化代币，支持转账、授权和余额查询',
      tier: 'free',
      matchABI: ['balanceOf', 'transfer', 'totalSupply', 'approve', 'allowance'],
      systemPrompt: '你是一个 ERC-20 代币合约助手。回复简洁，如需操作请在最后一行输出 JSON。',
      ui: { icon: '🪙', theme: 'emerald', quickActions: [
        { label: '查余额', prompt: '查询某地址的代币余额' },
        { label: '总供应量', prompt: '查询代币总供应量' },
        { label: '转账', prompt: '我想转账代币' },
        { label: '安全审计', prompt: '帮我审计这个合约' }
      ]},
      schema: { fields: [
        { fn: 'name',        args: [], label: '代币名称', type: 'string',  display: 'badge' },
        { fn: 'symbol',      args: [], label: '代币符号', type: 'string',  display: 'badge' },
        { fn: 'totalSupply', args: [], label: '总供应量', type: 'uint256', format: 'ether', display: 'stat' },
        { fn: 'decimals',    args: [], label: '精度',     type: 'uint8',   display: 'stat' }
      ]}
    },
    {
      id: 'erc721',
      name: 'ERC-721 NFT',
      version: '1.0.0',
      description: 'NFT 合约，支持查询持有者、元数据和转账',
      tier: 'free',
      matchABI: ['ownerOf', 'tokenURI', 'balanceOf', 'transferFrom', 'mint'],
      systemPrompt: '你是一个 ERC-721 NFT 合约助手。回复简洁，JSON 在最后一行。',
      ui: { icon: '🖼', theme: 'purple', quickActions: [
        { label: '查持有者', prompt: '查询 Token #1 的持有者' },
        { label: '总量', prompt: '查询 NFT 总供应量' },
        { label: '我的 NFT', prompt: '查询我持有的 NFT 数量' }
      ]},
      schema: { fields: [
        { fn: 'name',        args: [], label: '合约名称', type: 'string', display: 'badge' },
        { fn: 'symbol',      args: [], label: '符号',     type: 'string', display: 'badge' },
        { fn: 'totalSupply', args: [], label: '总量',     type: 'uint256', display: 'stat' }
      ]}
    },
    {
      id: 'uniswap-v2-pair',
      name: 'Uniswap V2 Pair',
      version: '1.0.0',
      description: 'AMM 流动性池，支持查询储备量和价格计算',
      tier: 'free',
      matchABI: ['getReserves', 'token0', 'token1', 'swap', 'mint', 'burn'],
      systemPrompt: '你是一个 Uniswap V2 流动性池助手，帮助用户理解 AMM 机制。回复简洁，JSON 在最后一行。',
      ui: { icon: '🌊', theme: 'blue', quickActions: [
        { label: '查储备量', prompt: '查询当前池子储备量' },
        { label: 'Token 对', prompt: '这个池子是哪两个代币？' },
        { label: '计算价格', prompt: '计算当前兑换价格' }
      ]},
      schema: { fields: [
        { fn: 'token0', args: [], label: 'Token 0', type: 'address', display: 'address' },
        { fn: 'token1', args: [], label: 'Token 1', type: 'address', display: 'address' }
      ]}
    }
  ]
  for (const s of skills) await skillsDB.create(s)
  console.log('[DB] Seeded default skills')
}

async function seedDefaultContracts() {
  const contracts = [
    { name: 'Uniswap Token (UNI)', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', chain: 'mainnet', category: 'Token', description: 'Uniswap 协议治理代币，持有者可参与协议治理投票', icon: '🦄', skillId: 'erc20', audited: true, tvl: null },
    { name: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chain: 'mainnet', category: 'Token', description: 'Circle 发行的美元稳定币，1:1 锚定美元', icon: '💵', skillId: 'erc20', audited: true, tvl: null },
    { name: 'Wrapped Ether (WETH)', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', chain: 'mainnet', category: 'Token', description: 'ERC-20 封装版以太坊，用于 DeFi 协议交互', icon: '🔷', skillId: 'erc20', audited: true, tvl: null },
    { name: 'Uniswap V2: ETH/USDC', address: '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc', chain: 'mainnet', category: 'DeFi', description: 'Uniswap V2 的 ETH/USDC 流动性池，全网交易量最大的交易对之一', icon: '🌊', skillId: 'uniswap-v2-pair', audited: true, tvl: '$180M+' },
    { name: 'ENS: ETH Registrar', address: '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85', chain: 'mainnet', category: 'NFT', description: '以太坊域名服务 NFT 合约，每个 .eth 域名都是一个 NFT', icon: '🔑', skillId: 'erc721', audited: true, tvl: null },
  ]
  for (const c of contracts) await contractsDB.create(c)
  console.log('[DB] Seeded default contracts')
}
