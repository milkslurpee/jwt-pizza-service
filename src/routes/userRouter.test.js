const request = require("supertest");
const app = require("../service");

const { createRegularUser, getUserToken } = require("./testHelper.js");

let adminUser, adminToken;
let normieUser, normieToken;

beforeAll(async () => {
	normieUser = await createRegularUser();
	normieToken = await getUserToken(normieUser);
});

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
	jest.setTimeout(60 * 1000 * 5);
}

test("get user", async () => {
	const user = await request(app)
		.get("/api/user/me")
		.set("Authorization", `Bearer ${normieToken}`);
	expect(user.status).toBe(200);
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
		.set("Authorization", `Bearer ${normieToken}`)
		.send(testUser);
	expect(user.status).toBe(200);
});

// Test for unauthorized access (no token)
test("list users unauthorized", async () => {
	const listUsersRes = await request(app).get("/api/user");
	expect(listUsersRes.status).toBe(401);
});

// Test for non-admin user trying to list users
test("list users as a normie *spits* 'ew gross'", async () => {
	const res = await request(app)
		.get("/api/user")
		.set("Authorization", `Bearer ${normieToken}`);
	expect(res.status).toBe(403);
});

// Test for admin user being able to list users

test("admin login and list users", async () => {
	// Use the known admin credentials
	const adminCredentials = {
		email: "a@jwt.com", // Admin email
		password: "admin", // Admin password
	};

	// Log in as admin to get the token
	const loginRes = await request(app).put("/api/auth").send(adminCredentials);

	// Ensure login is successful and we get the token
	expect(loginRes.status).toBe(200);
	const adminToken = loginRes.body.token; // Extract the admin token

	// Use the token to list users
	const listUsersRes = await request(app)
		.get("/api/user?page=1&limit=10")
		.set("Authorization", `Bearer ${adminToken}`); // Add token to request header

	// Assert that the response status is 200 (admin should be able to list users)
	expect(listUsersRes.status).toBe(200);
});
