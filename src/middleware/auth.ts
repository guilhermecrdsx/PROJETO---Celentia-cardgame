import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { adminAuth } from '../lib/firebase-admin.ts';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'celentia-royal-sanctuary-secret-key-2026';
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  nickname?: string;
  authProvider: 'jwt' | 'firebase';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function signPlayerJwt(payload: { uid: string; email: string; nickname: string }): string {
  return jwt.sign(
    {
      uid: payload.uid,
      email: payload.email,
      nickname: payload.nickname,
      iss: 'celentia-auth',
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export async function verifyAuthToken(
  token: string
): Promise<AuthenticatedUser | null> {
  if (!token) return null;

  // 1. Try verifying as our own server-signed JWT first (fast synchronous check)
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      uid?: string;
      email?: string;
      nickname?: string;
      iss?: string;
    };
    if (decoded && decoded.uid && decoded.iss === 'celentia-auth') {
      return {
        uid: decoded.uid,
        email: decoded.email || '',
        nickname: decoded.nickname,
        authProvider: 'jwt',
      };
    }
  } catch {
    // Not a local JWT or expired; fall through to Firebase ID Token verification
  }

  // 2. Verify as a Firebase Auth ID Token (Google Sign-In)
  try {
    const decodedFirebase = await adminAuth.verifyIdToken(token);
    return {
      uid: decodedFirebase.uid,
      email: decodedFirebase.email || `${decodedFirebase.uid}@celentia.local`,
      nickname:
        decodedFirebase.name ||
        decodedFirebase.email?.split('@')[0] ||
        'Duelista',
      authProvider: 'firebase',
    };
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado: Token de acesso ausente.' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado: Token inválido.' });
  }

  const user = await verifyAuthToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }

  req.user = user;
  return next();
};
