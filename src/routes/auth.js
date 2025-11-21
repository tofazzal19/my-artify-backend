import express from 'express';
import { register, login, mockSocialLogin } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/mock-social', mockSocialLogin);

export default router;