// Simple command parser (no external API needed)
export type AgentIntent =
  | { action: 'send'; to: string; amount: string }
  | { action: 'invoice'; to: string; amount: string; description: string }
  | { action: 'unknown'; reply: string }

export async function parseAgentCommand(userMessage: string): Promise<AgentIntent> {
  const msg = userMessage.toLowerCase().trim()

  // Send patterns
  const sendPattern = /send\s+(\d+(?:\.\d+)?)\s*(?:usdc)?\s+to\s+(0x[a-fA-F0-9]{40})/i
  const sendMatch = msg.match(sendPattern)
  if (sendMatch) {
    return { action: 'send', amount: sendMatch[1], to: sendMatch[2] }
  }

  // Invoice patterns
  const invoicePattern = /invoice\s+(0x[a-fA-F0-9]{40})\s+for\s+(\d+(?:\.\d+)?)\s*(?:usdc)?(?:\s+(.+))?/i
  const invoiceMatch = msg.match(invoicePattern)
  if (invoiceMatch) {
    return {
      action: 'invoice',
      to: invoiceMatch[1],
      amount: invoiceMatch[2],
      description: invoiceMatch[3]?.trim() || '',
    }
  }

  // Fallback
  return {
    action: 'unknown',
    reply: 'Could not understand. Try: "Send 10 USDC to 0x1234..." or "Invoice 0x1234... for 50 USDC"',
  }
}
