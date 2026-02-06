const request = require("supertest");
const app = require("../service");
const {
	createAdminUser,
	createRegularUser,
	createFranchise,
	getAdminToken,
	randomName,
} = require("./testHelper.js");

let adminUser, adminToken;

test("get all franchise", async () => {
	const franchise = await request(app).get("/api/franchise");
	expect(franchise.status).toBe(200);
});

test("get a user's franchises", async () => {
	const franchises = await request(app)
		.get(`/api/franchise/${adminUser.id}`)
		.set("Authorization", `Bearer ${adminToken}`);
	expect(franchises.status).toBe(200);
});

test("create franchise", async () => {
	const franchise = await createFranchise(adminToken);
	expect(franchise.name).toContain("MrPizza");
});

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
	jest.setTimeout(60 * 1000 * 5);
}

// test("fail to create franchise", async () => {
// 	const nonAdmin = await createRegularUser();
// 	const nonAdminToken = await getAdminToken(nonAdmin);
// 	const franchise = {
// 		name: `MrPizza${randomName()}'s`,
// 		admins: [],
// 	};
// 	const resp = await request(app)
// 		.post("/api/franchise")
// 		.set("Authorization", `Bearer ${nonAdminToken}`)
// 		.send(franchise);

// 	expect(resp.status).not.toBe(200);
// });

// if (process.env.VSCODE_INSPECTOR_OPTIONS) {
// 	jest.setTimeout(60 * 1000 * 5);
// }

// test("delete franchise", async () => {
// 	const franchise = await createFranchise(adminToken);

// 	const deleteFranchise = await request(app)
// 		.delete(`/api/franchise/${franchise.id}`)
// 		.set("Authorization", `Bearer ${adminToken}`);
// 	expect(deleteFranchise.status).toBe(200);
// 	expect(deleteFranchise.body.message).toBe("franchise deleted");
// });

// test("fail to delete franchise", async () => {
// 	const response = await request(app)
// 		.delete(`/api/franchise/not-a-number`)
// 		.set("Authorization", `Bearer ${adminToken}`);
// 	expect(response.status).not.toBe(200);
// });

beforeAll(async () => {
	adminUser = await createAdminUser();
	adminToken = await getAdminToken(adminUser);
});
