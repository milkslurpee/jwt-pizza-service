const request = require("supertest");
const app = require("../service");
const { Role, DB } = require("../database/database.js");
const franchiseRouter = require("./franchiseRouter");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let adminUser, adminToken;

test("create franchise", async () => {
	const franchise = await createFranchise(adminToken);
	expect(franchise.name).toContain("MrPizza");
});

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
	jest.setTimeout(60 * 1000 * 5);
}

async function createAdminUser() {
	let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
	user.name = randomName();
	user.email = user.name + "@admin.com";

	user = await DB.addUser(user);
	return { ...user, password: "toomanysecrets" };
}

async function createFranchise(adminToken) {
	const franchise = {
		name: `MrPizza${randomName()}'s`,
		admins: [],
	};
	const resp = await request(app)
		.post("/api/franchise")
		.set("Authorization", `Bearer ${adminToken}`)
		.send(franchise);
	return resp.body;
}

async function getAdminToken(adminUser) {
	const loginRes = await request(app).put("/api/auth").send({
		email: adminUser.email,
		password: adminUser.password,
	});
	return loginRes.body.token;
}

function randomName() {
	return Math.random().toString(36).substring(2, 12);
}

beforeAll(async () => {
	adminUser = await createAdminUser();
	adminToken = await getAdminToken(adminUser);
});
