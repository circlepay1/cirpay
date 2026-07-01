// Groq AI agent — server-side only
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export type AgentIntent =
  | { action: 'send'; to: string; amount: string }
  | { action: 'invoice'; to: string; amount: string; description: string }
  | { action: 'unknown'; reply: string }

const SYSTEM_PROMPT = `You are the AI assistant for CirPay, a stablecoin payment app on the ARC network.
Analyze the user's command and respond ONLY with a valid JSON object.

Supported actions:
- send: Send USDC {"action":"send","to":"address","amount":"amount"}
- invoice: Send an invoice {"action":"invoice","to":"address","amount":"amount","description":"description"}
- unknown: Unsupported command {"action":"unknown","reply":"English explanation"}

Examples:
"Send 10 USDC to 0x1234" → {"action":"send","to":"0x1234","amount":"10"}
"Invoice 0x1234 for 200 USDC" → {"action":"invoice","to":"0x1234","amount":"200","description":""}
"Invoice 0x1234 for 500 USDC web design" → {"action":"invoice","to":"0x1234","amount":"500","description":"web design"}
"what is my balance" → {"action":"unknown","reply":"Check your balance on the Profile page."}
"swap" → {"action":"unknown","reply":"Only USDC send and invoice operations are supported."}

Return ONLY the JSON object, nothing else.`

export async function parseAgentCommand(userMessage: string): Promise<AgentIntent> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 200,
    })

    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsed = JSON.parse(raw)
    return parsed as AgentIntent
  } catch {
    return { action: 'unknown', reply: 'Could not understand your command. Please try again.' }
  }
}
