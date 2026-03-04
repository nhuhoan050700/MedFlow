'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

export type User = {
  id: number
  email: string
  name: string
  birthday?: string
  phone?: string
  address?: string
}

interface ProfileModalProps {
  user: User
  open: boolean
  onClose: () => void
  onSave: (updated: User) => void
  onSignOut?: () => void
}

export default function ProfileModal({ user, open, onClose, onSave, onSignOut }: ProfileModalProps) {
  const { locale, setLocale } = useLanguage()
  const [name, setName] = useState(user.name)
  const [birthday, setBirthday] = useState(user.birthday ?? '')
  const [phone, setPhone] = useState(user.phone ?? '')
  const [address, setAddress] = useState(user.address ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(user.name)
      setBirthday(user.birthday ?? '')
      setPhone(user.phone ?? '')
      setAddress(user.address ?? '')
      setError(null)
    }
  }, [open, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: name.trim() || user.name,
          birthday: birthday.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to update profile')
        return
      }
      const updated: User = {
        id: user.id,
        email: data.user?.email ?? user.email,
        name: data.user?.name ?? (name.trim() || user.name),
        birthday: data.user?.birthday ?? (birthday.trim() || undefined),
        phone: data.user?.phone ?? (phone.trim() || undefined),
        address: data.user?.address ?? (address.trim() || undefined),
      }
      onSave(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Close"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        className="fixed inset-0 z-50 bg-black/50"
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Your details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <div className="flex rounded-xl border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setLocale('vi')}
                className={`flex-1 h-11 text-sm font-medium ${locale === 'vi' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                Tiếng Việt
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`flex-1 h-11 text-sm font-medium ${locale === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                English
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="profile-email"
              type="email"
              value={user.email}
              readOnly
              className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-0.5">Email cannot be changed</p>
          </div>
          <div>
            <label htmlFor="profile-birthday" className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
            <input
              id="profile-birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label htmlFor="profile-address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              id="profile-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full min-h-[72px] px-3 py-2.5 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Street, city, postal code"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-gray-300 text-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          {onSignOut && (
            <button
              type="button"
              onClick={() => { onClose(); onSignOut(); }}
              className="w-full mt-4 h-11 rounded-xl border border-red-300 bg-red-50 text-red-600 font-medium hover:bg-red-100 active:bg-red-200"
            >
              Sign out
            </button>
          )}
        </form>
      </div>
    </>
  )
}
