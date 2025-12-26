import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config';

export const hashPassword = async (password: string) => {
    const salt = await bcrypt.genSalt(8);
    return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string) => {
    return bcrypt.compare(password, hash);
};

export const generateToken = (payload: object) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET);
};
