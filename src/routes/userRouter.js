const express = require("express");
const { asyncHandler } = require("../endpointHelper.js");
const { DB, Role } = require("../database/database.js");
const { authRouter, setAuth } = require("./authRouter.js");

const userRouter = express.Router();

userRouter.docs = [
	{
		method: "GET",
		path: "/api/user/me",
		requiresAuth: true,
		description: "Get authenticated user",
		example: `curl -X GET localhost:3000/api/user/me -H 'Authorization: Bearer tttttt'`,
		response: {
			id: 1,
			name: "常用名字",
			email: "a@jwt.com",
			roles: [{ role: "admin" }],
		},
	},
	{
		method: "PUT",
		path: "/api/user/:userId",
		requiresAuth: true,
		description: "Update user",
		example: `curl -X PUT localhost:3000/api/user/1 -d '{"name":"常用名字", "email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json' -H 'Authorization: Bearer tttttt'`,
		response: {
			user: {
				id: 1,
				name: "常用名字",
				email: "a@jwt.com",
				roles: [{ role: "admin" }],
			},
			token: "tttttt",
		},
	},
	{
		method: "GET",
		path: "/api/user?page=1&limit=10&name=*",
		requiresAuth: true,
		description: "Gets a list of users",
		example: `curl -X GET localhost:3000/api/user -H 'Authorization: Bearer tttttt'`,
		response: {
			users: [
				{
					id: 1,
					name: "常用名字",
					email: "a@jwt.com",
					roles: [{ role: "admin" }],
				},
			],
		},
	},
];

// getUser
userRouter.get(
	"/me",
	authRouter.authenticateToken,
	asyncHandler(async (req, res) => {
		res.json(req.user);
	}),
);

// updateUser
userRouter.put(
	"/:userId",
	authRouter.authenticateToken,
	asyncHandler(async (req, res) => {
		const { name, email, password } = req.body;
		const userId = Number(req.params.userId);
		const user = req.user;
		if (user.id !== userId && !user.isRole(Role.Admin)) {
			return res.status(403).json({ message: "unauthorized" });
		}

		const updatedUser = await DB.updateUser(userId, name, email, password);
		const auth = await setAuth(updatedUser);
		res.json({ user: updatedUser, token: auth });
	}),
);

// deleteUser
userRouter.delete(
	"/:userId",
	authRouter.authenticateToken,
	asyncHandler(async (req, res) => {
		res.json({ message: "not implemented" });
	}),
);

// listUsers
userRouter.get(
	"/",
	authRouter.authenticateToken,
	asyncHandler(async (req, res) => {
		try {
			console.log("Authenticated User:", req.user);
			console.log("Pagination params:", {
				page: req.query.page,
				limit: req.query.limit,
			});
			console.log("Filter name:", req.query.name);

			if (req.user.isRole(Role.Admin)) {
				const { page = 1, limit = 10, name = "*" } = req.query;
				const offset = (page - 1) * limit;

				// Log the pagination details
				console.log("Pagination params:", { page, limit, offset });
				console.log("Filter name:", name);

				const users = await DB.getUsers({ offset, limit, name });
				const totalUsers = await DB.countUsers(name);
				const more = offset + limit < totalUsers;

				console.log("Fetched users:", users);
				res.json({
					users,
					more,
				});
			} else {
				console.log("Unauthorized access attempt");
				return res
					.status(403)
					.json({ message: "Unauthorized, login as Admin" });
			}
		} catch (error) {
			console.error("Error in listUsers route:", error);
			return res
				.status(500)
				.json({ message: "Internal server error", error: error.message });
		}
	}),
);

module.exports = userRouter;
