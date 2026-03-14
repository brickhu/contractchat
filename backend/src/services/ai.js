export async function callAI({ model, messages, system, maxTokens = 1200 }) {
  const provider = detectProvider(model)
  if (provider === 'deepseek') return callDeepSeek({ model, messages, system, maxTokens })
  return callClaude({ model, messages, system, maxTokens })
}

function detectProvider(model) {
  if (!model) return 'claude'
  if (model.startsWith('deepseek')) return 'deepseek'
  return 'claude'
}

async function callClaude({ model, messages, system, maxTokens }) {
  const key = process.env.ANTHROPIC_KEY
  if (!key) throw new Error('ANTHROPIC_KEY 未配置')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `Claude error ${res.status}`)
  return { text: data.content[0].text, provider: 'claude', model: data.model }
}

async function callDeepSeek({ model, messages, system, maxTokens }) {
  const key = process.env.DEEPSEEK_KEY
  if (!key) throw new Error('DEEPSEEK_KEY 未配置')

  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      max_tokens: maxTokens,
      messages: msgs
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `DeepSeek error ${res.status}`)
  return { text: data.choices[0].message.content, provider: 'deepseek', model: data.model }
}
