// Server tests
// console.log in test files should NOT be flagged as debug artifacts

import { handleRequest } from "../src/server";

describe("handleRequest", () => {
  it("should return 400 for invalid input", async () => {
    const req = { body: null, id: "test-1" };
    const result = await handleRequest(req);
    console.log("Test result:", result);
    expect(result.status).toBe(400);
  });

  it("should return 200 for valid input", async () => {
    const req = { body: { email: "test@example.com" }, id: "test-2" };
    const result = await handleRequest(req);
    console.log("Test result:", result);
    expect(result.status).toBe(200);
  });

  it("should handle edge cases", async () => {
    console.debug("Running edge case tests");
    const req = { body: { email: "" }, id: "test-3" };
    const result = await handleRequest(req);
    expect(result.status).toBe(400);
  });
});
