// @desc    Mock Email Service
// @param   options: { email, subject, message }
const sendEmail = async (options) => {
    // In a real app, this would use nodemailer
    // For now, we just log the email to the console
    const timestamp = new Date().toISOString();
    console.log('\n================ EMAIL MOCK SERVICE ================');
    console.log(`[${timestamp}] Sending Email`);
    console.log(`To:      ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: ${options.message}`);
    console.log('====================================================\n');

    // Simulate success
    return true;
};

module.exports = sendEmail;
