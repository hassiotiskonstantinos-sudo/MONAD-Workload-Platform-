import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

console.log('[NEXTAUTH ROUTE] Handler loaded. Providers:', authOptions.providers?.length ?? 0);
console.log('[NEXTAUTH ROUTE] Has adapter:', !!authOptions.adapter);
console.log('[NEXTAUTH ROUTE] Session strategy:', authOptions.session?.strategy);
console.log('[NEXTAUTH ROUTE] Has secret:', !!authOptions.secret);

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
