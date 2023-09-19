import User from '../models/User';
import { NextFunction, Request, Response } from 'express';
import otpGenerator from 'otp-generator';
import { MyRequest, ReqBodyLogin, ReqBodyRegister, signToken } from './utils';
import jwt, { Secret } from 'jsonwebtoken';
import mongoose from 'mongoose';
import filterObj from '../utils/filterObj';
import crypto from 'crypto';
import { sendEmail, EmailOptions } from '../services/mailer';
import resetPasswordHTML from '../templates/resetPassword';

// register a new user
export const register = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { email }: ReqBodyRegister = req.body;

		const filterBody = filterObj(req.body, 'firstName', 'lastName', 'password');
	

		// check if a verified user with this email exists
		const existingUser = await User.findOne({ email: email });

		if (existingUser && existingUser.verified) {
			return res.status(400).json({
				status: 'error',
				message: 'Email is already in use, please login',
			});
		} else if (existingUser) {
			await User.findOneAndUpdate({ email: email }, filterBody, {
				new: true,
				runValidators: true,
			});

			(req as MyRequest).userId = existingUser._id;
			next();
		} else {
			// if use record is not available in db
			const newUser = await User.create({ ...filterBody, email });

			//generate the OTP and send the email to user
			(req as MyRequest).userId = newUser._id;
			next();
		}
	} catch (error) {
		return next(error);
	}
};

export const sendOTP = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { userId }: { userId: mongoose.Types.ObjectId } = req as MyRequest;

		const newOtp = otpGenerator.generate(6, {
			lowerCaseAlphabets: false,
			upperCaseAlphabets: false,
			specialChars: false,
		});

		const otpExpiryTime = Date.now() + 10 * 60 * 100; //10 min after otp is sent

		const user = await User.findByIdAndUpdate(userId, {
			otp: newOtp,
			otpExpiryTime: otpExpiryTime,
		});
		// send mail
		const emailOptions: EmailOptions = {
			to: user?.email as string,
			subject: 'OTP for C7sync',
			html: `Your OPT is ${newOtp}. This is valid for 10 mins`,
		};
		// console.log(newOtp)
		sendEmail(emailOptions);

		res.status(200).json({
			status: 'success',
			message: 'OTP sent successfully!',
		});
	} catch (error) {
		next(error);
	}
};

export const verifyOTP = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { email, otp }: { email: string; otp: string } = req.body;

		const user = await User.findOne({
			email: email,
			otpExpiryTime: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({
				status: 'error',
				message: 'Email is invalid or OTP expired',
			});
		}
		if (!(await user?.correctOTP(otp, user?.otp))) {
			return res.status(400).json({
				status: 'error',
				message: 'OTP is incorrect',
			});
		}
		//OTP is correct

		user.verified = true;
		user.otp = undefined;

		await user.save({ validateModifiedOnly: true });
		const token = signToken(user._id);

		return res.status(200).json({
			status: 'success',
			message: 'OTP verified successfully',
			token,
			userId:user._id
		});
	} catch (error) {
		next(error);
	}
};

// login an user
export const login = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { email, password }: ReqBodyLogin = req.body;

		if (!email || !password) {
			return res.status(400).json({
				status: 'error',
				message: 'Both email and password are required',
			});
		}
		const user = await User.findOne({ email: email }).select('+password');
		if (!user) {
			return res.status(400).json({
				status: 'error',
				message: 'Email is incorrect',
			});
		}
		if (!(await user?.correctPassword(password, user.password))) {
			return res.status(400).json({
				status: 'error',
				message: 'Password is incorrect',
			});
		}

		const token: string = signToken(user._id);

		return res.status(200).json({
			status: 'success',
			message: 'Logged in successfully',
			token,
			userId:user._id,
		});
	} catch (error) {
		next(error);
	}
};

export const protect = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		// getting token (jwt) and check if it's there
		let token: string;

		if (
			req.headers.authorization &&
			req.headers.authorization.startsWith('Bearer')
		) {
			token = req.headers.authorization.split(' ')[1];
		} else if (req.cookies?.jwt) {
			token = req.cookies.jwt;
		} else {
			return res.status(400).json({
				status: 'error',
				message: 'You are not loggeg in! Please log in to get access',
			});
		}

		// 2) verification of token

		const decoded: any = jwt.verify(token, process.env.JWT_SECRET as Secret);

		// 3) check if user still exist

		const user = await User.findById(decoded.userId);

		if (!user) {
			return res.status(400).json({
				status: 'error',
				message: "The user doesn't exist",
			});
		}

		// 4) check if user changed their password after token was issued

		if (user.changedPasswordAfter(decoded.iat)) {
			return res.status(400).json({
				status: 'error',
				message: 'User recently updated password! Please log in again',
			});
		}

		//
		(req as MyRequest).user = user;
		next();
	} catch (error) {
		console.log(error);
		next();
	}
};

export const forgotPassword = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	// 1) Get users email
	const email: string = req.body.email;
	const user = await User.findOne({ email: email });

	if (!user) {
		return res.status(400).json({
			status: 'error',
			message: 'There is no user with given email address',
		});
	}

	// 2) Generate the random reset token
	const resetToken = user.createPasswordResetToken();
	const resetURL = `http://localhost:5173/auth/new-password?token=${resetToken}`;
	try {
		// TODO Send email with reset url
		console.log('reset token: ',resetToken)
		// send mail
		const emailOptions: EmailOptions = {
			to: user?.email as string,
			subject: 'Reset password for C7sync',
			// html: `Click to this link to reset your password: ${resetURL}`,
			html: resetPasswordHTML(user.firstName, resetURL),
		};
		sendEmail(emailOptions);

		res.status(200).json({
			status: 'success',
			message: 'Reset password link sent to email',
		});
	} catch (error) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;

		await user.save({ validateBeforeSave: false });
		res.status(500).json({
			status: 'error',
			message: 'There was an error sending email, Please try again later',
		});
	}
};

export const resetPassword = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		//1 get the user
		const hashedToken = crypto
			.createHash('sha256')
			.update(req.body.token)
			.digest('hex');

		const user = await User.findOne({
			passwordResetToken: hashedToken,
			passwordResetExpires: { $gt: Date.now() },
		});
		// 2) if the token has expired or user it out of time window
		if (!user) {
			return res.status(400).json({
				status: 'error',
				message: 'Token is Invalid or Expired',
			});
		}

		// 3) update user password and set resetToken & expiry to undefined

		user.password = req.body.password;
		user.passwordConfirm = req.body.passwordConfirm;
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;

		await user.save();

		// 4) Log in the user and send new JWT

		// TODO send the email to user informing about password reset

		const token: string = signToken(user._id);
		
		return res.status(200).json({
			status: 'success',
			message: 'Password reseted successfully',
			token,
			userId:user._id,

		});
	} catch (error) {
		console.log(error)
	}
};
