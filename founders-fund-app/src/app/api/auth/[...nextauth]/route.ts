import { prisma } from '@/lib/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import type { AuthOptions } from 'next-auth';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import DiscordProvider from 'next-auth/providers/discord';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';

// NOTE: authOptions must not be exported from route files in Next.js App Router
// This is an internal constant for the NextAuth handler only
const authOptions: AuthOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PrismaAdapter type incompatibility with @auth/core
  adapter: PrismaAdapter(prisma) as any, // Type cast to resolve @auth/core vs next-auth adapter incompatibility
  providers: [
    // Email/Password Authentication
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    // GitHub OAuth
    GitHubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
    // Discord OAuth
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in - user object is available
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }

      // On every token refresh, fetch latest user data from DB to ensure role is current
      // This is critical for account linking across providers
      if (token.email && (trigger === 'signIn' || trigger === 'signUp')) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.id = dbUser.id;
          token.name = dbUser.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as 'FOUNDER' | 'INVESTOR' | 'ADMIN';
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
    async signIn({ user }) {
      // For OAuth providers, implement account linking
      // Note: Currently only credentials provider is implemented
      // OAuth providers can be added in the future
      if (user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          // User exists - link this OAuth account to existing user
          // The PrismaAdapter will automatically create the Account record
          // linking this OAuth provider to the existing User

          // Update user info if needed (name from OAuth profile)
          if (user.name && user.name !== existingUser.name) {
            await prisma.user.update({
              where: { email: user.email },
              data: { name: user.name },
            });
          }

          // IMPORTANT: Set user.id to existing user's ID for proper account linking
          user.id = existingUser.id;
        } else {
          // New OAuth user - create with default INVESTOR role
          // Special case: if email is scprime@foundersfund.com, assign ADMIN role
          const role =
            user.email.toLowerCase() === 'scprime@foundersfund.com' ? 'ADMIN' : 'INVESTOR';

          const newUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || user.email.split('@')[0],
              role,
              passwordHash: null, // OAuth users don't have passwords
            },
          });

          user.id = newUser.id;
        }
      }

      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
