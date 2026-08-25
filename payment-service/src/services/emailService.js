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
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f7f6;">
          <h2 style="color: #27e0b3;">Transfer Successful</h2>
          <p>You have successfully sent <strong>Rs. ${amount}</strong> to <strong>${recipientEmail}</strong>.</p>
          <p>Thank you for using NovaPay!</p>
        </div>
            `,

        });
        //2. Email the recipient
        await transporter.sendMail({
            from: `"Novapay" <${process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject: "Transfer Received- Novapay",
            html: `
             <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f7f6;">
          <h2 style="color: #27e0b3;">Transfer Received</h2>
          <p>You have successfully received <strong>Rs. ${amount}</strong> from <strong>${senderEmail}</strong>.</p>
          <p>Thank you for using NovaPay!</p>
        </div>
            `,
        });

        console.log("Transfer receipt emails sent successfully.");


    } catch (error) {
        console.error("Error sending email receipts:", error);
        // Note: We only log the error. We don't want to break the whole app if an email fails to send!



    }
}