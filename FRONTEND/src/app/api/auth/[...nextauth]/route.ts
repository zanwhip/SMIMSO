import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        emailOrPhone: { label: 'Email or Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.emailOrPhone || !credentials?.password) {
          return null;
        }

        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            emailOrPhone: credentials.emailOrPhone,
            password: credentials.password,
          });

          const { user, token } = response.data.data;

          if (user && token) {
            return {
              id: user.id,
              email: user.email || user.phone || '',
              name: `${user.first_name} ${user.last_name}`,
              image: user.avatar_url,
              accessToken: token,
              ...user,
            };
          }

          return null;
        } catch (error: any) {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.id = user.id;
        token.first_name = (user as any).first_name;
        token.last_name = (user as any).last_name;
        token.avatar_url = (user as any).avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).first_name = token.first_name;
        (session.user as any).last_name = token.last_name;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
