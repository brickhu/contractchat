// routes/models.js
import { Router } from 'express'
const router = Router()

router.get('/', (_, res) => {
  const models = []
  if (process.env.ANTHROPIC_KEY) {
    models.push(
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', tier: 'free' },
      { id: 'claude-opus-4-20250514',   name: 'Claude Opus 4',   provider: 'anthropic', tier: 'pro' }
    )
  }
  if (process.env.DEEPSEEK_KEY) {
    models.push(
      { id: 'deepseek-chat',     name: 'DeepSeek Chat',     provider: 'deepseek', tier: 'free' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'deepseek', tier: 'pro' }
    )
  }
  const def = process.env.DEFAULT_MODEL
  if (def) {
    const idx = models.findIndex(m => m.id === def)
    if (idx > 0) models.unshift(models.splice(idx, 1)[0])
  }
  res.json(models)
})

export default router

