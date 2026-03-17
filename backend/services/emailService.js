const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // For development, you can use a service like Ethereal or just log to console
    // In production, configure SMTP settings in .env
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const message = {
        from: `${process.env.FROM_NAME || 'LabVault'} <${process.env.FROM_EMAIL || 'no-reply@labvault.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    try {
        const info = await transporter.sendMail(message);
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Email send error:', error);
        // Fallback for development if no SMTP is configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('\x1b[33m%s\x1b[0m', '--- EMAIL FALLBACK (No SMTP Configured) ---');
            console.log(`To: ${options.email}`);
            console.log(`Subject: ${options.subject}`);
            console.log(`Body: ${options.message}`);
            console.log('\x1b[33m%s\x1b[0m', '------------------------------------------');
            return { messageId: 'fallback-id' };
        }
        throw error;
    }
};

module.exports = sendEmail;
