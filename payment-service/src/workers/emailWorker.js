const amqp = require("amqplib");
const emailService = require("../services/emailService");

const connectWorker = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await connection.createChannel();

        const queue = "email_queue";
        // Ensure the queue exists before trying to read from it
        await channel.assertQueue(queue, { durable: true });

        // Tell RabbitMQ to only give this worker 1 message at a time
        channel.prefetch(1);

        console.log(`Worker is listening for messages in ${queue}...`);

        // Listen to the queue in the background
        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                try {
                    const data = JSON.parse(msg.content.toString());

                    if (data.type === "TRANSFER_SUCCESS") {
                        console.log("Worker received email task for:", data.senderEmail);

                        // Actually send the email (this might take a few seconds)
                        await emailService.sendTransferReceipt(
                            data.recipientEmail,
                            data.senderEmail,
                            data.amount);
                        console.log("Worker finished sending email!");
                    }
                    // Very Important: Acknowledge the message so RabbitMQ deletes it from the queue
                    channel.ack(msg);


                } catch (error) {
                    console.error("Worker failed to process message:", error);
                    // If Gmail crashes, we negative-acknowledge (nack) it so it goes back into the queue to retry later!
                    channel.nack(msg);

                }
            }
        });

    } catch (error) {
        console.error("Failed to start email worker:", error);
        // If RabbitMQ isn't ready yet, retry in 5 seconds
        setTimeout(connectWorker, 5000);

    }
};
connectWorker();
