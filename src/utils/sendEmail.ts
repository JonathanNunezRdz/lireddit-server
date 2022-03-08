import nodemailer from 'nodemailer';

// async..await is not allowed in global scope, must use a wrapper
/**
 * sendEmail
 * @param {String} to - Email address of the receiver
 * @param {String} html - message
 */
async function sendEmail(to: string, html: string) {
	// Generate test SMTP service account from ethereal.email
	// Only needed if you don't have a real mail account for testing

	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
		service: 'SendinBlue',
		auth: {
			user: process.env.NODEMAILER_USER, // generated ethereal user
			pass: process.env.NODEMAILER_PASSWORD, // generated ethereal password
		},
	});

	const username = process.env.NODEMAILER_USERNAME.replace('_', ' ');

	// send mail with defined transport object
	let info = await transporter.sendMail({
		from: `"${username}" <${process.env.NODEMAILER_USER}>`, // sender address
		to, // list of receivers
		subject: 'Change password', // Subject line
		html,
	});

	console.log('Message sent: %s', info.messageId);
	// Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

	// Preview only available when sending through an Ethereal account
	console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
	// Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

export default sendEmail;
