import { UserRole } from '@prisma/client';
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}
