import { Router } from 'express';
import { getNearbyCafes } from '../controllers/cafeController.js';
import { validateCafeLocation } from '../middleware/validateCafeLocation.js';

const router = Router();

router.post('/nearby', validateCafeLocation, getNearbyCafes);

export default router;
