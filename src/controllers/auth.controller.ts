import { Request, Response, CookieOptions } from "express";
import prisma from "../config/db";
import { hashPassword, comparePassword } from "../util/hash";
import { generateToken } from "../util/jwt";

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true, // must be https
  sameSite: "none",
  domain: "quizappbackend.duckdns.org",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      res.status(400).json({ error: "Email, password, and role are required" });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, role },
    });

    const token = generateToken({ id: user.id, role: user.role });

    res.cookie("token", token, COOKIE_OPTIONS);

    res.status(201).json({
      message: "Registered successfully",
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const roleParam = req.query.role as string;

    if (!email || !password || !roleParam) {
      res.status(400).json({ error: "Email, password, and role are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (user.role !== roleParam.toUpperCase()) {
      res.status(403).json({ error: `Access denied for ${roleParam} portal` });
      return;
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.cookie("token", token, COOKIE_OPTIONS);

    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(200).json({ message: "Logged out successfully" });
};
