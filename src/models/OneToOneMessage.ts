import mongoose, { Model, model, Schema } from 'mongoose';

export interface IMessage {
  to: mongoose.Types.ObjectId | any;
  from: mongoose.Types.ObjectId | any;
  type: string; // Consider using an enum for valid message types
  created_at?: Date;
  text?: string; // Optional text content
  file?: string; // Optional file path or URL
}

export interface IOneToOneMessage {
	participants: mongoose.Types.ObjectId[];
  messages:IMessage[]
}

interface IOneToOneMessageMethods {
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
// Create a new Model type that knows about IOneToOneMessageMethods...
type OneToOneMessageModel = Model<IOneToOneMessage, {}, IOneToOneMessageMethods>;

const oneToOneMessageSchema = new Schema<IOneToOneMessage, OneToOneMessageModel, IOneToOneMessageMethods>(
	{
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    messages:[
      {
        to:{
          type:mongoose.Schema.ObjectId, ref:'User'
        },
        from:{
          type:mongoose.Schema.ObjectId, ref:'User'
        },
        type:{
          type: String, enum:['Text', 'Media','Document', 'Link']
        },
        created_at:{
          type:Date,
          default: Date.now()
        },
        text:{
          type:String,
        },
        file:{
          type:String
        }
      }
    ]
	},
	{
		timestamps: true,
	}
);

const OneToOneMessage = model<IOneToOneMessage, OneToOneMessageModel>('OneToOneMessage', oneToOneMessageSchema);
export type OneToOneMessageDocument = IOneToOneMessage & mongoose.Document;
export type ObjectId = mongoose.Types.ObjectId;
export default OneToOneMessage;