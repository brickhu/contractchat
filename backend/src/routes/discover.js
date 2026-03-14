import { Router } from 'express'
import { contractsDB } from '../db/index.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { chain } = req.query
    const contracts = await contractsDB.all(chain)
    res.json(contracts.map(c => ({
      id: c.id, name: c.name, address: c.address,
      chain: c.chain, category: c.category,
      description: c.description, icon: c.icon,
      skill: c.skill_id, audited: !!c.audited, tvl: c.tvl
    })))
  } catch (error) {
    console.error('[Discover] Error:', error)
    res.status(500).json({ error: 'Failed to fetch contracts' })
  }
})

export default router
