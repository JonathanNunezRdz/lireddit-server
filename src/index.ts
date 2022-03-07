import {
	ApolloServerPluginDrainHttpServer,
	ApolloServerPluginLandingPageGraphQLPlayground,
	ApolloServerPluginLandingPageProductionDefault,
} from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import connectRedis from 'connect-redis';
import cors from 'cors';
import 'dotenv-safe/config';
import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import Redis from 'ioredis';
import { AddressInfo } from 'net';
import { join } from 'path';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { createConnection, getRepository } from 'typeorm';
import { COOKIE_NAME, __prod__ } from './constants';
import Post from './entities/Post';
import Updoot from './entities/Updoot';
import User from './entities/User';
import HelloResolver from './resolvers/hello';
import PostResolver from './resolvers/post';
import UserResolver from './resolvers/user';
import { MyContext } from './types';
import createUpdootLoader from './utils/createUpdootLoader';
import createUserLoader from './utils/createUserLoader';

declare module 'express-session' {
	interface SessionData {
		userId: number;
	}
}

const main = async () => {
	const conn = await createConnection({
		type: 'postgres',
		url: process.env.DATABASE_URL,
		logging: !__prod__,
		// synchronize: true,
		entities: [Post, User, Updoot],
		migrations: [join(__dirname, './migrations/*')],
		ssl: __prod__
			? {
					rejectUnauthorized: false,
					requestCert: __prod__,
			  }
			: undefined,
	});
	await conn.runMigrations();
	// await Post.delete({});

	const app = express();

	const RedisStore = connectRedis(session);
	const redis = new Redis(process.env.REDIS_URL);

	// redisClient.connect()
	// await redisClient.connect().catch(console.error);
	app.set('proxy', 1);
	app.use(
		cors({
			origin: process.env.CORS_ORIGIN,
			credentials: true,
		})
	);
	app.use(
		session({
			name: COOKIE_NAME,
			store: new RedisStore({
				client: redis,
				disableTouch: true,
			}),
			cookie: {
				maxAge: 1000 * 60 * 60 * 24 * 365 * 1, // 1 year
				httpOnly: !__prod__,
				sameSite: 'lax', // csrf
				secure: __prod__, // cookie only works in https when in production
				domain: __prod__ ? '.vercel.app' : undefined,
			},
			saveUninitialized: false,
			secret: process.env.SESSION_SECRET,
			resave: false,
		})
	);

	const postRepository = getRepository(Post);
	const userRepository = getRepository(User);
	const updootRepository = getRepository(Updoot);

	const httpServer = createServer(app);
	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [HelloResolver, PostResolver, UserResolver],
			validate: false,
		}),
		plugins: [
			ApolloServerPluginDrainHttpServer({ httpServer }),
			__prod__
				? ApolloServerPluginLandingPageProductionDefault()
				: ApolloServerPluginLandingPageGraphQLPlayground(),
		],
		context: ({ req, res }): MyContext => ({
			req,
			res,
			redis,
			postRepository,
			userRepository,
			updootRepository,
			userLoader: createUserLoader(userRepository),
			updootLoader: createUpdootLoader(updootRepository),
		}),
	});
	await apolloServer.start();
	apolloServer.applyMiddleware({ app, cors: false });

	await new Promise<void>((resolve) =>
		httpServer.listen({ port: parseInt(process.env.PORT) }, resolve)
	);

	const address =
		typeof httpServer.address() === 'object'
			? (httpServer.address() as AddressInfo)
			: null;
	console.log(
		`🚀 Server ready at ${address?.address}:${address?.port}${
			apolloServer.graphqlPath
		} in ${__prod__ ? 'production' : 'development'}`
	);

	// const postRepository = orm.em.getRepository(Post);
	// const post = postRepository.create({
	// 	title: 'yes',
	// });
	// await postRepository.persistAndFlush(post);

	// const posts = await postRepository.find({});
	// console.log(posts);
};

main().catch((error) => console.error(error));
