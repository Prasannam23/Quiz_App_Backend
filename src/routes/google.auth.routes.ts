import { Router, Request, Response } from 'express';
import passport from 'passport';
import { generateToken } from '../util/jwt';
import { CookieOptions } from 'express';
import { AuthUser } from '../types/auth';

const router = Router();

const COOKIE_OPTIONS: CookieOptions = {

  httpOnly: true,                         // allow frontend JS to read token
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'none',                         // allow cross-origin POST/GET
  maxAge: 7 * 24 * 60 * 60 * 1000,         // 7 days
};




router.get('/google', (req, res, next) => {
  const { role } = req.query;
  const redirectUrl = `/api/auth/google/redirect?state=${role}`;
  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: role as string, 
  })(req, res, next);
});



router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false,
  }),
  (req: Request, res: Response) => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      return res.redirect('http://localhost:3000/login?error=OAuthFailed');
    }
   

    const token = generateToken({ id: user.id, role: user.role });
    res.cookie('token', token, COOKIE_OPTIONS);
    console.log("////////////1")
    const redirectPath = user.role === 'STUDENT' ? '/student' : '/dashboard';
    return res.redirect(`http://localhost:3000${redirectPath}`);
  }
);

export default router;
