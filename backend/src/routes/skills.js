import { Router } from 'express'
import { skillsDB } from '../db/index.js'

const router = Router()

router.get('/',     async (_, res) => {
  try {
    const skills = await skillsDB.all()
    res.json(skills)
  } catch (error) {
    console.error('[Skills] Error fetching all skills:', error)
    res.status(500).json({ error: 'Failed to fetch skills' })
  }
})

router.get('/:id',  async (req, res) => {
  try {
    const skill = await skillsDB.get(req.params.id)
    skill ? res.json(skill) : res.status(404).json({ error: 'Skill not found' })
  } catch (error) {
    console.error('[Skills] Error fetching skill:', error)
    res.status(500).json({ error: 'Failed to fetch skill' })
  }
})

export default router
