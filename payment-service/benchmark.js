const autocannon = require("autocannon");
const axios = require("axios");

const AUTH_URL = "http://127.0.0.1:4001/auth";
const PAYMENT_URL = "http://127.0.0.1:4003/payments";


async function setupTestAccounts() {
    console.log("Setting up test accounts")
    const senderEmail = "sender_bench@gmail.com";
    const receiverEmail = "receiver_bench@gmail.com";
    const password = "password123";

    await axios.post(`${AUTH_URL}/register`, { email: senderEmail, password }).catch(() => { });
    await axios.post(`${AUTH_URL}/register`, { email: receiverEmail, password }).catch(() => { });

    const loginRes = await axios.post(`${AUTH_URL}/login`, { email: senderEmail, password });

    // NEW: Inject 1,000,000 into the sender's wallet so the benchmark doesn't fail due to insufficient funds!
    const senderId = loginRes.data.user._id;
    await axios.post(`http://127.0.0.1:4002/wallet/credit`,
        { userId: senderId, amount: 1000000 },
        { headers: { "x-internal-service-secret": "novapay-internal-secret" } }
    ).catch(() => { });

    return { token: loginRes.data.accessToken, receiverEmail };
}



function runBenchmark(title, url, method, token, body = null) {
    return new Promise((resolve) => {
        console.log(`\n Starting: ${title}`);
        const instance = autocannon({
            url,
            method,
            connections: 10,
            duration: 5, // Run each test for 5 seconds
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        autocannon.track(instance, { renderProgressBar: true });
        instance.on("done", (result) => {
            resolve(result.latency.average);
        });
    });

}

async function start() {
    try {
        const { token, receiverEmail } = await setupTestAccounts();
        const transferBody = { recipientEmail: receiverEmail, amount: 1, note: "bench" };

        // === NEW SANITY CHECK TO FIND THE ERROR ===
        console.log("\n🧪 Running a single test transfer to diagnose error...");
        try {
            await axios.post(`${PAYMENT_URL}/transfer`, transferBody, { headers: { Authorization: `Bearer ${token}` } });
            console.log("✅ Test transfer succeeded! Starting benchmark...");
        } catch (e) {
            console.log("❌ TRANSFER FAILED:", e.response ? e.response.data : e.message);
            console.log("Stopping benchmark because requests will just fail.");
            return;
        }
        // ==========================================
        // 1. Benchmark RabbitMQ / Email
        const emailBefore = await runBenchmark(
            "Transfer (BEFORE RabbitMQ - Synchronous Email)",
            `${PAYMENT_URL}/transfer?simulateSyncEmail=true`,
            "POST",
            token,
            transferBody
        );
        const emailAfter = await runBenchmark(
            "Transfer (AFTER RabbitMQ - Asynchronous Email)",
            `${PAYMENT_URL}/transfer`,
            "POST",
            token,
            transferBody
        );
        // 2. Benchmark Redis Cache
        const redisBefore = await runBenchmark(
            "History (BEFORE Redis - MongoDB Direct)",
            `${PAYMENT_URL}/history?bypassCache=true`,
            "GET",
            token
        );
        const redisAfter = await runBenchmark(
            "History (AFTER Redis - Cached Hit)",
            `${PAYMENT_URL}/history`,
            "GET",
            token
        );
        // 3. Print Results

        console.log(" NOVAPAY PERFORMANCE BENCHMARK RESULTS ");

        const emailImprovement = (((emailBefore - emailAfter) / emailBefore) * 100).toFixed(2);
        console.log(`EMAIL QUEUE (RabbitMQ):`);
        console.log(`   - Before (Sync):  ${emailBefore} ms`);
        console.log(`   - After (Async):  ${emailAfter} ms`);
        console.log(`   - Improvement:    ${emailImprovement}% Faster!\n`);
        const redisImprovement = (((redisBefore - redisAfter) / redisBefore) * 100).toFixed(2);
        console.log(`TRANSACTION HISTORY (Redis):`);
        console.log(`   - Before (Mongo): ${redisBefore} ms`);
        console.log(`   - After (Redis):  ${redisAfter} ms`);
        console.log(`   - Improvement:    ${redisImprovement}% Faster!\n`);
    } catch (error) {
        console.error("Benchmark failed:", error.message);
    }
}

start();


