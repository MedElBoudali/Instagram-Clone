import {
	Arg,
	Ctx,
	Field,
	InputType,
	Int,
	Mutation,
	ObjectType,
	Query,
	Resolver,
	UseMiddleware
} from "type-graphql";
import { User } from "../entities/user";
import { MyContext } from "../types";
import argon2 from "argon2";
import { cookieName } from "../config/constants";
import { getConnection } from "typeorm";
import { isAuth } from "../middleware/isAuthenticated";
import { Image } from "../entities/image";

@InputType()
class register_inputs {
	@Field()
	userName!: string;
	@Field()
	email!: string;
	@Field()
	password!: string;
	@Field()
	fullName!: string;
}

@ObjectType()
class user_image_data {
	@Field()
	id!: string;
	@Field()
	caption!: string;
	@Field()
	image_url!: string;
	@Field()
	likes!: number;
	@Field({ nullable: true })
	like_status!: string;
	@Field(() => String)
	created_at!: Date;
}

@ObjectType()
class user_response {
	@Field()
	id!: number;
	@Field()
	username!: string;
	@Field()
	fullname!: string;
	@Field()
	image_link!: string;
	@Field({ nullable: true })
	website!: string;
	@Field({ nullable: true })
	bio!: string;
	@Field()
	private!: boolean;
	@Field(() => [user_image_data])
	images!: user_image_data[];
}

@ObjectType()
class error {
	@Field()
	message!: string;
}

@ObjectType()
class response {
	@Field(() => error, { nullable: true })
	error?: error;
	@Field(() => user_response, { nullable: true })
	user?: user_response;
	@Field(() => Boolean, { nullable: true })
	hasMore?: boolean;
}

@ObjectType()
class responses {
	@Field(() => [user_response])
	users!: user_response[];
}

@Resolver(User)
export class UserResolver {
	@Query(() => user_response, { nullable: true })
	async me(@Ctx() { req }: MyContext) {
		if (!req.session!.user_id) {
			return null;
		}
		return await User.findOne(req.session.user_id);
	}

	@Mutation(() => response)
	async register(
		@Arg("registerInputs") registerInputs: register_inputs,
		@Ctx() { req }: MyContext
	): Promise<response> {
		const { email, fullName: fullname, password } = registerInputs;
		const username = registerInputs.userName.toLowerCase().split(" ").join(".");
		const hashedPassword = await argon2.hash(registerInputs.password);

		if (fullname.length <= 3 || username.length <= 3 || password.length <= 3) {
			return {
				error: { message: "Full name or Username or Password length should be greater than 5." }
			};
		}
		if (email.length <= 3 || !email.includes("@")) {
			return { error: { message: "Invalid email." } };
		}

		let user: user_response | null = null;
		try {
			const result = await getConnection()
				.createQueryBuilder()
				.insert()
				.into(User)
				.values({
					username,
					fullname,
					email,
					password: hashedPassword
				})
				.returning("*")
				.execute();
			user = result.raw[0];
		} catch (error) {
			if (error.code === "23505") {
				return { error: { message: "That username or email address is already in use." } };
			}
		}
		req.session.user_id = user!.id;
		return {
			user: {
				id: user!.id,
				username: user!.username,
				fullname: user!.fullname,
				image_link: user!.image_link,
				website: user!.website,
				bio: user!.bio,
				private: user!.private,
				images: user!.images
			}
		};
	}

	@Mutation(() => response)
	async login(
		@Arg("userNameOrEmail") userNameOrEmail: string,
		@Arg("password") password: string,
		@Ctx() { req }: MyContext
	): Promise<response> {
		const isEmail = userNameOrEmail.includes("@");
		const user = await User.findOne({
			where: isEmail ? { email: userNameOrEmail } : { username: userNameOrEmail }
		});

		if (!user) {
			return {
				error: {
					message:
						"The username you entered doesn't belong to an account. Please check your username and try again."
				}
			};
		}
		const isMatch = await argon2.verify(user.password, password);
		if (!isMatch) {
			return {
				error: {
					message: "Sorry, your password was incorrect. Please double-check your password."
				}
			};
		}
		req.session.user_id = user.id;
		return {
			user: {
				id: user.id,
				username: user.username,
				fullname: user.fullname,
				image_link: user.image_link,
				website: user.website,
				bio: user.bio,
				private: user.private,
				images: user.images
			}
		};
	}

	@Query(() => response)
	async getUser(
		@Arg("username") username: string,
		@Arg("limit", () => Int) limit: number,
		@Arg("cursor", () => String, { nullable: true }) cursor: string | null
	): Promise<response> {
		const user = await User.findOne({ username });
		const minLimit = Math.min(50, limit);
		const minLimitPlusOne = minLimit + 1;
		if (!user) {
			return {
				error: {
					message: `User '${username}' not found!`
				}
			};
		}

		let user_images: user_image_data[] = [];
		if (!user.private) {
			if (cursor) {
				user_images = await Image.createQueryBuilder()
					.where('"userId" = :userid', { userid: user.id })
					.where("created_at < :newcursor", { newcursor: new Date(parseInt(cursor)) })
					.orderBy("created_at", "DESC")
					.limit(minLimitPlusOne)
					.getMany();
				console.log("----------------------------------");
				console.log(user_images);
				// const newCursor = new Date(parseInt(cursor));
				// user_images = await getConnection().query(
				// 	`
				// select *
				// from image image
				// where created_at < ${newCursor}
				// order by created_at DESC
				// limit ${minLimitPlusOne}
				// `
				// );
			} else {
				user_images = await Image.createQueryBuilder()
					.where('"userId" = :userid', { userid: user.id })
					.orderBy("created_at", "DESC")
					.limit(limit)
					.getMany();
			}
		}

		const { id, username: userName, fullname, image_link, website, bio, private: isPrivate } = user;

		return {
			user: {
				id,
				username: userName,
				fullname,
				image_link,
				website,
				bio,
				private: isPrivate,
				images: user_images.slice(0, minLimit)
			},
			hasMore: user_images.length === minLimitPlusOne
		};
	}

	@Query(() => responses)
	@UseMiddleware(isAuth)
	async suggestedUsers(@Ctx() { req }: MyContext): Promise<responses> {
		const id = req.session.user_id;
		const users = await User.createQueryBuilder()
			.where("id != :id", { id })
			.orderBy("id", "DESC")
			.limit(4)
			.getMany();

		return {
			users
		};
	}

	@Mutation(() => Boolean)
	logout(@Ctx() { req, res }: MyContext) {
		return new Promise(resolve =>
			req.session?.destroy(err => {
				res.clearCookie(cookieName);
				if (err) {
					resolve(false);
					return;
				} else {
					resolve(true);
				}
			})
		);
	}
}
