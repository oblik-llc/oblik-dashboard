export { auth as middleware } from "@/lib/auth/config";

export const config = {
  matcher: [
    "/((?!api/auth|api/debug|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
