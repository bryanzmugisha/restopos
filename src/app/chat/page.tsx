'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Suspense } from 'react'

interface User { id: string; name: string; role: string }
interface Message {
  id: string; content: string; type: string; senderId: string; createdAt: string
  sender: { id: string; name: string; role: string }
  orderId?: string
}
interface Conversation {
  id: string; type: string; name?: string; unreadCount: number; updatedAt: string
  members: { user: User }[]
  messages: (Message & { sender: { name: string } })[]
}

const roleColor: Record<string, string> = {
  ADMIN: '#a855f7', MANAGER: '#3b82f6', CASHIER: '#22c55e',
  WAITER: '#f97316', KITCHEN_STAFF: '#ef4444', BAR_STAFF: '#6366f1', DELIVERY_STAFF: '#f59e0b'
}

function ChatContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [convs, setConvs] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showPing, setShowPing] = useState(false)
  const [newType, setNewType] = useState<'DIRECT' | 'GROUP'>('DIRECT')
  const [newName, setNewName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [pingUser, setPingUser] = useState('')
  const [pingMsg, setPingMsg] = useState('')
  const [pingDone, setPingDone] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout>()

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const fetchConvs = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations')
      if (res.ok) setConvs(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data.filter((u: User) => u.id !== session?.user.id) : [])
      }
    } catch {}
  }, [session])

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${convId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : [])
        setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        // Mark as read in local state
        setConvs(cs => cs.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c))
      }
    } catch {}
  }, [])

  useEffect(() => { fetchConvs(); fetchUsers() }, [fetchConvs, fetchUsers])

  // Poll for new messages in active conversation
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      fetchConvs()
      if (activeConv) fetchMessages(activeConv)
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeConv, fetchConvs, fetchMessages])

  const openConv = async (id: string) => {
    setActiveConv(id)
    await fetchMessages(id)
  }

  const sendMessage = async (type = 'TEXT', content?: string) => {
    if (!activeConv) return
    const text = content || input.trim()
    if (!text) return
    setSending(true)
    try {
      const res = await fetch(`/api/chat/conversations/${activeConv}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, type }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages(m => [...m, msg])
        setInput('')
        setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } catch {}
    setSending(false)
  }

  const createConv = async () => {
    if (selectedUsers.length === 0) return
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType, name: newName || null, memberIds: selectedUsers }),
      })
      if (res.ok) {
        const conv = await res.json()
        setConvs(cs => [conv, ...cs.filter(c => c.id !== conv.id)])
        setShowNew(false); setSelectedUsers([]); setNewName('')
        openConv(conv.id)
      }
    } catch {}
  }

  const sendPing = async () => {
    if (!pingUser) return
    try {
      const res = await fetch('/api/chat/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: pingUser, message: pingMsg || undefined }),
      })
      if (res.ok) {
        const data = await res.json()
        setPingDone(true)
        fetchConvs()
        setTimeout(() => { setShowPing(false); setPingDone(false); setPingMsg(''); setPingUser(''); openConv(data.conversationId) }, 1500)
      }
    } catch {}
  }

  const getConvName = (conv: Conversation) => {
    if (conv.name) return conv.name
    const other = conv.members.find(m => m.user.id !== session?.user.id)
    return other?.user.name ?? 'Chat'
  }

  const getConvInitial = (conv: Conversation) => getConvName(conv).charAt(0).toUpperCase()

  const getConvColor = (conv: Conversation) => {
    if (conv.type === 'GROUP') return '#f97316'
    const other = conv.members.find(m => m.user.id !== session?.user.id)
    return roleColor[other?.user.role ?? ''] ?? '#71717a'
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    return isToday ? d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  }

  const totalUnread = convs.reduce((s, c) => s + c.unreadCount, 0)
  const activeConvData = convs.find(c => c.id === activeConv)
  const C = { bg: '#09090b', s: '#18181b', b: '#27272a', t: '#fafafa', m: '#71717a', br: '#f97316' }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: `1px solid ${C.b}`, flexShrink: 0, paddingTop: 'max(10px,env(safe-area-inset-top))' }}>
        <button onClick={() => activeConv ? setActiveConv(null) : router.push('/dashboard')}
          style={{ width: '36px', height: '36px', borderRadius: '8px', background: C.s, border: `1px solid ${C.b}`, color: C.t, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ←
        </button>
        <h1 style={{ fontSize: '16px', fontWeight: '700', color: C.t, flex: 1, margin: 0 }}>
          💬 {activeConvData ? getConvName(activeConvData) : 'Staff Chat'}
          {!activeConv && totalUnread > 0 && <span style={{ marginLeft: '8px', background: '#ef4444', color: 'white', borderRadius: '999px', padding: '1px 7px', fontSize: '11px', fontWeight: '800' }}>{totalUnread}</span>}
        </h1>
        {!activeConv && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setShowPing(true)} style={{ padding: '7px 12px', borderRadius: '8px', background: '#450a0a', border: '1px solid #7f1d1d', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>🔔 Ping</button>
            <button onClick={() => setShowNew(true)} style={{ padding: '7px 12px', borderRadius: '8px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>+ Chat</button>
          </div>
        )}
        {activeConv && (
          <button onClick={() => sendMessage('PING', `🔔 ${session?.user.name} needs attention!`)}
            style={{ padding: '7px 12px', borderRadius: '8px', background: '#450a0a', border: '1px solid #7f1d1d', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>🔔 Ping</button>
        )}
      </div>

      {!activeConv ? (
        /* Conversations list */
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
          {loading ? (
            <p style={{ color: C.m, textAlign: 'center', padding: '40px', fontSize: '14px' }}>Loading chats...</p>
          ) : convs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#52525b' }}>
              <p style={{ fontSize: '48px', marginBottom: '12px' }}>💬</p>
              <p style={{ fontSize: '16px', color: C.m, marginBottom: '8px' }}>No conversations yet</p>
              <p style={{ fontSize: '13px', marginBottom: '20px' }}>Start a chat with any staff member</p>
              <button onClick={() => setShowNew(true)} style={{ padding: '10px 24px', borderRadius: '10px', background: C.br, border: 'none', color: 'white', cursor: 'pointer', fontWeight: '700' }}>Start First Chat</button>
            </div>
          ) : convs.map(conv => (
            <div key={conv.id} onClick={() => openConv(conv.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `1px solid ${C.b}`, cursor: 'pointer', background: conv.unreadCount > 0 ? '#0f0f12' : 'transparent' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#111'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = conv.unreadCount > 0 ? '#0f0f12' : 'transparent'}>
              {/* Avatar */}
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: getConvColor(conv), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: 'white', flexShrink: 0, position: 'relative' }}>
                {conv.type === 'GROUP' ? '👥' : getConvInitial(conv)}
                {conv.unreadCount > 0 && (
                  <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', border: `2px solid ${C.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', color: 'white' }}>
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <p style={{ color: conv.unreadCount > 0 ? C.t : C.t, fontWeight: conv.unreadCount > 0 ? '700' : '500', fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getConvName(conv)}</p>
                  <span style={{ color: C.m, fontSize: '11px', flexShrink: 0, marginLeft: '8px' }}>{conv.messages[0] ? formatTime(conv.messages[0].createdAt) : ''}</span>
                </div>
                <p style={{ color: conv.unreadCount > 0 ? '#a1a1aa' : C.m, fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: conv.unreadCount > 0 ? '500' : '400' }}>
                  {conv.messages[0] ? (
                    conv.messages[0].type === 'PING'
                      ? `🔔 ${conv.messages[0].sender.name} pinged`
                      : `${conv.messages[0].sender.name === session?.user.name ? 'You' : conv.messages[0].sender.name}: ${conv.messages[0].content}`
                  ) : 'No messages yet'}
                </p>
              </div>
            </div>
          ))}
          <div style={{ height: '80px' }} />
        </div>
      ) : (
        /* Messages view */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Members bar */}
          <div style={{ padding: '6px 14px', borderBottom: `1px solid ${C.b}`, flexShrink: 0, display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {activeConvData?.members.map(m => (
              <div key={m.user.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, padding: '3px 8px', borderRadius: '999px', background: (roleColor[m.user.role] ?? '#71717a') + '22', border: `1px solid ${(roleColor[m.user.role] ?? '#71717a')}44` }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: roleColor[m.user.role] ?? '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'white', fontWeight: '700' }}>{m.user.name.charAt(0)}</div>
                <span style={{ fontSize: '11px', color: C.t, fontWeight: m.user.id === session?.user.id ? '700' : '400' }}>{m.user.id === session?.user.id ? 'You' : m.user.name}</span>
              </div>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '12px' }}>
            {messages.map((msg, i) => {
              const isMe = msg.senderId === session?.user.id
              const isPing = msg.type === 'PING'
              const showSender = !isMe && (i === 0 || messages[i-1].senderId !== msg.senderId)
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '6px', marginBottom: '6px' }}>
                  {!isMe && (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: roleColor[msg.sender.role] ?? '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white', flexShrink: 0, marginBottom: '2px' }}>
                      {msg.sender.name.charAt(0)}
                    </div>
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    {showSender && !isMe && <p style={{ color: roleColor[msg.sender.role] ?? C.m, fontSize: '11px', fontWeight: '600', margin: '0 0 3px 2px' }}>{msg.sender.name}</p>}
                    <div style={{
                      padding: isPing ? '10px 14px' : '9px 12px',
                      borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isPing ? '#450a0a' : isMe ? C.br : C.s,
                      border: isPing ? '1px solid #7f1d1d' : 'none',
                      animation: isPing ? 'pingPulse 0.5s ease' : 'none',
                    }}>
                      {isPing && <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: '700', margin: '0 0 3px' }}>🔔 PING</p>}
                      <p style={{ color: isPing ? '#fca5a5' : C.t, fontSize: '14px', margin: 0, lineHeight: '1.4', wordBreak: 'break-word' }}>{msg.content}</p>
                    </div>
                    <p style={{ color: '#3f3f46', fontSize: '10px', margin: '2px 4px 0', textAlign: isMe ? 'right' : 'left' }}>{formatTime(msg.createdAt)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEnd} />
          </div>

          {/* Quick actions */}
          <div style={{ padding: '6px 12px', borderTop: `1px solid ${C.b}`, display: 'flex', gap: '6px', overflowX: 'auto', flexShrink: 0 }}>
            {['✅ Order ready', '💰 Please bill', '🔄 Re-checking', '⏳ Few more mins', '❓ Any update?'].map(q => (
              <button key={q} onClick={() => sendMessage('TEXT', q)}
                style={{ padding: '5px 10px', borderRadius: '999px', background: C.s, border: `1px solid ${C.b}`, color: C.m, cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', paddingBottom: 'max(10px,env(safe-area-inset-bottom))', borderTop: `1px solid ${C.b}`, display: 'flex', gap: '8px', flexShrink: 0, background: C.bg }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Type a message..." maxLength={500}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', background: C.s, border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none', minWidth: 0 }} />
            <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
              style={{ width: '40px', height: '40px', borderRadius: '50%', background: input.trim() ? C.br : '#27272a', border: 'none', color: 'white', cursor: input.trim() ? 'pointer' : 'not-allowed', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {sending ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}

      {/* New chat modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowNew(false)}>
          <div style={{ background: '#1c1c1e', borderTop: `1px solid ${C.b}`, borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '85vh', overflow: 'auto', padding: '20px 16px', paddingBottom: 'max(20px,env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: C.t, fontWeight: '700', marginBottom: '16px', fontSize: '16px' }}>💬 New Conversation</h3>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['DIRECT', 'GROUP'] as const).map(t => (
                <button key={t} onClick={() => setNewType(t)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${newType === t ? C.br : C.b}`, background: newType === t ? '#1a0f00' : 'transparent', color: newType === t ? C.br : C.m, cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  {t === 'DIRECT' ? '👤 Direct Message' : '👥 Group Chat'}
                </button>
              ))}
            </div>

            {newType === 'GROUP' && (
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Group name (optional)"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#27272a', border: `1px solid ${C.b}`, color: C.t, fontSize: '14px', outline: 'none', marginBottom: '14px', boxSizing: 'border-box' }} />
            )}

            <p style={{ color: C.m, fontSize: '12px', marginBottom: '10px' }}>Select staff members:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {users.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: selectedUsers.includes(u.id) ? '#1a0f00' : C.s, border: `1px solid ${selectedUsers.includes(u.id) ? C.br : C.b}`, cursor: 'pointer' }}>
                  <input type={newType === 'DIRECT' ? 'radio' : 'checkbox'} checked={selectedUsers.includes(u.id)}
                    onChange={() => {
                      if (newType === 'DIRECT') setSelectedUsers([u.id])
                      else setSelectedUsers(s => s.includes(u.id) ? s.filter(x => x !== u.id) : [...s, u.id])
                    }} style={{ display: 'none' }} />
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: roleColor[u.role] ?? '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: 'white', flexShrink: 0 }}>{u.name.charAt(0)}</div>
                  <div>
                    <p style={{ color: C.t, fontWeight: '600', fontSize: '14px', margin: 0 }}>{u.name}</p>
                    <p style={{ color: C.m, fontSize: '11px', margin: 0 }}>{u.role.replace(/_/g, ' ')}</p>
                  </div>
                  {selectedUsers.includes(u.id) && <div style={{ marginLeft: 'auto', color: C.br, fontWeight: '800', fontSize: '18px' }}>✓</div>}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.b}`, color: C.m, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createConv} disabled={selectedUsers.length === 0} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: selectedUsers.length > 0 ? C.br : '#27272a', border: 'none', color: 'white', cursor: selectedUsers.length > 0 ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '14px' }}>
                {newType === 'DIRECT' ? 'Start Chat' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ping modal */}
      {showPing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowPing(false)}>
          <div style={{ background: '#1c1c1e', borderTop: '1px solid #7f1d1d', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 16px', paddingBottom: 'max(20px,env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#ef4444', fontWeight: '700', marginBottom: '6px', fontSize: '16px' }}>🔔 Ping Staff Member</h3>
            <p style={{ color: C.m, fontSize: '13px', marginBottom: '16px' }}>Sends an urgent alert with a sound notification</p>

            {pingDone ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ fontSize: '40px', marginBottom: '8px' }}>✅</p>
                <p style={{ color: '#22c55e', fontWeight: '700' }}>Ping sent!</p>
              </div>
            ) : <>
              <div style={{ marginBottom: '12px' }}>
                <p style={{ color: C.m, fontSize: '12px', marginBottom: '8px' }}>Select who to ping:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {users.map(u => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', background: pingUser === u.id ? '#450a0a' : C.s, border: `1px solid ${pingUser === u.id ? '#ef4444' : C.b}`, cursor: 'pointer' }}>
                      <input type="radio" checked={pingUser === u.id} onChange={() => setPingUser(u.id)} style={{ display: 'none' }} />
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: roleColor[u.role] ?? '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: 'white', flexShrink: 0 }}>{u.name.charAt(0)}</div>
                      <div>
                        <p style={{ color: C.t, fontWeight: '600', fontSize: '13px', margin: 0 }}>{u.name}</p>
                        <p style={{ color: C.m, fontSize: '11px', margin: 0 }}>{u.role.replace(/_/g, ' ')}</p>
                      </div>
                      {pingUser === u.id && <span style={{ marginLeft: 'auto', color: '#ef4444', fontSize: '18px' }}>🔔</span>}
                    </label>
                  ))}
                </div>
              </div>
              <input value={pingMsg} onChange={e => setPingMsg(e.target.value)} placeholder="Optional message (e.g. Table 4 needs attention!)"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#27272a', border: '1px solid #3f3f46', color: C.t, fontSize: '14px', outline: 'none', marginBottom: '14px', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowPing(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.b}`, color: C.m, cursor: 'pointer' }}>Cancel</button>
                <button onClick={sendPing} disabled={!pingUser}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', background: pingUser ? '#dc2626' : '#27272a', border: 'none', color: 'white', cursor: pingUser ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '14px' }}>
                  🔔 Send Ping
                </button>
              </div>
            </>}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pingPulse { 0%{transform:scale(1)} 50%{transform:scale(1.03)} 100%{transform:scale(1)} }
      `}</style>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#09090b', color: '#71717a' }}>Loading chat...</div>}>
      <ChatContent />
    </Suspense>
  )
}
