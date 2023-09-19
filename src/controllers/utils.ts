import { Request } from 'express';
import jwt,{Secret} from 'jsonwebtoken';
import { Types } from 'mongoose';
import { IUserDocument } from '../models/User';

export interface ReqBodyLogin {
	email: string;
	password: string;
}

export interface ReqBodyRegister {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
}

export interface MyRequest extends Request {
  user: IUserDocument;
	userId:any;
}

//func
export const signToken = (userId: Types.ObjectId | undefined) =>
	jwt.sign({ userId }, process.env.JWT_SECRET as Secret);
