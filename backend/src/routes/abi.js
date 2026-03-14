import { Router } from 'express'
import { skillsDB } from '../db/index.js'

const router = Router()

const HOSTS = {
  mainnet:  'api.etherscan.io',
  polygon:  'api.polygonscan.com',
  bsc:      'api.bscscan.com',
  arbitrum: 'api.arbiscan.io',
  optimism: 'api.optimistic.etherscan.io',
  base:     'api.basescan.org',
}

router.get('/:address', async (req, res) => {
  const { address } = req.params
  const { chain = 'mainnet' } = req.query
  const host = HOSTS[chain] || HOSTS.mainnet
  const key  = process.env.ETHERSCAN_KEY

  try {
    let abi = null
    if (key) {
      const r = await fetch(`https://${host}/api?module=contract&action=getabi&address=${address}&apikey=${key}`)
      const d = await r.json()
      if (d.status === '1') abi = JSON.parse(d.result)
    }

    // Auto-match skill by ABI function names
    let skillId = null
    if (abi) {
      const fnNames = abi.filter(x => x.type === 'function').map(x => x.name)
      const skill = await skillsDB.match(fnNames)
      skillId = skill?.id || null
    }

    res.json({ abi, skillId, verified: !!abi })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
