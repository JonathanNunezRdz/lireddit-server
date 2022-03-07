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
			user: 'jonathannunezr1@gmail.com', // generated ethereal user
			pass: 'rR59bQNqxpYAsydZ', // generated ethereal password
			// api key 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
		},
	});

	// send mail with defined transport object
	let info = await transporter.sendMail({
		from: '"Jonathan Nunez" <jonathannunezr1@gmail.com>', // sender address
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
