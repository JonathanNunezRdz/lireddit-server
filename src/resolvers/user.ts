import { hash, verify } from 'argon2';
import {
	Arg,
	Ctx,
	Field,
	FieldResolver,
	Mutation,
	ObjectType,
	Query,
	Resolver,
	Root,
} from 'type-graphql';
import { v4 } from 'uuid';
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from '../constants';
import User from '../entities/User';
import { MyContext } from '../types';
import sendEmail from '../utils/sendEmail';
import validateEmail from '../utils/validateEmail';
import validateRegister from '../utils/validateRegister';
import UsernamePasswordInput from './UsernamePasswordInput';

@ObjectType()
class FieldError {
	@Field()
	field: string;
	@Field()
	message: string;
}

@ObjectType()
class UserResponse {
	@Field(() => [FieldError], { nullable: true })
	errors?: FieldError[];

	@Field({ nullable: true })
	user?: User;
}

@Resolver(User)
class UserResolver {
	@FieldResolver(() => String)
	email(@Root() user: User, @Ctx() { req }: MyContext): string {
		// cuurent user is the same so give them the email
		if (req.session.userId === user.id) return user.email;
		// different user from current user
		return '';
	}

	@Mutation(() => UserResponse)
	async changePassword(
		@Arg('token') token: string,
		@Arg('newPassword') newPassword: string,
		@Ctx() { redis, req, userRepository }: MyContext
	): Promise<UserResponse> {
		if (newPassword.length <= 2)
			return {
				errors: [
					{
						field: 'newPassword',
						message: 'Password length must be greater than 2',
					},
				],
			};

		const key = `${FORGOT_PASSWORD_PREFIX}${token}`;
		const userId = await redis.get(key);
		if (!userId)
			return {
				errors: [
					{
						field: 'token',
						message: 'Token expired',
					},
				],
			};

		const id = parseInt(userId);
		const user = await userRepository.findOne(id);
		if (!user)
			return {
				errors: [
					{
						field: 'token',
						message: 'User no longer exists',
					},
				],
			};

		await userRepository.update(
			{ id },
			{ password: await hash(newPassword) }
		);
		await redis.del(key);

		// log in user after change password
		req.session.userId = user.id;
		return { user };
	}

	@Mutation(() => Boolean)
	async forgotPassword(
		@Arg('email') email: string,
		@Ctx() { redis, userRepository }: MyContext
	) {
		const user = await userRepository.findOne({ where: { email } });
		if (!user) return true;

		const token = v4();
		await redis.set(
			`${FORGOT_PASSWORD_PREFIX}${token}`,
			user.id,
			'ex',
			1000 * 60 * 60 * 24 * 3
		); // expire after 3 days

		await sendEmail(
			email,
			`<a href="http://localhost:3000/change-password/${token}">reset password</a>`
		);

		return true;
	}

	@Query(() => User, { nullable: true })
	async me(@Ctx() { req, userRepository }: MyContext): Promise<User | null> {
		if (!req.session.userId) return null;
		return userRepository.findOneOrFail(req.session.userId);
	}

	@Mutation(() => UserResponse)
	async register(
		@Arg('options') options: UsernamePasswordInput,
		@Ctx() { req, userRepository }: MyContext
	): Promise<UserResponse> {
		const errors = validateRegister(options);
		if (errors) return { errors };

		const hashedPassword = await hash(options.password);

		try {
			// const result = await userRepository.insert({
			// 	email: options.email,
			// 	password: hashedPassword,
			// 	username: options.username,
			// });
			// const user = result.raw[0] as User;
			// console.log(user);

			const result = await userRepository
				.createQueryBuilder()
				.insert()
				.values({
					username: options.username,
					email: options.email,
					password: hashedPassword,
				})
				.returning('*')
				.execute();
			const user = result.raw[0] as User;
			// store user id session
			// this will set a cookie on the user
			// keep them logged in
			req.session.userId = user.id;
			return { user };
		} catch (error) {
			// duplication error
			//|| error.detail.includes('already exists')) {
			if (error.code === '23505') {
				const key = error.constraint.includes('username')
					? 'username'
					: 'email';
				return {
					errors: [
						{
							field: key,
							message: `${key
								.substring(0, 1)
								.toUpperCase()}${key.slice(
								1
							)} has already been taken`,
						},
					],
				};
			} else
				return {
					errors: [
						{
							field: 'server',
							message: 'internal server error',
						},
					],
				};
		}
	}

	@Mutation(() => UserResponse)
	async login(
		@Arg('usernameOrEmail') usernameOrEmail: string,
		@Arg('password') password: string,
		@Ctx() { req, userRepository }: MyContext
	): Promise<UserResponse> {
		let key: 'email' | 'username' = 'username';
		if (usernameOrEmail.includes('@') && validateEmail(usernameOrEmail))
			key = 'email';
		const user = await userRepository.findOne({
			where: { [key]: usernameOrEmail },
		});

		if (!user)
			return {
				errors: [
					{
						field: 'usernameOrEmail',
						message: `${key
							.substring(0, 1)
							.toUpperCase()}${key.slice(1)} doesn't exist`,
					},
				],
			};

		const valid = await verify(user.password, password);
		if (!valid)
			return {
				errors: [
					{
						field: 'password',
						message: 'Incorrect password',
					},
				],
			};

		// console.log('before setting userId', req);
		// -mVuRgW406KMIo4NX77wAwvtkP4eG1QH

		// create a session for that user
		req.session.userId = user.id;
		// console.log('after setting userId', req);

		return { user };
	}

	@Mutation(() => Boolean)
	logout(@Ctx() { req, res }: MyContext): Promise<Boolean> {
		return new Promise<Boolean>((resolve) =>
			req.session.destroy((err) => {
				res.clearCookie(COOKIE_NAME);
				if (err) {
					console.error(err);
					resolve(false);
				} else resolve(true);
			})
		);
	}
}

export default UserResolver;
