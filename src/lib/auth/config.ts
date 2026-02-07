import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";

import type { DefaultSession, NextAuthConfig } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      groups: string[];
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    groups: string[];
    refresh_token?: string;
    expires_at?: number;
  }
}

const config: NextAuthConfig = {
  providers: [
    Cognito({
      clientId: process.env.COGNITO_CLIENT_ID,
      clientSecret: process.env.COGNITO_CLIENT_SECRET,
      issuer: process.env.COGNITO_ISSUER,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, account, profile }) {
      if (account && profile) {
        token.groups =
          (profile["cognito:groups"] as string[] | undefined) ?? [];
        token.refresh_token = account.refresh_token ?? undefined;
        token.expires_at = account.expires_at ?? undefined;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.groups = token.groups;
      return session;
    },
    authorized({ auth }) {
      return !!auth;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
