import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { verifyLocalToken } from "./local-auth-router";
import { collections } from "./queries/connection";
import * as cookie from "cookie";
import { Session } from "@contracts/constants";

export type UnifiedUser = {
  id: number;
  name: string | null;
  email: string | null;
  avatar: string | null;
  bio: string | null;
  role: "user" | "admin";
  authType: "oauth" | "local";
  createdAt: string;
};

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: UnifiedUser;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    const cookies = cookie.parse(opts.req.headers.get("cookie") || "");
    const token = cookies[Session.cookieName];
    if (token) {
      const claim = await verifyLocalToken(token);
      if (claim) {
        const userId = Number(claim.userId);
        if (!Number.isFinite(userId)) return ctx;
        const localUser = await (await collections.localUsers()).findOne({ id: userId });
        if (localUser) {
          ctx.user = {
            id: localUser.id ?? userId,
            name: localUser.name ?? null,
            email: localUser.email ?? null,
            avatar: localUser.avatar ?? null,
            bio: localUser.bio ?? null,
            role: (localUser.role as "user" | "admin") ?? "user",
            authType: "local",
            createdAt: localUser.createdAt ?? new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Local auth failed
  }

  return ctx;
}
