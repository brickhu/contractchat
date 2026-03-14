import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { skillsDB, contractsDB, configDB } from '../db/index.js'

const router = Router()

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-this-secret-in-production'
const ADMIN_PASS = process.env.ADMIN_PASSWORD   || 'admin123'

// ── Auth middleware ──────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    jwt.verify(header.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// ── Login ────────────────────────────────────────────
router.post('/api/login', (req, res) => {
  const { password } = req.body
  if (password !== ADMIN_PASS) return res.status(401).json({ error: '密码错误' })
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token })
})

// ── Skills CRUD ──────────────────────────────────────
router.get('/api/skills',        auth, async (_, res) => {
  try {
    const skills = await skillsDB.all()
    res.json(skills)
  } catch (error) {
    console.error('[Admin Skills] Error fetching all:', error)
    res.status(500).json({ error: 'Failed to fetch skills' })
  }
})
router.get('/api/skills/:id',    auth, async (req, res) => {
  try {
    const s = await skillsDB.get(req.params.id)
    s ? res.json(s) : res.status(404).json({ error: 'Not found' })
  } catch (error) {
    console.error('[Admin Skills] Error fetching:', error)
    res.status(500).json({ error: 'Failed to fetch skill' })
  }
})
router.post('/api/skills',       auth, async (req, res) => {
  try {
    const result = await skillsDB.create(req.body)
    res.json(result)
  } catch (e) { res.status(400).json({ error: e.message }) }
})
router.put('/api/skills/:id',    auth, async (req, res) => {
  try {
    const result = await skillsDB.update(req.params.id, req.body)
    res.json(result)
  } catch (e) { res.status(400).json({ error: e.message }) }
})
router.delete('/api/skills/:id', auth, async (req, res) => {
  try {
    await skillsDB.delete(req.params.id)
    res.json({ ok: true })
  } catch (error) {
    console.error('[Admin Skills] Error deleting:', error)
    res.status(500).json({ error: 'Failed to delete skill' })
  }
})

// ── Contracts CRUD ───────────────────────────────────
router.get('/api/contracts',          auth, async (_, res) => {
  try {
    const contracts = await contractsDB.all()
    res.json(contracts)
  } catch (error) {
    console.error('[Admin Contracts] Error fetching all:', error)
    res.status(500).json({ error: 'Failed to fetch contracts' })
  }
})
router.get('/api/contracts/:id',      auth, async (req, res) => {
  try {
    const c = await contractsDB.get(req.params.id)
    c ? res.json(c) : res.status(404).json({ error: 'Not found' })
  } catch (error) {
    console.error('[Admin Contracts] Error fetching:', error)
    res.status(500).json({ error: 'Failed to fetch contract' })
  }
})
router.post('/api/contracts',         auth, async (req, res) => {
  try {
    const result = await contractsDB.create(req.body)
    res.json(result)
  } catch (e) { res.status(400).json({ error: e.message }) }
})
router.put('/api/contracts/:id',      auth, async (req, res) => {
  try {
    const result = await contractsDB.update(req.params.id, req.body)
    res.json(result)
  } catch (e) { res.status(400).json({ error: e.message }) }
})
router.delete('/api/contracts/:id',   auth, async (req, res) => {
  try {
    await contractsDB.delete(req.params.id)
    res.json({ ok: true })
  } catch (error) {
    console.error('[Admin Contracts] Error deleting:', error)
    res.status(500).json({ error: 'Failed to delete contract' })
  }
})

// ── Config ────────────────────────────────────────────
router.get('/api/config',      auth, async (_, res) => {
  try {
    const all = await configDB.all()
    // Never expose sensitive keys
    delete all.anthropicKey; delete all.deepseekKey; delete all.etherscanKey
    res.json(all)
  } catch (error) {
    console.error('[Admin Config] Error fetching:', error)
    res.status(500).json({ error: 'Failed to fetch config' })
  }
})
router.post('/api/config',     auth, async (req, res) => {
  try {
    for (const [k, v] of Object.entries(req.body)) await configDB.set(k, v)
    res.json({ ok: true })
  } catch (error) {
    console.error('[Admin Config] Error saving:', error)
    res.status(500).json({ error: 'Failed to save config' })
  }
})

