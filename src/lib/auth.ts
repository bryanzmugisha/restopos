import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 12 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
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
        return { id: user.id, name: user.name, email: user.email ?? '', role: user.role, outletId: user.outletId, outletName: user.outlet.name, modules: (user.outlet as any).modules ?? null } as any
      },
    }),
    CredentialsProvider({
      id: 'pin',
      name: 'PIN',
      credentials: {
        pin: { label: 'PIN', type: 'password' },
        outletId: { label: 'Outlet', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.pin) return null
        // Search all outlets by PIN — outletId 'all' or missing means search everywhere
        const where: any = { pin: credentials.pin, isActive: true }
        if (credentials.outletId && credentials.outletId !== 'all') {
          where.outletId = credentials.outletId
        }
        const user = await prisma.user.findFirst({
          where,
          include: { outlet: true },
          orderBy: { createdAt: 'asc' },
        })
        if (!user) return null
        return { id: user.id, name: user.name, email: user.email ?? '', role: user.role, outletId: user.outletId, outletName: user.outlet.name, modules: (user.outlet as any).modules ?? null } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.outletId = (user as any).outletId
        token.outletName = (user as any).outletName
        token.modules = (user as any).modules
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.outletId = token.outletId as string
        session.user.outletName = token.outletName
      ;(session.user as any).modules = token.modules as string
      }
      return session
    },
  },
}

import { getServerSession } from 'next-auth'
export const getAuth = () => getServerSession(authOptions)
