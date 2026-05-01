import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import * as cookie from "cookie";
import { createRouter, publicQuery } from "./middleware";
import { collections, getNextId, nowIso } from "./queries/connection";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";
import { Session } from "@contracts/constants";

const LOCAL_AUTH_SECRET = new TextEncoder().encode(
  env.appSecret || "ownlist-local-auth-secret-key-2024"
);

async function signLocalToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: "local" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(LOCAL_AUTH_SECRET);
}

export async function verifyLocalToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, LOCAL_AUTH_SECRET, { clockTolerance: 60 });
    const userId = payload.sub;
    if (!userId || typeof userId !== "string") return null;
    return { userId };
  } catch {
    return null;
  }
}

export const localAuthRouter = createRouter({
  signup: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const localUsers = await collections.localUsers();
      const existing = await localUsers.findOne({ email: input.email });
      if (existing) {
        throw new Error("Email already registered");
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const id = await getNextId("local_users");
      const result = await localUsers.insertOne({
        id,
        email: input.email,
        passwordHash,
        name: input.name,
        role: "user",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });

      if (!result.acknowledged) {
        throw new Error("Failed to create user");
      }
      const userId = String(id);
      const token = await signLocalToken(userId);

      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: 7 * 24 * 60 * 60,
        })
      );

      return { success: true, userId };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const localUsers = await collections.localUsers();
      const user = await localUsers.findOne({ email: input.email });

      if (!user) {
        throw new Error("Invalid email or password");
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new Error("Invalid email or password");
      }

      const token = await signLocalToken(String(user.id));

      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: 7 * 24 * 60 * 60,
        })
      );

      return { success: true, userId: String(user.id) };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const cookies = cookie.parse(ctx.req.headers.get("cookie") || "");
    const token = cookies[Session.cookieName];
    if (!token) return null;

    const claim = await verifyLocalToken(token);
    if (!claim) return null;

    const localUsers = await collections.localUsers();
    const userId = Number(claim.userId);
    if (!Number.isFinite(userId)) return null;
    return await localUsers.findOne({ id: userId });
  }),

  logout: publicQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      })
    );

    return { success: true };
  }),
});