// ── Serve admin SPA ──────────────────────────────────
// The admin frontend is a simple inline HTML served here
router.get('*', (_, res) => {
  res.send(ADMIN_HTML)
})

export default router

// ── Admin SPA (inline, no build needed) ─────────────
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>ContractChat Admin</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@600;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0d0f14;color:#e2e4ec;font-family:'Syne',sans-serif;min-height:100vh}
.mono{font-family:'IBM Plex Mono',monospace}
a{color:#4fffb0;text-decoration:none}
input,textarea,select{background:#1a1e28;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;color:#e2e4ec;font-size:13px;font-family:inherit;outline:none;width:100%;transition:border .15s}
input:focus,textarea:focus,select:focus{border-color:#7b61ff}
textarea{resize:vertical;min-height:80px}
select option{background:#1a1e28}
button{cursor:pointer;font-family:'Syne',sans-serif;font-weight:600;border:none;border-radius:8px;padding:8px 16px;font-size:13px;transition:all .15s}
.btn-primary{background:#4fffb0;color:#000}
.btn-primary:hover{opacity:.85}
.btn-ghost{background:transparent;border:1px solid rgba(255,255,255,0.12);color:#e2e4ec}
.btn-ghost:hover{background:rgba(255,255,255,0.05)}
.btn-danger{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#f87171}
.btn-danger:hover{background:rgba(239,68,68,.2)}
.btn-sm{padding:5px 12px;font-size:12px}
label{font-size:11px;color:#6b7280;display:block;margin-bottom:4px}
.card{background:#13161e;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.row{display:flex;gap:8px;align-items:center}
.badge{font-size:10px;padding:2px 8px;border-radius:20px;font-family:'IBM Plex Mono',monospace}
.b-green{background:rgba(79,255,176,.1);color:#4fffb0}
.b-purple{background:rgba(123,97,255,.12);color:#a78bfa}
.b-amber{background:rgba(245,158,11,.1);color:#f59e0b}
.tag{font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,.06);color:#9ca3af}
#app{display:flex;flex-direction:column;min-height:100vh}
#login-screen{flex:1;display:flex;align-items:center;justify-content:center}
#main-screen{display:none;flex:1;flex-direction:column}
.topbar{background:#13161e;border-bottom:1px solid rgba(255,255,255,.07);padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
.tabs{display:flex;gap:4px;padding:12px 24px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.tab{padding:8px 16px;border-radius:8px 8px 0 0;font-size:13px;cursor:pointer;color:#6b7280;border:1px solid transparent;border-bottom:none;transition:all .15s}
.tab.active{background:#13161e;color:#e2e4ec;border-color:rgba(255,255,255,.07)}
.content{flex:1;padding:24px;overflow-y:auto}
.section{display:none}.section.active{display:block}
.item-row{background:#1a1e28;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.item-info{flex:1;min-width:0}
.item-name{font-size:14px;font-weight:600;margin-bottom:3px}
.item-meta{font-size:11px;color:#6b7280}
.item-actions{display:flex;gap:6px;flex-shrink:0}
.modal-bg{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;align-items:center;justify-content:center}
.modal-bg.show{display:flex}
.modal{background:#13161e;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:24px;width:560px;max-height:90vh;overflow-y:auto}
.modal-title{font-size:16px;font-weight:700;margin-bottom:16px}
.form-row{margin-bottom:14px}
.flash{padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;display:none}
.flash.show{display:block}
.flash.ok{background:rgba(79,255,176,.1);color:#4fffb0;border:1px solid rgba(79,255,176,.2)}
.flash.err{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}
</style>
</head>
<body>
<div id="app">

<!-- Login -->
<div id="login-screen">
  <div class="card" style="width:320px">
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:28px">⬡</div>
      <div style="font-size:16px;font-weight:700;margin-top:6px">ContractChat Admin</div>
    </div>
    <div id="login-err" class="flash err"></div>
    <div class="form-row">
      <label>管理员密码</label>
      <input type="password" id="pw-input" placeholder="••••••••" onkeydown="if(event.key==='Enter')login()"/>
    </div>
    <button class="btn-primary" style="width:100%" onclick="login()">登录</button>
  </div>
</div>

<!-- Main -->
<div id="main-screen">
  <div class="topbar">
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:18px">⬡</span>
      <span style="font-weight:700">ContractChat Admin</span>
      <span class="tag mono">运营后台</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <span id="api-status" class="tag mono">检测中…</span>
      <button class="btn-ghost btn-sm" onclick="logout()">退出</button>
    </div>
  </div>

  <div class="tabs">
    <div class="tab active" onclick="switchTab('skills',this)">Skills 配置</div>
    <div class="tab" onclick="switchTab('contracts',this)">合约白名单</div>
    <div class="tab" onclick="switchTab('config',this)">系统配置</div>
  </div>

  <div class="content">
    <div id="flash-main" class="flash"></div>

    <!-- Skills -->
    <div class="section active" id="sec-skills">
      <div class="row" style="margin-bottom:16px">
        <h2 style="flex:1;font-size:15px;font-weight:700">Skills 列表</h2>
        <button class="btn-primary btn-sm" onclick="openSkillModal()">+ 新建 Skill</button>
      </div>
      <div id="skills-list"></div>
    </div>

    <!-- Contracts -->
    <div class="section" id="sec-contracts">
      <div class="row" style="margin-bottom:16px">
        <h2 style="flex:1;font-size:15px;font-weight:700">合约白名单</h2>
        <button class="btn-primary btn-sm" onclick="openContractModal()">+ 新增合约</button>
      </div>
      <div id="contracts-list"></div>
    </div>

    <!-- Config -->
    <div class="section" id="sec-config">
      <h2 style="font-size:15px;font-weight:700;margin-bottom:16px">系统配置</h2>
      <div class="card">
        <div class="grid2">
          <div class="form-row">
            <label>Anthropic API Key</label>
            <input type="password" id="cfg-anthropic" placeholder="sk-ant-…"/>
          </div>
          <div class="form-row">
            <label>DeepSeek API Key</label>
            <input type="password" id="cfg-deepseek" placeholder="sk-…"/>
          </div>
          <div class="form-row">
            <label>Etherscan API Key</label>
            <input type="text" id="cfg-etherscan" placeholder="可选"/>
          </div>
          <div class="form-row">
            <label>Admin 密码 (重置)</label>
            <input type="password" id="cfg-password" placeholder="留空则不修改"/>
          </div>
        </div>
        <button class="btn-primary" onclick="saveConfig()">保存配置</button>
        <p style="font-size:11px;color:#6b7280;margin-top:8px">注意：API Key 不会回显，填写即覆盖</p>
      </div>
    </div>
  </div>
</div>

<!-- Skill Modal -->
<div class="modal-bg" id="skill-modal">
  <div class="modal">
    <div class="modal-title" id="skill-modal-title">新建 Skill</div>
    <input type="hidden" id="sk-editing-id"/>
    <div class="grid2">
      <div class="form-row">
        <label>ID (唯一标识)</label>
        <input id="sk-id" placeholder="erc20, uniswap-v2-pair…" class="mono"/>
      </div>
      <div class="form-row">
        <label>名称</label>
        <input id="sk-name" placeholder="ERC-20 Token"/>
      </div>
      <div class="form-row">
        <label>Tier</label>
        <select id="sk-tier">
          <option value="free">free</option>
          <option value="pro">pro</option>
          <option value="elite">elite</option>
        </select>
      </div>
      <div class="form-row">
        <label>图标 (emoji)</label>
        <input id="sk-icon" placeholder="🪙" style="font-size:20px"/>
      </div>
    </div>
    <div class="form-row">
      <label>描述</label>
      <input id="sk-desc" placeholder="简短描述这个 Skill 的用途"/>
    </div>
    <div class="form-row">
      <label>matchABI (逗号分隔的函数名)</label>
      <input id="sk-match" placeholder="balanceOf,transfer,totalSupply,approve" class="mono"/>
    </div>
    <div class="form-row">
      <label>System Prompt (注入 AI 的角色指令)</label>
      <textarea id="sk-prompt" placeholder="你是一个 ERC-20 代币合约助手。回复简洁，JSON 在最后一行。"></textarea>
    </div>
    <div class="form-row">
      <label>快捷操作 (JSON 数组)</label>
      <textarea id="sk-actions" class="mono" placeholder='[{"label":"查余额","prompt":"查询某地址的代币余额"}]'></textarea>
    </div>
    <div class="form-row">
      <label>Schema Fields (JSON 数组，用于自动读取链上数据)</label>
      <textarea id="sk-schema" class="mono" placeholder='[{"fn":"totalSupply","args":[],"label":"总供应量","type":"uint256","format":"ether","display":"stat"}]'></textarea>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
      <button class="btn-ghost" onclick="closeModal('skill-modal')">取消</button>
      <button class="btn-primary" onclick="saveSkill()">保存</button>
    </div>
  </div>
</div>

<!-- Contract Modal -->
<div class="modal-bg" id="contract-modal">
  <div class="modal">
    <div class="modal-title" id="contract-modal-title">新增合约</div>
    <input type="hidden" id="ct-editing-id"/>
    <div class="grid2">
      <div class="form-row">
        <label>合约名称</label>
        <input id="ct-name" placeholder="Uniswap Token (UNI)"/>
      </div>
      <div class="form-row">
        <label>合约地址</label>
        <input id="ct-address" placeholder="0x…" class="mono"/>
      </div>
      <div class="form-row">
        <label>链</label>
        <select id="ct-chain">
          <option value="mainnet">Ethereum</option>
          <option value="polygon">Polygon</option>
          <option value="bsc">BSC</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="optimism">Optimism</option>
          <option value="base">Base</option>
        </select>
      </div>
      <div class="form-row">
        <label>分类</label>
        <select id="ct-category">
          <option value="Token">Token</option>
          <option value="DeFi">DeFi</option>
          <option value="NFT">NFT</option>
          <option value="Governance">Governance</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-row">
        <label>图标 (emoji)</label>
        <input id="ct-icon" placeholder="📄" style="font-size:20px"/>
      </div>
      <div class="form-row">
        <label>关联 Skill ID</label>
        <input id="ct-skill" placeholder="erc20" class="mono"/>
      </div>
      <div class="form-row">
        <label>TVL (可选，如 $180M+)</label>
        <input id="ct-tvl" placeholder="$180M+"/>
      </div>
      <div class="form-row" style="display:flex;align-items:center;gap:8px;padding-top:20px">
        <input type="checkbox" id="ct-audited" style="width:auto;accent-color:#4fffb0"/>
        <label for="ct-audited" style="margin:0;font-size:13px;color:#e2e4ec">已审计 ✓</label>
      </div>
    </div>
    <div class="form-row">
      <label>描述</label>
      <textarea id="ct-desc" placeholder="简短描述这个合约的功能和特点"></textarea>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
      <button class="btn-ghost" onclick="closeModal('contract-modal')">取消</button>
      <button class="btn-primary" onclick="saveContract()">保存</button>
    </div>
  </div>
</div>

<script>
let token = localStorage.getItem('cc_admin_token') || ''
const BASE = window.location.origin

async function api(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined
  })
  return r.json()
}

async function login() {
  const pw = document.getElementById('pw-input').value
  const data = await fetch(BASE + '/admin/api/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({password: pw})
  }).then(r => r.json())
  if (data.token) {
    token = data.token
    localStorage.setItem('cc_admin_token', token)
    showMain()
  } else {
    const el = document.getElementById('login-err')
    el.textContent = data.error || '登录失败'
    el.classList.add('show')
  }
}

function logout() {
  localStorage.removeItem('cc_admin_token')
  token = ''
  document.getElementById('login-screen').style.display = 'flex'
  document.getElementById('main-screen').style.display = 'none'
}

async function showMain() {
  document.getElementById('login-screen').style.display = 'none'
  document.getElementById('main-screen').style.display = 'flex'
  checkAPIStatus()
  loadSkills()
  loadContracts()
}

async function checkAPIStatus() {
  try {
    const r = await fetch(BASE + '/health')
    const d = await r.json()
    const el = document.getElementById('api-status')
    el.textContent = d.ok ? '● 后端正常' : '● 异常'
    el.style.color = d.ok ? '#4fffb0' : '#f87171'
  } catch { document.getElementById('api-status').textContent = '● 离线' }
}

function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  el.classList.add('active')
  document.getElementById('sec-' + name).classList.add('active')
}

// ── Skills ──
async function loadSkills() {
  const skills = await api('GET', '/admin/api/skills')
  const el = document.getElementById('skills-list')
  if (!skills.length) { el.innerHTML = '<p style="color:#6b7280;font-size:13px">暂无 Skill</p>'; return }
  el.innerHTML = skills.map(s => \`
    <div class="item-row">
      <div class="item-info">
        <div class="item-name">\${s.ui?.icon || '📄'} \${s.name}
          <span class="badge \${s.tier==='free'?'b-green':s.tier==='pro'?'b-amber':'b-purple'}" style="margin-left:6px">\${s.tier}</span>
        </div>
        <div class="item-meta mono">\${s.id} · matchABI: \${(s.matchABI||[]).join(', ') || '—'}</div>
        <div class="item-meta" style="margin-top:2px">\${s.description || ''}</div>
      </div>
      <div class="item-actions">
        <button class="btn-ghost btn-sm" onclick="editSkill('\${s.id}')">编辑</button>
        <button class="btn-danger btn-sm" onclick="deleteSkill('\${s.id}')">删除</button>
      </div>
    </div>
  \`).join('')
}

function openSkillModal(skill) {
  document.getElementById('skill-modal-title').textContent = skill ? '编辑 Skill' : '新建 Skill'
  document.getElementById('sk-editing-id').value = skill?.id || ''
  document.getElementById('sk-id').value       = skill?.id || ''
  document.getElementById('sk-id').disabled    = !!skill
  document.getElementById('sk-name').value     = skill?.name || ''
  document.getElementById('sk-tier').value     = skill?.tier || 'free'
  document.getElementById('sk-icon').value     = skill?.ui?.icon || ''
  document.getElementById('sk-desc').value     = skill?.description || ''
  document.getElementById('sk-match').value    = (skill?.matchABI || []).join(',')
  document.getElementById('sk-prompt').value   = skill?.systemPrompt || ''
  document.getElementById('sk-actions').value  = JSON.stringify(skill?.ui?.quickActions || [], null, 2)
  document.getElementById('sk-schema').value   = JSON.stringify(skill?.schema?.fields || [], null, 2)
  document.getElementById('skill-modal').classList.add('show')
}

async function editSkill(id) {
  const s = await api('GET', '/admin/api/skills/' + id)
  openSkillModal(s)
}

async function saveSkill() {
  const id = document.getElementById('sk-editing-id').value
  let actions, schema
  try { actions = JSON.parse(document.getElementById('sk-actions').value || '[]') } catch { flash('快捷操作 JSON 格式错误', 'err'); return }
  try { schema  = JSON.parse(document.getElementById('sk-schema').value  || '[]') } catch { flash('Schema JSON 格式错误', 'err'); return }
  const data = {
    id:           document.getElementById('sk-id').value.trim(),
    name:         document.getElementById('sk-name').value.trim(),
    tier:         document.getElementById('sk-tier').value,
    description:  document.getElementById('sk-desc').value.trim(),
    matchABI:     document.getElementById('sk-match').value.split(',').map(s=>s.trim()).filter(Boolean),
    systemPrompt: document.getElementById('sk-prompt').value.trim(),
    ui:           { icon: document.getElementById('sk-icon').value.trim(), quickActions: actions },
    schema:       { fields: schema }
  }
  const result = id
    ? await api('PUT',  '/admin/api/skills/' + id, data)
    : await api('POST', '/admin/api/skills', data)
  if (result.error) { flash(result.error, 'err'); return }
  closeModal('skill-modal')
  flash('Skill 已保存 ✓', 'ok')
  loadSkills()
}

async function deleteSkill(id) {
  if (!confirm('确认删除 Skill: ' + id + '？')) return
  await api('DELETE', '/admin/api/skills/' + id)
  flash('已删除', 'ok')
  loadSkills()
}

// ── Contracts ──
async function loadContracts() {
  const contracts = await api('GET', '/admin/api/contracts')
  const el = document.getElementById('contracts-list')
  if (!contracts.length) { el.innerHTML = '<p style="color:#6b7280;font-size:13px">暂无合约</p>'; return }
  el.innerHTML = contracts.map(c => \`
    <div class="item-row">
      <div class="item-info">
        <div class="item-name">\${c.icon || '📄'} \${c.name}
          <span class="badge b-green" style="margin-left:6px">\${c.chain}</span>
          <span class="badge" style="margin-left:4px;background:rgba(255,255,255,.06);color:#9ca3af">\${c.category}</span>
          \${c.audited ? '<span class="badge b-green" style="margin-left:4px">✓ 已审计</span>' : ''}
        </div>
        <div class="item-meta mono">\${c.address}</div>
        <div class="item-meta" style="margin-top:2px">\${c.description || ''}</div>
      </div>
      <div class="item-actions">
        <button class="btn-ghost btn-sm" onclick="editContract(\${c.id})">编辑</button>
        <button class="btn-danger btn-sm" onclick="deleteContract(\${c.id})">删除</button>
      </div>
    </div>
  \`).join('')
}

function openContractModal(c) {
  document.getElementById('contract-modal-title').textContent = c ? '编辑合约' : '新增合约'
  document.getElementById('ct-editing-id').value = c?.id || ''
  document.getElementById('ct-name').value    = c?.name || ''
  document.getElementById('ct-address').value = c?.address || ''
  document.getElementById('ct-chain').value   = c?.chain || 'mainnet'
  document.getElementById('ct-category').value= c?.category || 'Other'
  document.getElementById('ct-icon').value    = c?.icon || '📄'
  document.getElementById('ct-skill').value   = c?.skill_id || ''
  document.getElementById('ct-tvl').value     = c?.tvl || ''
  document.getElementById('ct-audited').checked = !!c?.audited
  document.getElementById('ct-desc').value    = c?.description || ''
  document.getElementById('contract-modal').classList.add('show')
}

async function editContract(id) {
  const c = await api('GET', '/admin/api/contracts/' + id)
  openContractModal(c)
}

async function saveContract() {
  const id = document.getElementById('ct-editing-id').value
  const data = {
    name:        document.getElementById('ct-name').value.trim(),
    address:     document.getElementById('ct-address').value.trim(),
    chain:       document.getElementById('ct-chain').value,
    category:    document.getElementById('ct-category').value,
    icon:        document.getElementById('ct-icon').value.trim(),
    skillId:     document.getElementById('ct-skill').value.trim() || null,
    tvl:         document.getElementById('ct-tvl').value.trim() || null,
    audited:     document.getElementById('ct-audited').checked,
    description: document.getElementById('ct-desc').value.trim()
  }
  const result = id
    ? await api('PUT',  '/admin/api/contracts/' + id, data)
    : await api('POST', '/admin/api/contracts', data)
  if (result.error) { flash(result.error, 'err'); return }
  closeModal('contract-modal')
  flash('合约已保存 ✓', 'ok')
  loadContracts()
}

async function deleteContract(id) {
  if (!confirm('确认移除此合约？')) return
  await api('DELETE', '/admin/api/contracts/' + id)
  flash('已移除', 'ok')
  loadContracts()
}

// ── Config ──
async function saveConfig() {
  const data = {}
  const anthropic = document.getElementById('cfg-anthropic').value.trim()
  const deepseek  = document.getElementById('cfg-deepseek').value.trim()
  const etherscan = document.getElementById('cfg-etherscan').value.trim()
  const password  = document.getElementById('cfg-password').value.trim()
  if (anthropic) data.anthropicKey = anthropic
  if (deepseek)  data.deepseekKey  = deepseek
  if (etherscan) data.etherscanKey = etherscan
  if (password)  data.adminPassword = password
  await api('POST', '/admin/api/config', data)
  flash('配置已保存 ✓', 'ok')
  document.getElementById('cfg-anthropic').value = ''
  document.getElementById('cfg-deepseek').value  = ''
  document.getElementById('cfg-etherscan').value = ''
  document.getElementById('cfg-password').value  = ''
}

// ── Helpers ──
function closeModal(id) { document.getElementById(id).classList.remove('show') }
function flash(msg, type) {
  const el = document.getElementById('flash-main')
  el.textContent = msg
  el.className = 'flash ' + type + ' show'
  setTimeout(() => el.classList.remove('show'), 3000)
}

// Auto-login if token exists
if (token) {
  api('GET', '/admin/api/skills').then(d => {
    if (d.error) { localStorage.removeItem('cc_admin_token'); token = '' }
    else showMain()
  })
}
</script>
</body>
</html>`
