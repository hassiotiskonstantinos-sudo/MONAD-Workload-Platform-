import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "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",
    }),
  ],
});

export { handler as GET, handler as POST };
