import { Router } from 'express';
import { getNearbyCafes, getSavedCafes, setCafeSaved, submitCafeCheckin } from '../controllers/cafeDatabaseController.js';
import { validateCafeLocation } from '../middleware/validateCafeLocation.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/nearby', validateCafeLocation, getNearbyCafes);
router.get('/saved', requireAuth, getSavedCafes);
router.put('/:cafeId/saved', requireAuth, setCafeSaved);
router.post('/:cafeId/checkins', requireAuth, submitCafeCheckin);

export default router;
