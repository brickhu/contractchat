import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDB } from './db/index.js'
import modelsRoute from './routes/models.js'
import abiRoute from './routes/abi.js'
import skillsRoute from './routes/skills.js'
import chatRoute from './routes/chat.js'
import discoverRoute from './routes/discover.js'
import adminRoute from './routes/admin.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: '*' }))
app.use(express.json())

// Init SQLite
initDB().catch(err => {
  console.error('[DB] Failed to initialize database:', err)
  process.exit(1)
})

// Public API
app.use('/api/models',   modelsRoute)
app.use('/api/abi',      abiRoute)
app.use('/api/skills',   skillsRoute)
app.use('/api/chat',     chatRoute)
app.use('/api/discover', discoverRoute)

// Admin (auth-gated)
app.use('/admin',        adminRoute)

app.get('/health', (_, res) => res.json({ ok: true, version: '3.0.0' }))

app.listen(PORT, () => {
  console.log(`\n🚀 ContractChat Backend v3.0`)
  console.log(`   http://localhost:${PORT}`)
  console.log(`   Claude:    ${process.env.ANTHROPIC_KEY ? '✅' : '❌'}`)
  console.log(`   DeepSeek:  ${process.env.DEEPSEEK_KEY  ? '✅' : '—'}`)
  console.log(`   Etherscan: ${process.env.ETHERSCAN_KEY ? '✅' : '—'}\n`)
})
