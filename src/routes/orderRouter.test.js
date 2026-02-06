const request = require("supertest");
const app = require("../service");
const {
	createAdminUser,
	createRegularUser,
	createFranchise,
	getAdminToken,
	randomName,
	createOrder,
} = require("./testHelper.js");

let adminUser, adminToken, regularUser, normieToken;

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

test("get menu", async () => {
	const menu = await request(app).get("/api/order/menu");
	expect(menu.status).toBe(200);
});

test("add item to menu", async () => {
	const menuItem = {
		title: "beans(baked)",
		description: "test description",
		image: "pizza1.png",
		price: 0.001,
	};
	const addMenuItem = await request(app)
		.put("/api/order/menu")
		.set("Authorization", `Bearer ${adminToken}`)
		.send(menuItem);

	expect(addMenuItem.status).toBe(200);
});

test("get patron's order history", async () => {
	const order = await createOrder(normieToken);
	const getOrders = await request(app)
		.get("/api/order")
		.set("Authorization", `Bearer ${normieToken}`);

	expect(getOrders.status).toBe(200);
});

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
	jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

beforeAll(async () => {
	adminUser = await createAdminUser();
	regularUser = await createRegularUser();
	adminToken = await getAdminToken(adminUser);
	normieToken = await getAdminToken(regularUser);
});
