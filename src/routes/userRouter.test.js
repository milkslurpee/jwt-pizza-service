const request = require("supertest");
const app = require("../service");

const {
	createAdminUser,
	createRegularUser,
	getAdminToken,
} = require("./testHelper.js");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let adminUser, adminToken, regularUser, normieToken;

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
		.put(`/api/user/${regularUser.id}`)
		.set("Authorization", `Bearer ${normieToken}`)
		.send(testUser);
	expect(user.status).toBe(200);
});

beforeAll(async () => {
	adminUser = await createAdminUser();
	regularUser = await createRegularUser();
	adminToken = await getAdminToken(adminUser);
	normieToken = await getAdminToken(regularUser);
});
