import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { auth as betterAuthInstance } from "./betterAuth.js";

export interface AuthRequest extends Request {
  user?: any;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!process.env.REQUIRE_AUTH || process.env.REQUIRE_AUTH === "false") {
    // Auth temporarily disabled; continue without verifying tokens.
    return next();
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const secret: string = (process.env.JWT_SECRET ?? "dev-secret");

  try {
    const a = betterAuthInstance as any;
    if (a && a.api && typeof a.api.getSession === "function") {
      const session = await a.api.getSession({ token });
      if (session) {
        req.user = session?.user ?? session;
        return next();
      }
    }

    const payload = jwt.verify(token, secret);
    req.user = payload as any;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
