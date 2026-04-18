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
        return { id: user.id, name: user.name, email: user.email ?? '', role: user.role, outletId: user.outletId, outletName: user.outlet.name } as any
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
        if (!credentials?.pin || !credentials?.outletId) return null
        const user = await prisma.user.findFirst({
          where: { pin: credentials.pin, outletId: credentials.outletId, isActive: true },
          include: { outlet: true },
        })
        if (!user) return null
        return { id: user.id, name: user.name, email: user.email ?? '', role: user.role, outletId: user.outletId, outletName: user.outlet.name } as any
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
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.outletId = token.outletId as string
        session.user.outletName = token.outletName as string
      }
      return session
    },
  },
}

import { getServerSession } from 'next-auth'
export const getAuth = () => getServerSession(authOptions)
