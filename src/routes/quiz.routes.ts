import express from 'express';
import { verifyToken, allowRoles } from '../middlewares/auth.middleware';
import { createQuiz, getQuiz, getQuizById } from '../controllers/quiz.controller';

const router = express.Router();


router.post('/create', verifyToken, allowRoles(['TEACHER']), createQuiz);
router.get('/get', verifyToken, allowRoles(['TEACHER', 'STUDENT', 'ADMIN', 'SUPERADMIN']), getQuiz);
router.get('/get/:quizId', verifyToken, allowRoles(['TEACHER', 'STUDENT', 'ADMIN', 'SUPERADMIN']), getQuizById);
router.get('/:quizId', verifyToken, allowRoles(['TEACHER', 'STUDENT', 'ADMIN', 'SUPERADMIN']), getQuizById);




export default router;