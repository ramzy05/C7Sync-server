import User, { IUserDocument } from '../models/User';
import { NextFunction, Request, Response } from 'express';
import otpGenerator from 'otp-generator';
import { MyRequest, ReqBodyLogin, ReqBodyRegister, signToken } from './utils';
import jwt, { Secret } from 'jsonwebtoken';
import { Types } from 'mongoose';
import filterObj from '../utils/filterObj';
import FriendRequest from '../models/FriendRequest';

export const updateMe = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		console.log((req as MyRequest).user);
		const { user } = req as MyRequest;
		const filterBody = filterObj(
			req.body,
			'firstName',
			'lastName',
			'about',
			'avatar'
		);

		const updatedUser = await User.findByIdAndUpdate(user._id, filterBody, {
			new: true,
			runValidators: true,
		});

		res.status(200).json({
			status: 'success',
			data: updatedUser,
			message: 'Pofile updated successfully!',
		});
	} catch (error) {
		next(error);
	}
};

export const getUsers = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { user: currentUser } = req as MyRequest;
		/*const allUsers:IUserDocument[] = await User.find({
			verified: true,
		}).select('firstName lastName avatar _id');

		
		const remainingUsers = allUsers.filter(user=> !currentUser.friends.includes(user._id) && user._id.toString() !== currentUser._id.toString())
	*/
		const remainingUsers: IUserDocument[] = await User.find({
			verified: true,
			_id: { $nin: [...currentUser.friends, currentUser._id] },
		}).select('firstName lastName email avatar _id');

		res.status(200).json({
			status: 'success',
			data: remainingUsers,
			message: 'User found successfully!',
		});
	} catch (error) {}
};

export const getRequests = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		
		const { user: currentUser } = req as MyRequest;
		const requests = await FriendRequest.find({
			recipient: currentUser._id
		}).select('sender')
		.populate({
			path: 'sender',
			select: '_id lastName firstName avatar email'
	})
	
		res.status(200).json({
			status: 'success',
			data: requests,
			message: 'Friend requests found successfully!',
		});
	} catch (error) {
		console.log(error)
	}
};

export const getFriends = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { user: currentUser } = req as MyRequest;
	
		const userWithFriends = await User.findById(currentUser._id).select('friends').populate('friends', '_id firstName lastName email avatar');

		res.status(200).json({
			status: 'success',
			data: userWithFriends?.friends,
			message: 'Friend found successfully!',
		});
	} catch (error) {}
};
