import express from 'express';
import authRouter from './auth'
import userRouter from './user'

const router = express.Router();

router.use('/api/v1/auth',authRouter)
router.use('/api/v1/profile',userRouter)

export default router