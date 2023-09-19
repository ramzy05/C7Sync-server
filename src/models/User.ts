import mongoose, { Model, model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser {
	firstName: string;
	lastName: string;
	avatar?: string | undefined;
	email: string;
	password?: string;
	socketId?: string;
	passwordConfirm?: string;
	verified?: Boolean;
	passwordChangedAt?: Date;
	passwordResetToken?: string;
	passwordResetExpires?: string | undefined;
	otp: string | undefined;
	otpExpiryTime: Date;
	friends: mongoose.Types.ObjectId[];
	status:string
}

export interface IUserDocument extends IUser, IUserMethods, mongoose.Document {} 

interface IUserMethods {
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
// Create a new Model type that knows about IUserMethods...
type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
	{
		firstName: {
			type: String,
			required: [true, 'First Name is required'],
		},
		lastName: {
			type: String,
			required: [true, 'Last Name is required'],
		},
		avatar: {
			type: String,
		},
		email: {
			type: String,
			required: [true, 'Email is required'],
			validate: {
				validator: (email: string) => {
					return String(email)
						.toLowerCase()
						.match(
							/^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/
						);
				},
				message: (props) => `'Email ${props.value} is invalid'`,
			},
		},
		password: {
			type: String,
		},
		passwordConfirm: {
			type: String,
		},
		passwordChangedAt: {
			type: Date,
		},
		passwordResetToken: {
			type: String,
		},
		passwordResetExpires: {
			type: String,
		},
		verified: {
			type: Boolean,
			default: false,
		},
		otp: {
			type: String,
		},
		otpExpiryTime: {
			type: Date,
		},
		socketId: {
			type: String,
		},
		friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		status:{
			type:String,
			enum:['Online', 'Offline']
		}
	},
	{
		timestamps: true,
	}
);

// userSchema.pre('save', async function (next) {
// 	if (!this.isModified('otp')) return next();
// 	console.log('encyprt')

// 	// hash the otp with the cost of 12
// 	if (!(this.otp === undefined)) {
// 		this.otp = await bcrypt.hash(this.otp, 12);
// 	}

// 	next();
// });

userSchema.pre('findOneAndUpdate', async function (next) {
	const update: any = this.getUpdate();
	if (!update || !update.otp) return next();
	update.otp = await bcrypt.hash(update.otp, 12);
	next();
});

userSchema.pre('save', async function (next) {
	// Only run this function if password was actually modified
	if (!this.isModified('password') || !this.password) return next();

	// Hash the password with cost of 12
	this.password = await bcrypt.hash(this.password, 12);

	next();
});

userSchema.pre('save', async function (next) {
	// Only run this function if password was actually modified
	if (!this.isModified('passwordConfirm') || !this.passwordConfirm)
		return next();

	// Hash the password with cost of 12
	this.passwordConfirm = await bcrypt.hash(this.passwordConfirm, 12);

	next();
});

userSchema.pre('save', function (next) {
	if (!this.isModified('password') || this.isNew || !this.password)
		return next();

	this.passwordChangedAt = new Date(Date.now() - 1000);
	next();
});

//methods
userSchema.method(
	'correctOTP',
	async function correctPassword(candidateOTP: string, userOTP: string) {
		return await bcrypt.compare(candidateOTP, userOTP);
	}
);

userSchema.method(
	'correctPassword',
	async function correctPassword(
		candidatePassword: string,
		userPassword: string
	) {
		return await bcrypt.compare(candidatePassword, userPassword);
	}
);

userSchema.method(
	'createPasswordResetToken',
	function createPasswordResetToken() {
		const resetToken = crypto.randomBytes(32).toString('hex');

		this.passwordResetToken = crypto
			.createHash('sha256')
			.update(resetToken)
			.digest('hex');

		this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //10min
		this.save();

		return resetToken;
	}
);

userSchema.method(
	'changedPasswordAfter',
	function changedPasswordAfter(timestamp: number) {
		 if (this.passwordChangedAt) {
        const changedTimestamp = this.passwordChangedAt.getTime() / 1000;
        return changedTimestamp > timestamp;
    }
    return false; // If passwordChangedAt is not set, consider it as not changed
	}
);

const User = model<IUser, UserModel>('User', userSchema);

export default User;
