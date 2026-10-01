const nodemailer = require("nodemailer");

// Create a connection to Gmail using your .env credentials
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

exports.sendTransferReceipt = async (recipientEmail, senderEmail, amount) => {
    try {
        //1.Email the sender
        await transporter.sendMail({
            from: `"Novapay" <${process.env.SMTP_USER}>`,
            to: senderEmail,
            subject: "Transfer Successful- Novapay",
            html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px 20px; background-color: #060b14; color: #e6edf7; text-align: center;">
              <div style="max-width: 500px; margin: 0 auto; background-color: #121d33; border-radius: 16px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);">
                <h1 style="color: #27e0b3; font-size: 24px; margin-top: 0;">Transfer Successful</h1>
                <p style="color: #8ea0bf; font-size: 16px;">You sent a payment to</p>
                <p style="font-size: 18px; font-weight: bold; margin: 10px 0;">${recipientEmail}</p>
                <div style="margin: 30px 0; padding: 20px; background-color: rgba(39, 224, 179, 0.1); border-radius: 12px; border: 1px solid rgba(39, 224, 179, 0.2);">
                  <span style="font-size: 14px; color: #8ea0bf; display: block; margin-bottom: 8px;">Amount Sent</span>
                  <span style="font-size: 36px; font-weight: bold; color: #27e0b3;">Rs. ${amount}</span>
                </div>
                <p style="color: #8ea0bf; font-size: 14px; margin-bottom: 0;">Thank you for using NovaPay!</p>
              </div>
            </div>
            `,

        });
        //2. Email the recipient
        await transporter.sendMail({
            from: `"Novapay" <${process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject: "Transfer Received- Novapay",
            html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px 20px; background-color: #060b14; color: #e6edf7; text-align: center;">
              <div style="max-width: 500px; margin: 0 auto; background-color: #121d33; border-radius: 16px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);">
                <h1 style="color: #27e0b3; font-size: 24px; margin-top: 0;">Funds Received</h1>
                <p style="color: #8ea0bf; font-size: 16px;">You received a payment from</p>
                <p style="font-size: 18px; font-weight: bold; margin: 10px 0;">${senderEmail}</p>
                <div style="margin: 30px 0; padding: 20px; background-color: rgba(39, 224, 179, 0.1); border-radius: 12px; border: 1px solid rgba(39, 224, 179, 0.2);">
                  <span style="font-size: 14px; color: #8ea0bf; display: block; margin-bottom: 8px;">Amount Received</span>
                  <span style="font-size: 36px; font-weight: bold; color: #27e0b3;">+ Rs. ${amount}</span>
                </div>
                <p style="color: #8ea0bf; font-size: 14px; margin-bottom: 0;">Thank you for using NovaPay!</p>
              </div>
            </div>
            `,
        });

        console.log("Transfer receipt emails sent successfully.");


    } catch (error) {
        console.error("Error sending email receipts:", error);
        // Note: We only log the error. We don't want to break the whole app if an email fails to send!



    }
}