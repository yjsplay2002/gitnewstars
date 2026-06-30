import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/** Keep only printable ASCII (guards against a BOM/whitespace sneaking in via env). */
function sanitize(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x21 && code <= 0x7e) out += ch;
  }
  return out;
}

/** Only this Google account may edit Korean descriptions. */
export const ADMIN_EMAIL = sanitize(process.env.ADMIN_EMAIL ?? "yjs@lnrgame.com");

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  trustHost: true,
  callbacks: {
    session({ session }) {
      // Expose an admin flag to the client based on the signed-in email.
      if (session.user) {
        (session.user as { isAdmin?: boolean }).isAdmin =
          session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      }
      return session;
    },
  },
});

/** Server-side guard: returns true only for the configured admin. */
export async function isAdminRequest(): Promise<boolean> {
  const session = await auth();
  return session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
