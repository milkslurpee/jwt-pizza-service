const request = require("supertest");
const app = require("../service");

const {
	createRegularUser,
	getUserToken,
	createAdminUser,
} = require("./testHelper.js");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let adminUser, adminToken;
let normieUser, normieToken;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
	jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

test("get user", async () => {
	const user = await request(app)
		.get("/api/user/me")
		.set("Authorization", `Bearer ${normieToken}`);
	expect(user.status).toBe(200);
});

test("change user", async () => {
	const user = await request(app)
		.put(`/api/user/${normieUser.id}`)
		.set("Authorization", `Bearer ${normieToken}`)
		.send(testUser);
	expect(user.status).toBe(200);
});

test("list users unauthorized", async () => {
	const listUsersRes = await request(app).get("/api/user");
	expect(listUsersRes.status).toBe(401);
});

test("list users attempted by a loser normie", async () => {
	const res = await request(app)
		.get("/api/user")
		.set("Authorization", `Bearer ${normieToken}`);
	expect(res.status).toBe(403);
});

test("list users as admin", async () => {
	const res = await request(app)
		.get("/api/user")
		.set("Authorization", `Bearer ${adminToken}`);
	expect(res.status).toBe(200);
});

test("delete users unauthorized", async () => {
	const res = await request(app).delete(`/api/user/${normieUser.id}`);
	expect(res.status).toBe(401);
});

test("delete users attempted by a loser normie", async () => {
	const res = await request(app)
		.delete(`/api/user/${adminUser.id}`)
		.set("Authorization", `Bearer ${normieToken}`);
	expect(res.status).toBe(403);
});

test("delete users as admin", async () => {
	const tempUser = await createRegularUser();
	const res = await request(app)
		.delete(`/api/user/${tempUser.id}`)
		.set("Authorization", `Bearer ${adminToken}`);
	expect(res.status).toBe(200);
});

beforeAll(async () => {
	normieUser = await createRegularUser();
	normieToken = await getUserToken(normieUser);
	adminUser = await createAdminUser();
	adminToken = await getUserToken(adminUser);
});
