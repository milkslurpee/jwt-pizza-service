const request = require("supertest");
const app = require("../service");

const {
	createAdminUser,
	createRegularUser,
	createFranchise,
	getAdminToken,
	randomName,
} = require("./testHelper.js");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let adminUser, adminToken, regularUser, normieToken;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
	jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

test("get user", async () => {
	const menu = await request(app)
		.get("/api/user/me")
		.set("Authorization", `Bearer ${normieToken}`);
	expect(menu.status).toBe(200);
});

beforeAll(async () => {
	adminUser = await createAdminUser();
	regularUser = await createRegularUser();
	adminToken = await getAdminToken(adminUser);
	normieToken = await getAdminToken(regularUser);
});
