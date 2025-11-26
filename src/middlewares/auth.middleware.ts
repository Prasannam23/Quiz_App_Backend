import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  // Get token from Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.split(' ')[1]; // Extract token after "Bearer"
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET) as { id: string; role: string };
    (req as any).user = decoded; // attach decoded user to request
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired token" });
    return;
  }
};

export const allowRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden: Role not authorized" });
      return;
    }
    next();
  };
};
