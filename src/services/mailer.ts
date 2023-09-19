import nodemailer from 'nodemailer';
// Create a transporter with your SMTP credentials or other email service configuration
import 'dotenv/config'

const transporter = nodemailer.createTransport({
	host: process.env.MAIL_HOST,
	port: parseInt(process.env.MAIL_PORT as string),
	secure: false, // true for 465, false for other ports,
	auth: {
		user: process.env.MAIL_USERNAME,
		pass: process.env.MAIL_PASSWORD,
	},
});

export interface EmailOptions {
	to: string;
	subject: string;
	html: string;
	attachments?: any[];
	text?: string;
}

const sendEmailReal = async ({
	to,
	subject,
	html,
	attachments,
	text,
}: EmailOptions) => {
	try {
		const from = process.env.MAIL_FROM_ADDRESS;
		const mailOptions: nodemailer.SendMailOptions = {
			from,
			to,
			subject,
			html,
			attachments,
			text, // Uncomment this line if you want to include a plain text version of the email
		};

		return transporter.sendMail(mailOptions);
	} catch (error) {
		console.log(error);
	}
};

export const sendEmail = async (args: EmailOptions) => {
	if (process.env.NODE_ENV === 'development') {//in we will check 
		// return Promise.resolve();//uncomment in dev mode later
		return sendEmailReal(args);//to delete in dev mode
	} else {
		return sendEmailReal(args);
	}
};


// // Example usage
// const emailOptions: EmailOptions = {
//   to: 'ramsesfeukeng@gmail.com',
//   subject: 'Test Email',
//   html: '<p>This is a test email</p>',
// };

// sendEmail(emailOptions)
//   .then((info:any) => {
//     console.log('Email sent successfully:', info);
//   })
//   .catch((error:any) => {
//     console.error('Error sending email:', error);
//   });
