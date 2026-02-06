const request = require("supertest");
const app = require("../service");
const {
	createAdminUser,
	createRegularUser,
	createFranchise,
	getAdminToken,
	randomName,
} = require("../routes/testHelper.js");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

test("get menu", async () => {
	const menu = await request(app).get("/api/order/menu");
	expect(menu.status).toBe(200);
});

test("add item to menu", async () => {});

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
	jest.setTimeout(60 * 1000 * 5); // 5 minutes
}
