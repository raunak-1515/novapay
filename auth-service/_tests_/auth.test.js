const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../src/index.js");

const axios = require("axios");
jest.mock("axios");

let mongoServer;

// 1. BEFORE ANY TESTS RUN: Spin up our fake RAM database!
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // We connect Mongoose to the fake DB instead of your real one
    await mongoose.connect(mongoUri);
});

// 2. AFTER ALL TESTS FINISH: Clean up and shut down the fake database
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// 3. AFTER EVERY SINGLE TEST: Wipe the database completely clean
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});

// 4. THE ACTUAL TESTS
describe("Auth API Endpoints", () => {

    beforeEach(() => {
        // Force axios.post to instantly succeed without making a network call!
        axios.post.mockResolvedValue({ data: { success: true } });
    });

    test("Should successfully register a new user", async () => {
        // We use "supertest" to pretend to be Postman hitting the API
        const response = await request(app)
            .post("/auth/register")
            .send({
                email: "testuser@gmail.com",
                password: "securepassword123",
                name: "Test User"
            });

        // We write "Assertions" (things that MUST be true for the test to pass)
        expect(response.statusCode).toBe(201); // 201 means "Created"
        expect(response.body.message).toBe("User registered successfully");

    });

});
