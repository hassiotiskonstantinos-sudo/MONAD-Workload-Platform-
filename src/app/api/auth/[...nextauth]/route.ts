import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = (req: Request, ctx: { params: { nextauth: string[] } }) => {
  return NextAuth(req as any, ctx as any, authOptions());
};

export { handler as GET, handler as POST };
