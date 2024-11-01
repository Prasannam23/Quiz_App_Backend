import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'default_secret';

export const generateToken = (payload: { id: string; role: string }): string => {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
  console.log(SECRET)
  return jwt.verify(token, SECRET);
};
