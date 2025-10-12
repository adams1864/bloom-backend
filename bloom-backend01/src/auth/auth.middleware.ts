import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { auth as betterAuthInstance } from "./betterAuth.js";

export interface AuthRequest extends Request {
  user?: any;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const secret: string = (process.env.JWT_SECRET ?? "dev-secret");

  try {
    // If better-auth provides a session verification API, use it
    const a = betterAuthInstance as any;
    if (a && a.api) {
      // prefer documented getSession API
      if (typeof a.api.getSession === "function") {
        try {
          const session = await a.api.getSession({ token });
          if (session) {
            req.user = session?.user ?? session;
            return next();
          }
        } catch (e) {
          // ignore, fall through
        }
      }

      if (typeof a.api.getSessionFromToken === "function") {
        try {
          const session = await a.api.getSessionFromToken(token);
          if (session) {
            req.user = session?.user ?? session;
            return next();
          }
        } catch (e) {
          // ignore, fall through
        }
      }

      // use internal adapter to look up session by token
      if (a.$context) {
        const ctx = typeof a.$context.then === "function" ? await a.$context : a.$context;
        if (ctx?.internalAdapter && typeof ctx.internalAdapter.findSession === "function") {
          const sessionResult = await ctx.internalAdapter.findSession(token);
          if (sessionResult?.session) {
            const expiresAt = sessionResult.session.expiresAt instanceof Date
              ? sessionResult.session.expiresAt
              : sessionResult.session.expiresAt
                ? new Date(sessionResult.session.expiresAt as any)
                : undefined;

            if (expiresAt && expiresAt < new Date()) {
              return res.status(401).json({ message: "Session expired" });
            }

            req.user = sessionResult.user ?? sessionResult.session.user;
            return next();
          }
        }
      }
    }

    // As a last resort, attempt JWT validation for tokens issued outside of Better Auth
    const payload = jwt.verify(token, secret);
    req.user = payload as any;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
