'use client'

import { useState } from 'react'

interface DocsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DocsModal({ isOpen, onClose }: DocsModalProps) {
  const [activeSection, setActiveSection] = useState('overview')

  if (!isOpen) return null

  const sections = [
    { id: 'overview', title: 'Overview' },
    { id: 'architecture', title: 'Architecture Summary' },
    { id: 'features', title: 'Features' },
    { id: 'user-flow', title: 'User Flow' },
    { id: 'assets', title: 'Supported Assets' },
    { id: 'faq', title: 'FAQ' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay)' }}>
      <div className="w-full max-w-5xl h-[80vh] flex rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {/* Sidebar */}
        <div className="w-64 overflow-y-auto" style={{ background: 'var(--bg-base)', borderRight: '1px solid var(--border)' }}>
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-heading)' }}>📚 CirPay Docs</h2>
          </div>
          <nav className="p-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                  activeSection === section.id ? '' : ''
                }`}
                style={
                  activeSection === section.id
                    ? { background: 'var(--teal)', color: '#FFFFFF' }
                    : { color: 'var(--text-secondary)' }
                }
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
              {sections.find((s) => s.id === activeSection)?.title}
            </h1>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose prose-sm max-w-none docs-content">
              {activeSection === 'overview' && (
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '20px' }}>
                    A USDC-based payment and finance platform with natural language processing capabilities.
                  </p>
                  
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>CirPay</strong> is a Web3 payment application that enables users to send payments, create invoices, process payroll in USDC (and other stablecoins), and perform all these operations through natural language commands via an AI-powered agent. The application works through wallet connection and rewards user interaction with gamification mechanics.
                  </p>

                  <h3 style={{ color: 'var(--text-heading)', marginTop: '24px', marginBottom: '12px' }}>Core Value Proposition:</h3>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li>Simplifies complex wallet operations to a chat interface</li>
                    <li>Consolidates invoice and payroll management in a single dashboard for businesses</li>
                    <li>Incentivizes user engagement with points, badges, and leaderboards</li>
                  </ul>
                </div>
              )}

              {activeSection === 'architecture' && (
                <div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '600' }}>Layer</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '600' }}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px', color: 'var(--text-primary)' }}>Interface</td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Single-page application (SPA) with left sidebar navigation</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px', color: 'var(--text-primary)' }}>Wallet Connection</td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Web3 wallet integration via "Connect Wallet" button</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px', color: 'var(--text-primary)' }}>Assets</td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Stablecoins/tokens such as USDC, EURC, cirBTC</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '12px', color: 'var(--text-primary)' }}>Network</td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>On-chain transactions, each transaction verifiable via block explorer link</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSection === 'features' && (
                <div>
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ color: 'var(--text-heading)', marginBottom: '12px' }}>🤖 ARC Agent</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      An AI agent that enables transactions through natural language.
                    </p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                      <li>Example command: <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-primary)' }}>Send 10 USDC to 0x1234...</code></li>
                      <li>Quick action buttons: <strong>Send USDC</strong>, <strong>Send Invoice</strong></li>
                      <li>When user types and sends text, the agent automatically interprets and executes the transaction</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ color: 'var(--text-heading)', marginBottom: '12px' }}>🎁 Send Gift</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Enables quick gift/payment sending with predefined amounts.
                    </p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                      <li>Selectable amounts: 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 7500, 10000 USDC</li>
                      <li>Each amount is represented by an emoji/badge (⭐ 🎁 💎 🏆 🚀 etc.)</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ color: 'var(--text-heading)', marginBottom: '12px' }}>🧾 Invoice</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Invoice creation and tracking module.
                    </p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                      <li>Summary cards: <strong>Pending</strong>, <strong>Paid</strong>, <strong>Overdue</strong></li>
                      <li>Invoice table: Recipient address, amount, status, date</li>
                      <li>Create new invoices with "+ New Invoice"</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ color: 'var(--text-heading)', marginBottom: '12px' }}>💰 Payroll</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Enables bulk salary payments to multiple employees/recipients.
                    </p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                      <li>Summary cards: Total employees, total amount, approved, pending</li>
                      <li>Add employees with <strong>+ Add Employee</strong></li>
                      <li><strong>Preview</strong> for payment preview, <strong>Send to all</strong> for bulk sending</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ color: 'var(--text-heading)', marginBottom: '12px' }}>📜 History</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Lists records of all on-chain activities.
                    </p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                      <li>Filtering: by transaction type and category</li>
                      <li>Each record: transaction type (Agent Send, Invoice, etc.), time, amount, and Explorer link</li>
                      <li>Pagination support</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ color: 'var(--text-heading)', marginBottom: '12px' }}>👤 Profile</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      User's on-chain identity and portfolio summary.
                    </p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                      <li>Wallet address and editable profile information</li>
                      <li>Metrics: <strong>P&L</strong>, <strong>Total Sent</strong>, <strong>Total Received</strong></li>
                      <li>Token-based balance table (USDC, EURC, cirBTC)</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ color: 'var(--text-heading)', marginBottom: '12px' }}>🏆 Leaderboard</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Ranks users by task points.
                    </p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                      <li>User's own rank is highlighted at the top</li>
                      <li>Address-based ranking and score display</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ color: 'var(--text-heading)', marginBottom: '12px' }}>✅ Tasks</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Task/reward system that encourages users to be active on the platform.
                    </p>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '16px' }}>
                      <li>Level progression with <strong>CirPay Score</strong>: Bronze (1K) → Silver (2.5K) → Gold (5K) → Diamond (10K)</li>
                      <li>Levels can be <strong>minted</strong> as NFT/badges</li>
                    </ul>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border)' }}>
                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '600' }}>Task</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '600' }}>Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Send USDC via Agent</td>
                            <td style={{ padding: '12px', color: 'var(--text-positive)' }}>+250</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Send a Quick Gift</td>
                            <td style={{ padding: '12px', color: 'var(--text-positive)' }}>+150</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Collect an Invoice</td>
                            <td style={{ padding: '12px', color: 'var(--text-positive)' }}>+500</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Pay an Invoice</td>
                            <td style={{ padding: '12px', color: 'var(--text-positive)' }}>+500</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Run Payroll</td>
                            <td style={{ padding: '12px', color: 'var(--text-positive)' }}>+500</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'user-flow' && (
                <div>
                  <ol style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '20px' }}>
                    <li>User connects their wallet via "Connect Wallet"</li>
                    <li>From the main screen, selects one of the modules: <strong>Agent</strong>, <strong>Send Gift</strong>, <strong>Invoice</strong>, or <strong>Payroll</strong></li>
                    <li>When a transaction is completed, the record is automatically added to <strong>History</strong></li>
                    <li>Each transaction is converted to points through <strong>Tasks</strong></li>
                    <li>Earned points determine ranking on the <strong>Leaderboard</strong>, and level badges can be minted via <strong>Profile</strong></li>
                  </ol>
                </div>
              )}

              {activeSection === 'assets' && (
                <div>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li><strong style={{ color: 'var(--text-primary)' }}>USDC</strong> — Primary transaction currency</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>EURC</strong> — Euro-based stablecoin</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>cirBTC</strong> — Platform-specific BTC representative asset</li>
                  </ul>
                </div>
              )}

              {activeSection === 'faq' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: 'var(--text-heading)', marginBottom: '8px' }}>Where can I see my invoices?</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      In the <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>Invoice</code> tab, they are listed by status (Pending/Paid/Overdue).
                    </p>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: 'var(--text-heading)', marginBottom: '8px' }}>How do I increase my points?</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Sending via Agent, sending gifts, creating/paying invoices, and running payroll all earn points.
                    </p>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: 'var(--text-heading)', marginBottom: '8px' }}>How do I verify my transactions?</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      You can verify on-chain by clicking the <strong>Explorer</strong> link next to each row in the <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>History</code> tab.
                    </p>
                  </div>

                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '32px', fontSize: '0.875rem' }}>
                    This documentation is based on the current CirPay product interface and should be updated as the product evolves.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
