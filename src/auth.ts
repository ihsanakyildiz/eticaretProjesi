import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Facebook from "next-auth/providers/facebook";
import Apple from "next-auth/providers/apple";
import { compare } from "bcryptjs";
import { Role } from "@prisma/client";
import type { Provider } from "next-auth/providers";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { getMembershipFlags } from "@/lib/membership";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function oauthProvidersFromEnv(): Provider[] {
  const providers: Provider[] = [];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHub({
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET) {
    providers.push(
      Facebook({
        clientId: process.env.AUTH_FACEBOOK_ID,
        clientSecret: process.env.AUTH_FACEBOOK_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
    providers.push(
      Apple({
        clientId: process.env.AUTH_APPLE_ID,
        clientSecret: process.env.AUTH_APPLE_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  return providers;
}

export async function getEnabledOAuthProviderIds() {
  const flags = await getMembershipFlags();
  if (!flags.enabled) return [] as string[];

  const ids: string[] = [];
  if (flags.oauthGoogle && process.env.AUTH_GOOGLE_ID) ids.push("google");
  if (flags.oauthGithub && process.env.AUTH_GITHUB_ID) ids.push("github");
  if (flags.oauthFacebook && process.env.AUTH_FACEBOOK_ID) ids.push("facebook");
  if (flags.oauthApple && process.env.AUTH_APPLE_ID) ids.push("apple");
  return ids;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user?.password || !user.isActive) return null;

        const isValid = await compare(password, user.password);
        if (!isValid) return null;

        if (user.role === Role.MEMBER) {
          const flags = await getMembershipFlags();
          if (!flags.enabled) return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    ...oauthProvidersFromEnv(),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") {
        return true;
      }

      const flags = await getMembershipFlags();
      if (!flags.enabled) return false;

      const providerOk =
        (account.provider === "google" && flags.oauthGoogle) ||
        (account.provider === "github" && flags.oauthGithub) ||
        (account.provider === "facebook" && flags.oauthFacebook) ||
        (account.provider === "apple" && flags.oauthApple);

      if (!providerOk) return false;

      const email = user.email?.toLowerCase();
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (!existing.isActive || existing.role === Role.ADMIN) return false;

        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            userId: existing.id,
            type: account.type,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state:
              typeof account.session_state === "string" ? account.session_state : null,
          },
          create: {
            userId: existing.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state:
              typeof account.session_state === "string" ? account.session_state : null,
          },
        });

        user.id = existing.id;
        user.role = existing.role;
        return true;
      }

      const created = await prisma.user.create({
        data: {
          email,
          name: user.name ?? null,
          image: user.image ?? null,
          role: Role.MEMBER,
          emailVerified: new Date(),
          accounts: {
            create: {
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state:
                typeof account.session_state === "string" ? account.session_state : null,
            },
          },
        },
      });

      user.id = created.id;
      user.role = Role.MEMBER;
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.sub = user.id as string;
        token.role = user.role ?? Role.MEMBER;
      }

      // Eski JWT’lerde id yoksa sub’dan al
      if (!token.id && token.sub) {
        token.id = String(token.sub);
      }

      if (trigger === "update" && session?.user) {
        if (typeof session.user.name === "string") token.name = session.user.name;
        if (typeof session.user.image === "string") token.picture = session.user.image;
      }

      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: String(token.id) },
            select: { role: true, isActive: true, name: true, image: true, email: true },
          });
          if (!dbUser || !dbUser.isActive) {
            return {
              ...token,
              id: undefined,
              sub: undefined,
              role: undefined,
              email: undefined,
              name: undefined,
              picture: undefined,
            };
          }
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.picture = dbUser.image;
          token.email = dbUser.email;
        } catch (error) {
          // Geçici DB/Prisma hatasında oturumu silme — redirect döngüsünü önler
          console.error("auth jwt: user lookup failed", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ? String(token.id) : String(token.sub ?? "");
        if (token.role === Role.ADMIN || token.role === Role.MEMBER) {
          session.user.role = token.role;
        } else {
          session.user.role = Role.MEMBER;
        }
        if (token.name) session.user.name = String(token.name);
        if (token.email) session.user.email = String(token.email);
        if (token.picture) session.user.image = String(token.picture);
      }
      return session;
    },
  },
});
