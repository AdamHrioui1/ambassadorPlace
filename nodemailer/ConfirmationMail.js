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
const sendConfirmationEmail = (type, to, partner_link, ambassador_link) => {
    const mailOptions = {
        from: 'team@nomadworld.ai',
        to: to,
        subject: 'NomadWorld Confirmation',
        html: type === 'ambassador' ?
            `
                <h2>confirmation: ambassador sign up</h2>

                <p>thank you for signing up, and congratulations on taking the first step to escape the rat race and create a life of adventure on your own terms.</p>

                <p>we are so excited to have you help us push forward our vision of a borderless world with equal opportunities for all. you can start referring partners and ambassadors to the program to start earning today! </p>
                
                <h2>below are your unique referral links:</h2>

                <h2>invite someone to become an ambassador</h2>
                <p>your unique ambassador referral link: <a>${ambassador_link}</a></p>

                <h2>get businesses signed up to nomad place</h2>
                <p>your unique business referral link: ${partner_link}</p>

                <p>please copy this link and share it with your community. highlight the benefits of the nomad ambassador program using the sample message below:</p>

                <hr style="width: 100%; height: 1px; background-color: '#000';" />

                <p>sample message to invite ambassadors:</p>
                <p>hey everyone!</p>

                <p>join me in becoming a nomad ambassador and start earning today! you can earn $15 per business sign-up and $0.15 per review. imagine signing up 1000 businesses and earning $50,000 per year passively! help local businesses, work on your own schedule, and be part of a global community. sign up with my referral link: ${ambassador_link}</p>

                <hr style="width: 100%; height: 1px; background-color: '#000';" />

                <p>please copy this link and share it with businesses you know. remind them to book a meeting with us at the end of the signup and pay the $30 fee to qualify. make sure to use these unique links so we can track your earnings and pay you. here’s a sample message you can copy and send to businesses:</p>
                <hr style="width: 100%; height: 1px; background-color: '#000';" />

                <p>sample message to invite businesses:</p>
                <p>hi,</p>

                <p>boost your visibility and attract high-quality customers by joining the nomad place program.</p>

                <p>for just a $30 fee, you'll get 25 free reviews, free consulting, and ongoing support to help attract more clientele and improve your business. after the free reviews, you only pay $0.80 per review.</p>

                <p>sign up today with this link: ${partner_link} and book your onboarding call. let’s grow your business together!</p>
                <hr style="width: 100%; height: 1px; background-color: '#000';" />

                <p>thank you for being part of the nomad community. we look forward to seeing your success!</p>

                <h2>nomad team</h2>

                <p>for any questions, please contact team@nomadworld.ai</p>
            ` :
            `
                <h2>confirmation: nomad place sign up</h2>

                <p>thank you for signing up!</p>

                <p>congratulations on becoming a nomad place! we're excited to help you boost your visibility and attract high-quality customers through our platform. to start enjoying the benefits of our program, it's essential that we complete the know your business (kyb) and onboarding process.</p>

                <p>next steps</p>
                
                <ol>
                    <li>
                        <strong>scheduled meeting:</strong>
                        <ul>
                            <li>you must meet with us at the time you booked for your onboarding call. this meeting is crucial for completing the kyb process and ensuring you can start receiving the benefits from our program.</li>
                            <li>if you need to reschedule, you can do so at any time. just follow the instructions in your confirmation email to select a new time.</li>
                        </ul>
                    </li>
                    
                    <li>
                        <strong>check your email:</strong>
                        <ul>
                            <li>look out for an email from <strong>team@nomadworld.ai</strong> within 48 hrs with more information about the documents you will need to provide for the onboarding process. this email will contain all the details you need to prepare for our meeting.</li>
                        </ul>
                    </li>

                    <li>
                        <strong>required documents:</strong>
                        <ul>
                            <li>during the onboarding process, you will need to provide images of your establishment, share your location pin while on a camera call, and provide proof of your business or address.</li>
                            <li>we will guide you through this process to make it as smooth as possible.</li>
                        </ul>
                    </li>
                </ol>

                <p>why the onboarding process is important</p>

                <p>completing the onboarding process ensures that your business meets our standards and can fully benefit from being a nomad place. here’s what you’ll gain:</p>
                
                <ul>
                    <li><strong>increased visibility:</strong> get promoted in our app, making it easier for nomads to discover your business. </li>
                    <li><strong>authentic reviews:</strong> receive 25 free reviews to start with, and only pay $0.80 per review after that.</li>
                    <li><strong>free consulting and support:</strong> receive guidance and support to help you attract more clientele and improve your business.</li>
                    <li><strong>promotional opportunities:</strong>  we will promote your business on our platform and social media channels to help you gain more visibility.</li>
                </ul>

                <p>thank you for joining the nomad community. we look forward to working with you and helping your business thrive!</p>
                <h2>nomad team</h2>
            `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

module.exports = sendConfirmationEmail