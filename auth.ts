import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/** Only this Google account may edit Korean descriptions. */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "yjs@lnrgame.com";

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
