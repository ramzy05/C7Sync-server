import http from 'http';
import app from './app';
import 'dotenv/config';
import connectDB from './db/connect';

import { Server } from 'socket.io';
import User from './models/User';
import FriendRequest from './models/FriendRequest';
import path from 'path';
import OneToOneMessage, {
	IMessage,
	OneToOneMessageDocument,
} from './models/OneToOneMessage';
import { ObjectId } from 'mongoose';

process.on('uncaughtException', (err: Error) => {
	process.exit(1);
});

const server = http.createServer(app);

const io = new Server(server, {
	cors: {
		// origin: 'http://localhost:5173',
		origin: '*',
		methods: ['GET', 'POST'],
	},
});

const port: string = process.env.PORT || '8000';

const startServer = async () => {
	try {
		await connectDB(
			process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/c7sync'
		);
		server.listen(port, () => {
			console.log(`server is listenning on port ${port}`);
		});

		io.on('connection', async (socket) => {
			// console.log(JSON.stringify(socket.handshake.query))
			// console.log(socket)
			const userId = socket.handshake.query['userId'];
			const socketId = socket.id;

			console.log(`User connected ${socketId}`);

			if (Boolean(userId)) {
				await User.findByIdAndUpdate(userId, {
					socketId,
					status: 'Online',
				});
			}

			// eventlistenner on socket
			socket.on('friendRequest', async (data, callback) => {
				const toUser = await User.findById(data.to).select('socketId');
				const fromUser = await User.findById(data.from).select('socketId');

				// Check if a friend request already exists
				const existingRequest = await FriendRequest.findOne({
					sender: data.from,
					recipient: data.to,
				});

				if (!existingRequest) {
					// Create a friend request only if it doesn't exist
					await FriendRequest.create({
						sender: data.from,
						recipient: data.to,
					});

					// emit event => "newFriendRequest"
					io.to(toUser?.socketId as string | string[]).emit(
						'newFriendRequest',
						{
							//
							message: 'New friend request received',
						}
					);

					// emit event => "requestSent"
					io.to(fromUser?.socketId as string | string[]).emit('requestSent', {
						//
						message: 'Request sent successfully',
					});
				} else {
					// emit event => "requestSent"
					io.to(fromUser?.socketId as string | string[]).emit('requestSent', {
						//
						message: "There's already friend request with this user",
					});
				}
			});

			socket.on('acceptRequest', async (data) => {
				const requestDoc = await FriendRequest.findById(data.requestId);

				// requestId
				const sender = await User.findById(requestDoc?.sender);
				const receiver = await User.findById(requestDoc?.recipient);

				if (requestDoc?.recipient) {
					sender?.friends.push(requestDoc.recipient);
					await sender?.save({ validateModifiedOnly: true });
				}

				if (requestDoc?.sender) {
					receiver?.friends.push(requestDoc.sender);
					await receiver?.save({ validateModifiedOnly: true });
				}
				await FriendRequest.findByIdAndDelete(data.requestId);

				io.to([sender?.socketId, receiver?.socketId] as string[]).emit('requestAccepted', {
					message: 'Friend request accepted',
				});

				// io.to(receiver?.socketId as string | string[]).emit('requestAccepted', {
				// 	message: 'Friend request accepted',
				// });
			});

			socket.on(
				'getDirectConversations',
				async ({ userId }, callback: (data: any) => void) => {
					const existingConversations = await OneToOneMessage.find({
						participants: { $all: [userId] },
					}).populate(
						'participants',
						'firstName lastName email avatar _id status'
					);

					callback(existingConversations);
				}
			);

			socket.on('startConversation', async (data) => {
				// data: {to, from}
				const { to, from } = data;
				//check if there is any existing conversation between these users
				const existingConversation = await OneToOneMessage.find({
					participants: { $size: 2, $all: [to, from] },
				}).populate(
					'participants',
					'firstName lastName email avatar _id status'
				);

				console.log(existingConversation[0], 'Existing Conversation');

				// if no existingConversation
				if (existingConversation.length === 0) {
					let newChat = await OneToOneMessage.create({
						participants: [to, from],
					});
					let newChatPop = await OneToOneMessage.findById(newChat._id).populate(
						'participants',
						'firstName lastName email avatar _id status'
					);
					socket.emit('startChat', newChatPop);
				}
				// if there is existingConversation
				else {
					socket.emit('startChat', existingConversation[0]);
				}
			});

			socket.on(
				'getMessage',
				async (data: any, callback: (data: IMessage[]) => void) => {
					const { messages } = (await OneToOneMessage.findById(
						data.conversationId
					).select('messages')) as OneToOneMessageDocument;

					callback(messages);
				}
			);

			// handle text/link message
			socket.on('textMessage', async(data:{to:ObjectId, from:ObjectId, conversationId:ObjectId, message:string,type:string}) => {
				// console.log('Received Message: ', data);

				// data :{to, from, text}
				const { to, from, message, conversationId, type } = data;
				const toUser = await User.findById(to)
				const fromUser = await User.findById(from)
				console.log(`from: ${fromUser?.email} to:${toUser?.email}`)
				
				const newMessage: IMessage = {
					to,
					from,
					type,
					text: message,
					created_at: new Date()
				};
				// create a new conversation if it doesn"t exist yet or add new message to messages list
				const chat = await OneToOneMessage.findById(conversationId)
				chat?.messages.push(newMessage)
				// save to db
				await chat?.save()

				// emit newMessage -> toUser & fromUser
				io.to([toUser?.socketId, fromUser?.socketId] as string[]).emit('newMessage',{
					conversationId,
					message:newMessage
				})

				// emit newMessage -> fromUser
			});

			// handle files message
			// handle text/link message
			socket.on('fileMessage', (data) => {
				console.log('Received message: ', data);

				// data :{to, from, text, file}

				// get the file extension
				const fileExtension = path.extname(data.file.name);

				// generate a unique filename
				const fileName = `${Date.now()}_${Math.floor(
					Math.random() * 10000
				)}${fileExtension}`;

				// upload file to AWS s3

				// create a new conversation if it doesn"t exist yet or add new message to messages list

				// save to db

				// emit incomninMessage -> toUser

				// emit outgoingMessage -> fromUser
			});

			socket.on('end', async (data) => {
				// find user by _id and set status to Offline
				if (data?.userId) {
					await User.findByIdAndUpdate(data.userId, { status: 'Offline' });
				}

				// TODO => broadcast user_disconnected
				console.log('closing connection');
				socket.disconnect();
			});
		});
	} catch (error) {
		console.log(error);
	}
};

startServer();

process.on('unhandledRejection', (err: Error) => {
	console.log(err);
	server.close(() => {
		process.exit(1);
	});
});
