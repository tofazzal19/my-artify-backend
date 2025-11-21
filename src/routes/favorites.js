import express from 'express';
import {
  getFavorites,
  checkFavorite,
  addFavorite,
  removeFavorite
} from '../controllers/favoriteController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/:userId', authMiddleware, getFavorites);
router.get('/check/:artworkId', authMiddleware, checkFavorite);
router.post('/', authMiddleware, addFavorite);
router.delete('/:artworkId', authMiddleware, removeFavorite);

export default router;