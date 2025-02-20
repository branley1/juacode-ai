// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabaseClient';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string };
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        if (error || !user) {
          throw new Error('Invalid email or password');
        }
        const valid = await bcrypt.compare(password, user.hashed_password);
        if (!valid) {
          throw new Error('Invalid email or password');
        }
        return { id: user.id, email: user.email, name: user.username };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as number;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

export default NextAuth(authOptions);
