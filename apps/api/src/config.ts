import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
export const JWT_EXPIRES_IN = '1d';
