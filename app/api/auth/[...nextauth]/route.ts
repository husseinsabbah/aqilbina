// app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';


export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🔍 Tentative de connexion avec :', credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Email ou mot de passe manquant');
          throw new Error('Email et mot de passe requis');
        }

        console.log('📡 Recherche de l\'utilisateur dans la base...');

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.log('❌ Utilisateur non trouvé pour l\'email :', credentials.email);
          throw new Error('Email ou mot de passe incorrect');
        }

        console.log('✅ Utilisateur trouvé :', user.email);
        console.log('🔐 Comparaison du mot de passe...');

        const isValid = await bcrypt.compare(credentials.password, user.password);

        console.log('✅ Mot de passe valide ?', isValid);

        if (!isValid) {
          console.log('❌ Mot de passe incorrect pour :', credentials.email);
          throw new Error('Email ou mot de passe incorrect');
        }

        console.log('🎉 Connexion réussie pour :', credentials.email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          trade: user.trade,
          companyName: user.companyName, // ✅ Ajout
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.trade = user.trade;
        token.companyName = user.companyName; // ✅ Ajout
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.trade = token.trade as string;
        session.user.companyName = token.companyName as string; // ✅ Ajout
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };