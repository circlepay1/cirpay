'use client'

import { useState } from 'react'
import type React from 'react'
import { useAccount, useSendTransaction } from 'wagmi'
import { isAddress, parseUnits } from 'viem'
import AppLayout from '@/app/components/AppLayout'
import { USDC_ADDRESS, USDC_DECIMALS } from '@/lib/arc'
import { saveTransaction } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

type Employee = {
  name: string
  address: string
  salary: string
  status: 'Approved' | 'Awaiting address' | 'Error' | 'Paid'
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  'Approved':        { background: 'var(--status-positive-bg)', color: 'var(--status-positive-text)', border: '1px solid var(--status-positive-text)' },
  'Awaiting address':{ background: 'var(--status-pending-bg)',  color: 'var(--status-pending-text)',  border: '1px solid var(--status-pending-text)' },
  'Error':           { background: 'var(--status-negative-bg)', color: 'var(--status-negative-text)', border: '1px solid var(--status-negative-text)' },
  'Paid':            { background: 'var(--bg-input)',           color: 'var(--text-secondary)',        border: '1px solid var(--border)' },
}

export default function PayrollPage() {
  const { address, isConnected } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [processing, setProcessing] = useState(false)
  const [preview, setPreview] = useState(false)

  // Add employee modal
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', salary: '' })
  const [formError, setFormError] = useState('')

  const total = employees.reduce((s, e) => s + parseFloat(e.salary || '0'), 0)
  const approved = employees.filter((e) => isAddress(e.address) && e.salary).length
  const pending = employees.filter((e) => !isAddress(e.address)).length
  const validEmployees = employees.filter((e) => isAddress(e.address) && e.salary)

  function openAdd() {
    setForm({ name: '', address: '', salary: '' })
    setFormError('')
    setShowAdd(true)
  }

  function addEmployee() {
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    if (!isAddress(form.address)) { setFormError('Enter a valid wallet address.'); return }
    if (!form.salary || parseFloat(form.salary) <= 0) { setFormError('Enter a valid salary.'); return }
    setEmployees((prev) => [...prev, {
      name: form.name.trim(),
      address: form.address,
      salary: form.salary,
      status: 'Approved',
    }])
    setShowAdd(false)
  }

  function removeEmployee(i: number) {
    setEmployees((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function sendAll() {
    if (!isConnected || validEmployees.length === 0) return
    setProcessing(true)
    setPreview(false)
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]
      if (!isAddress(emp.address) || !emp.salary) continue
      try {
        const amount = parseUnits(emp.salary, USDC_DECIMALS)
        const data = `0xa9059cbb${emp.address.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`
        const tx = await sendTransactionAsync({ to: USDC_ADDRESS, data: data as `0x${string}` })
        await saveTransaction(address!, emp.address, parseFloat(emp.salary), tx, 'payroll')
        await supabase.from('payroll_notifications').insert({
          sender_address: address!.toLowerCase(),
          recipient_address: emp.address.toLowerCase(),
          amount: parseFloat(emp.salary),
          tx_hash: tx,
          seen: false,
        })
        setEmployees((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'Paid' } : e))
      } catch {
        setEmployees((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'Error' } : e))
      }
    }
    setProcessing(false)
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Payroll</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Total employees', value: employees.length },
            { label: 'Total amount', value: `$${total.toLocaleString()}` },
            { label: 'Approved', value: approved, color: 'var(--text-positive)' },
            { label: 'Pending', value: pending, color: '#FACC15' },
          ].map((s) => (
            <div key={s.label} className="card rounded-xl p-4">
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color || 'var(--text-primary)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {employees.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No employees added yet. Add one using the button below.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Wallet address</th>
                  <th className="px-5 py-3 text-right">Salary (USDC)</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr key={i} className="card-hover"
                      style={i < employees.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                             style={{ background: 'var(--purple)' }}>
                          {initials(emp.name)}
                        </div>
                        <span style={{ color: 'var(--text-primary)' }} className="text-sm">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {emp.address.slice(0, 8)}...{emp.address.slice(-6)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium" style={{ color: 'var(--text-primary)' }}>${emp.salary}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={STATUS_STYLE[emp.status]}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => removeEmployee(i)} className="text-lg leading-none transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-negative)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button onClick={openAdd} className="btn-primary px-4 py-2.5 text-sm font-medium rounded-lg">
            + Add Employee
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setPreview(true)}
              disabled={validEmployees.length === 0}
              className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg disabled:opacity-50"
            >
              👁 Preview
            </button>
            <button
              onClick={sendAll}
              disabled={!isConnected || processing || validEmployees.length === 0}
              className="btn-primary px-6 py-2.5 text-sm font-bold rounded-lg disabled:opacity-50"
            >
              {processing ? 'Processing...' : `Send to all · $${total.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAdd && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "var(--overlay)" }}>
          <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--text-heading)' }}>Add Employee</h3>
            <div className="space-y-3">
              <div>
                <label className="label mb-1 block">Full Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" className="input-base" />
              </div>
              <div>
                <label className="label mb-1 block">Wallet Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="0x..." className="input-base font-mono" />
              </div>
              <div>
                <label className="label mb-1 block">Salary (USDC)</label>
                <input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="2500" className="input-base" />
              </div>
            </div>
            {formError && <p className="text-xs mt-3" style={{ color: 'var(--text-negative)' }}>{formError}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="btn-ghost flex-1 py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={addEmployee} className="btn-primary flex-1 py-2.5 rounded-lg text-sm font-bold">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "var(--overlay)" }}>
          <div className="rounded-2xl p-6 max-w-md w-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-heading)' }}>Payment Preview</h3>
            <div className="space-y-2 mb-5 max-h-64 overflow-y-auto">
              {validEmployees.map((emp, i) => (
                <div key={i} className="flex justify-between text-sm py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ color: 'var(--text-primary)' }}>{emp.name}</p>
                    <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{emp.address.slice(0, 8)}...{emp.address.slice(-6)}</p>
                  </div>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>${emp.salary} USDC</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-bold pt-3 mb-5" style={{ borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total</span>
              <span style={{ color: 'var(--text-primary)' }}>${total.toLocaleString()} USDC</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPreview(false)} className="btn-ghost flex-1 py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={sendAll} className="btn-primary flex-1 py-2.5 rounded-lg text-sm font-bold">Confirm &amp; Send</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
