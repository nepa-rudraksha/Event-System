import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  name: string;
};

export function signToken(user: AuthUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "12h" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    console.log("[requireAuth] Decoded token:", { id: decoded.id, email: decoded.email, role: decoded.role, name: decoded.name });
    (req as Request & { user?: AuthUser }).user = decoded;
    next();
  } catch (error: any) {
    console.error("[requireAuth] Token verification failed:", error.message);
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
