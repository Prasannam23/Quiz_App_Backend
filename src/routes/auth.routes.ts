import express from 'express';
import { verifyToken, allowRoles } from '../middlewares/auth.middleware';
import { register, login, logout } from '../controllers/auth.controller';

const router = express.Router();


router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);


router.get('/student/dashboard', verifyToken, allowRoles(['STUDENT']), (req, res) => {
  res.send('Welcome student');
});


router.get('/teacher/dashboard', verifyToken, allowRoles(['TEACHER']), (req, res) => {
  res.send('Welcome teacher');
});


router.get('/admin', verifyToken, allowRoles(['ADMIN', 'SUPERADMIN']), (req, res) => {
  res.send('Admin access granted');
});

export default router;