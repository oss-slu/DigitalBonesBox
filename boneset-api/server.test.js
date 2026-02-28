const request = require("supertest");
const { app } = require("./server");

describe("Initial configuration tests 263", () => {
    it("should return 200 OK", async () => {
        const response = await request(app).get("/");
        expect(response.statusCode).toBe(200);
    });

    it("should return message welcome", async () => {
        const response = await request(app).get("/");
        expect(response.body.message).toBe("Welcome to the Boneset API");
    });
});