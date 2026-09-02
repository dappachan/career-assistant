import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import request from "supertest";

const mocks = vi.hoisted(() => ({
   generateContent: vi.fn(), 
}));

vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: class {
        getGenerativeModel() {
            return { generateContent: mocks.generateContent };
        }
    },
}));

import app from "./app";

describe("POST /api/review", () => {
    let token: string;

    beforeAll(async () => {
    const res = await request(app)
        .post("/api/login")
        .send({ username: "david", password: "demo123" });
    token = res.body.token;
    });
    beforeEach(() => vi.clearAllMocks());

    it("returns 401 without a token", async () => {
        const res = await request(app)
            .post("/api/review")
            .send({ resumeText: "a".repeat(60) });
        
        expect(res.status).toBe(401);

        expect(res.body.error).toMatch(/Bearer token/i);
    });

    it("returns 401 with a garbage token token", async () => {
        const res = await request(app)
            .post("/api/review")
            .set("Authorization", "Bearer garbage")
            .send({ resumeText: "a".repeat(60) });
        
        expect(res.status).toBe(401);

        expect(res.body.error).toMatch(/Invalid or expired token/i);
    });

    it("returns 400 when resumeText is too short", async () => {
        const res = await request(app)
            .post("/api/review")
            .set("Authorization", `Bearer ${token}`)
            .send({ resumeText: "too short" });
        
        expect(res.status).toBe(400);

        expect(res.body.error).toMatch(/50 characters/i);
    });

    it("returns feedback for a valid resume", async () => {
        mocks.generateContent.mockResolvedValue({
            response: { text: () => "MOCK FEEDBACK",}
        });
        const res = await request(app)
            .post("/api/review")
            .set("Authorization", `Bearer ${token}`)
            .send({ resumeText: "a".repeat(60) });
        
        expect(res.status).toBe(200);
        expect(res.body.feedback).toBe("MOCK FEEDBACK")
    });

    it("returns 500 when the Gemini call fails", async () => {
        mocks.generateContent.mockRejectedValue(new Error("Gemini down"));
        const res = await request(app)
            .post("/api/review")
            .set("Authorization", `Bearer ${token}`)
            .send({ resumeText: "a".repeat(60) });
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("AI service is unavailable. Try again shortly.")
    })
});
