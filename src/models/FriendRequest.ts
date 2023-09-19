import mongoose, { Model, model, Schema } from 'mongoose';

export interface IRequest {
	sender: mongoose.Types.ObjectId;
	recipient: mongoose.Types.ObjectId;
}

interface IRequestMethods {
	correctPassword(
		candidatePassword: string,
		userPassword: string | undefined
	): Promise<boolean>;
	correctOTP(
		candidateOTP: string,
		userOTP: string | undefined
	): Promise<boolean>;
	createPasswordResetToken(): string;
	changedPasswordAfter(timestamp: number): boolean;
}
// Create a new Model type that knows about IRequestMethods...
type FriendRequestModel = Model<IRequest, {}, IRequestMethods>;

const requestSchema = new Schema<IRequest, FriendRequestModel, IRequestMethods>(
	{
		sender: {
			type: mongoose.Schema.ObjectId,
      ref:'User'
		},
		recipient: {
			type: mongoose.Schema.ObjectId,
      ref:'User'
		},
	},
	{
		timestamps: true,
	}
);

const FriendRequest = model<IRequest, FriendRequestModel>('FriendRequest', requestSchema);

export default FriendRequest;