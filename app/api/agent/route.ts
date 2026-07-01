import { NextRequest, NextResponse } from 'next/server'
import { parseAgentCommand } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    const intent = await parseAgentCommand(message)
    return NextResponse.json({ intent })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
