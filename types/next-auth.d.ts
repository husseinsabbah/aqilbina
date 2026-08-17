// types/next-auth.d.ts
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      trade: string;
      companyName?: string | null; // ✅ Ajout
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
    trade: string;
    companyName?: string | null; // ✅ Ajout
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    trade: string;
    companyName?: string | null; // ✅ Ajout
  }
}