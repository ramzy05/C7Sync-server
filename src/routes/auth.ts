import express from 'express';
import { login, register, resetPassword, forgotPassword, verifyOTP, sendOTP } from '../controllers/auth';


const router = express.Router();

router.post('/login', login);
router.post('/register', register,sendOTP);
router.post('/send-otp', sendOTP);
router.post('/verify', verifyOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
