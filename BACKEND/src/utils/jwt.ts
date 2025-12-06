import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || 'your-secret-key';

export interface JwtPayload {
  id: string;
  email: string;
}

export const generateToken = (payload: JwtPayload): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
};

