import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import passport from 'passport';
import prisma from '../../config/db';
import { Role } from '@prisma/client';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: 'http://localhost:8000/api/auth/google/callback',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        const avatar = profile.photos?.[0].value;
        const googleId = profile.id;

        const roleFromQuery = (req.query.state as Role) || Role.STUDENT;

        if (!email) return done(null, false);

        let user = await prisma.user.findUnique({ where: { email } });

      
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              googleId,
              avatar,
              role: roleFromQuery,
            },
          });
        } else {
         
          if (user.role !== roleFromQuery) {
            user = await prisma.user.update({
              where: { email },
              data: { role: roleFromQuery },
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
