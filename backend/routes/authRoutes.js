import { Router } from 'express';
import { getCurrentUser, refreshSession, signIn, signOut, signUp, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/refresh', refreshSession);
router.get('/me', requireAuth, getCurrentUser);
router.put('/profile', requireAuth, updateProfile);
router.post('/signout', requireAuth, signOut);

export default router;