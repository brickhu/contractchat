import { Router } from 'express'
import { callAI } from '../services/ai.js'
import { skillsDB } from '../db/index.js'

const router = Router()

router.post('/', async (req, res) => {
  const { messages, system, model, skillId } = req.body
  if (!messages) return res.status(400).json({ error: 'messages required' })

  // Inject skill system prompt if provided
  let finalSystem = system || ''
  if (skillId) {
    const skill = await skillsDB.get(skillId)
    if (skill?.systemPrompt) finalSystem = skill.systemPrompt + '\n\n' + finalSystem
  }

  try {
    const result = await callAI({ model, messages, system: finalSystem })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
