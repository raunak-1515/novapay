const amqp = require("amqplib");

let channel = null;

// Connect to RabbitMQ
const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        console.log("Connected to RabbitMQ!");

    } catch (error) {
        console.error("Failed to connect to RabbitMQ:", error);
        //Retry connection after 5 seconds if RabbitMQ is still starting up
        setTimeout(connectRabbitMQ, 5000);

    }
};

// Function to publish messages to a queue
const publishMessage = async (queue, data) => {
    if (!channel) {
        console.error("RabbitMQ channel is not initialized.");
        return;
    }

    try {
        await channel.assertQueue(queue, { durable: true });

        // Send the message as a Buffer
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
            persistent: true,// This ensures the message survives even if RabbitMQ restarts!
        });
        console.log(`Message published to queue:${queue}`);


    } catch (error) {
        console.error("Error publishing message:", error);

    }
};

// Start the connection process
connectRabbitMQ();

module.exports = {
    publishMessage,
}