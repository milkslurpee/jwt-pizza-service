// testHelper.js should have:
const request = require("supertest");
const app = require("../service");
const { Role, DB } = require("../database/database.js");

async function createAdminUser() {
	let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
	user.name = randomName();
	user.email = user.name + "@admin.com";

	user = await DB.addUser(user);
	return { ...user, password: "toomanysecrets" };
}

async function createRegularUser() {
	let user = { password: "password123", roles: [{ role: Role.Diner }] };
	user.name = randomName();
	user.email = user.name + "@user.com";
	user = await DB.addUser(user);
	return { ...user, password: "password123" };
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

module.exports = {
	createAdminUser,
	createRegularUser,
	createFranchise,
	getAdminToken,
	randomName,
};
