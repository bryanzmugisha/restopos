import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 12 * 60 * 60 }, // 12h
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Password',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { outlet: true },
        })
        if (!user || !user.passwordHash) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email ?? '',
          role: user.role,
          outletId: user.outletId,
          outletName: user.outlet.name,
        }
      },
    }),
    CredentialsProvider({
      id: 'pin',
      name: 'PIN',
      credentials: {
        pin:      { label: 'PIN', type: 'password' },
        outletId: { label: 'Outlet', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.pin || !credentials?.outletId) return null
        const user = await prisma.user.findFirst({
          where: { pin: credentials.pin, outletId: credentials.outletId, isActive: true },
          include: { outlet: true },
        })
        if (!user) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email ?? '',
          role: user.role,
          outletId: user.outletId,
          outletName: user.outlet.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id       = user.id
        token.role     = (user as any).role
        token.outletId = (user as any).outletId
        token.outletName = (user as any).outletName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id        = token.id as string
        session.user.role      = token.role as string
        session.user.outletId  = token.outletId as string
        session.user.outletName = token.outletName as string
      }
      return session
    },
  },
}

export const getAuth = () => getServerSession(authOptions)

// ── Role permission matrix ──
export const PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  ADMIN:    ['manage:outlet', 'manage:menu', 'manage:users', 'manage:inventory',
             'view:reports', 'manage:settings', 'process:billing', 'take:orders'],
  MANAGER:  ['manage:menu', 'view:reports', 'manage:inventory',
             'process:billing', 'take:orders', 'manage:reservations'],
  CASHIER:  ['process:billing', 'view:orders'],
  WAITER:   ['take:orders', 'view:tables'],
  KITCHEN_STAFF: ['view:kds', 'update:kot'],
  DELIVERY_STAFF: ['view:delivery', 'update:delivery'],
} as const

export type UserRole = keyof typeof PERMISSIONS

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = PERMISSIONS[role] as readonly string[]
  return perms.includes('*') || perms.includes(permission)
}
