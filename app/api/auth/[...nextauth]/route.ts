import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { GET, POST } from '../../../../auth';

const prisma = new PrismaClient();

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔍 authorize appelé avec :", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Email ou mot de passe manquant");
          return null;
        }

        try {
          // 🔍 Chercher l'utilisateur dans la base
          let user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          // 👤 Si l'utilisateur n'existe pas, on le crée automatiquement
          if (!user) {
            console.log("👤 Utilisateur introuvable, création automatique...");
            user = await prisma.user.create({
              data: {
                email: credentials.email as string,
                name: (credentials.email as string).split("@")[0], // Nom basé sur l'email
                companyName: "Ma société",
              },
            });
            console.log("✅ Utilisateur créé avec succès :", user.email);
          }

          console.log("👤 Utilisateur trouvé :", user);

          // ✅ Retourner l'utilisateur pour la session
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("🔥 Erreur dans authorize :", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

export { GET, POST };