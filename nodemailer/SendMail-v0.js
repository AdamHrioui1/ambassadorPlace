const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// These id's and secrets come from .env file.
const { MAILING_SERVICE_CLIENT_ID, MAILING_SERVICE_CLIENT_SECRET, MAILING_SERVICE_REFRESH_TOKEN, SENEDR_EMAIL_ADDRESS } = process.env
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';


const oAuth2Client = new google.auth.OAuth2(
    MAILING_SERVICE_CLIENT_ID,
    MAILING_SERVICE_CLIENT_SECRET,
    REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: MAILING_SERVICE_REFRESH_TOKEN });

const SendMail = async (type, to, number) => {
    try {
        const accessToken = await oAuth2Client.getAccessToken();

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: SENEDR_EMAIL_ADDRESS,
                clientId: MAILING_SERVICE_CLIENT_ID,
                clientSecret: MAILING_SERVICE_CLIENT_SECRET,
                refreshToken: MAILING_SERVICE_REFRESH_TOKEN,
                accessToken: accessToken,
            },
        });

        const mailOptions = {
            from: 'user one <oneoneoneuser@gmail.com>',
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

        const result = await transport.sendMail(mailOptions);
        return result;
    } 
    catch (err) {
        return console.log('send message error: ', err.message);
    }
}

module.exports = SendMail