const nodemailer = require('nodemailer');

// Create a transporter using Elastic Email SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp.elasticemail.com',
    port: 2525, // You can also use 587 or 465 for SSL
    auth: {
        user: process.env.SMTP_USER, // Typically your Elastic Email account email
        pass: process.env.SMTP_PASS   // Your Elastic Email API key
    }
});

// Function to send an email
// (type, to, partner_link, ambassador_link)
const SendMail = (type, to, number) => {
    const mailOptions = {
        from: 'team@nomadworld.ai',
        to: to,
        subject:  type === 'verify' ? 'Verify Your Email' : 'Reset Password',
        html: `${ 
            type === 'verify' ? 
            `<div>
                <h1>Verify Your Email</h1>
                <p>Your email verification number is: <strong>${number}</strong> </p>
            </div>` :

            `<div>
                <h1>Reset your password</h1>
                <p>Your email verification number is: <strong>${number}</strong> </p>
            </div>`
        }`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

module.exports = SendMail