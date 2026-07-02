'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useTheme } from './ThemeProvider'

const navItems = [
  { group: 'MAIN', items: [
    { href: '/agent', label: 'Agent', icon: '🤖' },
    { href: '/send-gift', label: 'Send Gift', icon: '🎁' },
  ]},
  { group: 'FINANCE', items: [
    { href: '/invoice', label: 'Invoice', icon: '🧾' },
    { href: '/payroll', label: 'Payroll', icon: '💰' },
    { href: '/history', label: 'History', icon: '📜' },
  ]},
  { group: 'EXPLORE', items: [
    { href: '/profile', label: 'Profile', icon: '👤' },
    { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { href: '/tasks', label: 'Tasks', icon: '✅' },
  ]},
]

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <aside
      className="w-64 h-screen sticky top-0 flex flex-col"
      style={{
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-sidebar)',
      }}
    >
      {/* Logo + theme toggle */}
      <div
        className="h-20 px-6 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          {/* Logo: rounded square card + teal circle */}
          <svg width="40" height="30" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Card outline */}
            <rect x="1.5" y="1.5" width="37" height="27" rx="7" ry="7"
              fill="var(--bg-card)" stroke="var(--text-heading)" strokeWidth="2.5"/>
            {/* Left arc — adapts to theme */}
            <path d="M18 8 A8 8 0 0 0 18 22" stroke="var(--text-heading)" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
            {/* Right arc — teal */}
            <path d="M22 8 A8 8 0 0 1 22 22" stroke="var(--teal)" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
          </svg>
          <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>CirPay</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navItems.map((group) => (
          <div key={group.group}>
            <p
              className="text-xs font-semibold tracking-wider mb-2 px-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {group.group}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'nav-active' : 'nav-inactive'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Wallet */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus="address"
        />
      </div>
    </aside>
  )
}
