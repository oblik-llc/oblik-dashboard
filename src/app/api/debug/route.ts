import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET ? "set" : "NOT SET",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "NOT SET",
      AUTH_URL: process.env.AUTH_URL ?? "NOT SET",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "NOT SET",
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "NOT SET",
      COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ? "set" : "NOT SET",
      COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET
        ? "set"
        : "NOT SET",
      COGNITO_ISSUER: process.env.COGNITO_ISSUER ?? "NOT SET",
      OBLIK_AWS_ACCESS_KEY_ID: process.env.OBLIK_AWS_ACCESS_KEY_ID
        ? "set"
        : "NOT SET",
      OBLIK_AWS_REGION: process.env.OBLIK_AWS_REGION ?? "NOT SET",
      NODE_ENV: process.env.NODE_ENV ?? "NOT SET",
    },
    timestamp: new Date().toISOString(),
  });
}
