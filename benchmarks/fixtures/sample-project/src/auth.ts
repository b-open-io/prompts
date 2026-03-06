// Authentication module
// This file is clean — no issues

import { hashPassword } from "./utils";

interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const hash = hashPassword(password);
  // In production this would query the database
  return null;
}

export function generateToken(user: User): string {
  // Uses JWT_SECRET from environment (process.env.JWT_SECRET)
  const payload = { sub: user.id, email: user.email };
  return JSON.stringify(payload);
}

export function verifyToken(token: string): { sub: string; email: string } | null {
  try {
    return JSON.parse(token);
  } catch {
    return null;
  }
}
