import express from 'express';
import {
  getArtworks,
  getFeaturedArtworks,
  getLatestArtworks,
  getArtworkById,
  getUserArtworks,
  createArtwork,
  updateArtwork,
  deleteArtwork,
  likeArtwork,
  seedDatabase
} from '../controllers/artworkController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getArtworks);
router.get('/featured', getFeaturedArtworks);
router.get('/latest', getLatestArtworks);
router.get('/:id', getArtworkById);

// Protected routes
router.get('/user/:userId', authMiddleware, getUserArtworks);
router.post('/', authMiddleware, createArtwork);
router.put('/:id', authMiddleware, updateArtwork);
router.delete('/:id', authMiddleware, deleteArtwork);
router.post('/:id/like', authMiddleware, likeArtwork);

// Seed route (keep it here for now)
router.post('/seed', seedDatabase);

export default router;