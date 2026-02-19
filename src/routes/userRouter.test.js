const request = require("supertest");
const app = require("../service");

const {
	createRegularUser,
	getUserToken,
	createAdminUser,
} = require("./testHelper.js");

let adminUser, adminToken;
let normieUser, normieToken;

// Before all tests, create users and fetch tokens
beforeAll(async () => {
	normieUser = await createRegularUser();
	normieToken = await getUserToken(normieUser);

	adminUser = await createAdminUser();
	adminToken = await getUserToken(adminUser);
});

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
	jest.setTimeout(60 * 1000 * 5); // Increase timeout for debugging
}

// Test for getting user info
test("get user", async () => {
	const user = await request(app)
		.get("/api/user/me")
		.set("Authorization", `Bearer ${normieToken}`); // Regular user token
	expect(user.status).toBe(200); // Should return 200
});

// Test for updating user info
test("change user", async () => {
	const testUser = {
		name: "pizza diner",
		email: "reg@test.com",
		password: "a",
	};
	const user = await request(app)
		.put(`/api/user/${normieUser.id}`)
		.set("Authorization", `Bearer ${normieToken}`) // Regular user token
		.send(testUser);
	expect(user.status).toBe(200); // Should return 200 when update is successful
});

// Test for unauthorized access (no token)
test("list users unauthorized", async () => {
	const listUsersRes = await request(app).get("/api/user");
	expect(listUsersRes.status).toBe(401); // Should return 401 for unauthorized access
});

// Test for non-admin user trying to list users
test("list users as a normie *spits* 'ew gross'", async () => {
	const res = await request(app)
		.get("/api/user")
		.set("Authorization", `Bearer ${normieToken}`); // Regular user token
	expect(res.status).toBe(403); // Regular user should get forbidden (403)
});

// Test for admin user being able to list users
test("list users with pagination and filtering", async () => {
	// Check if the admin can fetch the first page of users (page=1, limit=10) with name filter
	const res = await request(app)
		.get("/api/user?page=1&limit=10&name=*") // Pagination query
		.set("Authorization", `Bearer ${adminToken}`); // Admin token

	expect(res.status).toBe(200); // Admin should be able to list users
	expect(Array.isArray(res.body.users)).toBe(true); // Expect an array of users
	expect(res.body.users.length).toBeLessThanOrEqual(10); // Should return at most 10 users
	expect(typeof res.body.more).toBe("boolean"); // 'more' flag should be a boolean
});
