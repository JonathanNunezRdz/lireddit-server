import {
	Arg,
	Ctx,
	Field,
	FieldResolver,
	InputType,
	Int,
	Mutation,
	ObjectType,
	Query,
	Resolver,
	Root,
	UseMiddleware,
} from 'type-graphql';
import { getConnection } from 'typeorm';
import Post from '../entities/Post';
import User from '../entities/User';
import isAuth from '../middleware/isAuth';
import { MyContext } from '../types';

@InputType()
class PostInput {
	@Field()
	title: string;

	@Field()
	text: string;
}

@ObjectType()
class PaginatedPosts {
	@Field(() => [Post])
	posts: Post[];

	@Field()
	hasMore: boolean;
}

@Resolver(Post)
class PostResolver {
	@FieldResolver(() => String)
	textSnippet(@Root() root: Post): string {
		return root.text.slice(0, 100);
	}

	@FieldResolver(() => User)
	creator(
		@Root() post: Post,
		@Ctx() { userLoader }: MyContext
	): Promise<User> {
		return userLoader.load(post.creatorId);
	}

	@FieldResolver(() => Int, { nullable: true })
	async voteStatus(
		@Root() post: Post,
		@Ctx() { updootLoader, req }: MyContext
	): Promise<number | null> {
		if (!req.session.userId) return null;
		const updoot = await updootLoader.load({
			postId: post.id,
			userId: req.session.userId,
		});
		return updoot ? updoot.value : null;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(isAuth)
	async vote(
		@Arg('postId', () => Int!) postId: number,
		@Arg('value', () => Int!) value: number,
		@Ctx()
		{ req, userRepository, postRepository, updootRepository }: MyContext
	): Promise<boolean> {
		const isUpdoot = value !== -1;
		const realValue = isUpdoot ? 1 : -1;
		const { userId } = req.session;

		const user = await userRepository.findOneOrFail(userId);
		const post = await postRepository.findOneOrFail(postId);
		const updoot = await updootRepository.findOne({
			userId,
			postId,
		});

		// user has voted but will change their vote
		if (updoot && updoot.value !== realValue) {
			try {
				updoot.value = realValue;
				await updoot.save();
				post.points += 2 * realValue;
				await post.save();
				return true;
			} catch (error) {
				return false;
			}
		}

		// user will cancel their vote
		// if (updoot && updoot.value === realValue) {
		// 	await updootRepository.delete({ userId, postId });
		// 	post.points -= realValue;
		// 	await post.save();
		// 	return true;
		// }

		// user hasnt voted
		if (!updoot) {
			try {
				await updootRepository.insert({
					user,
					post,
					value: realValue,
				});
			} catch (error) {
				return false;
			}

			post.points += realValue;
			await post.save();
			return true;
		}

		return false;

		// const complete = await getManager().transaction<boolean>(
		// 	async (em) => {
		// 		const userRepo = em.getRepository(User);
		// 		const postRepo = em.getRepository(Post);
		// 		const updootRepo = em.getRepository(Updoot);

		// 		const user = await userRepo.findOneOrFail(
		// 			userId
		// 		);
		// 		const post = await postRepo.findOneOrFail(
		// 			postId
		// 		);

		// 		try {
		// 			await updootRepo.insert({
		// 				user,
		// 				post,
		// 				value: realValue,
		// 			});
		// 		} catch (error) {
		// 			return false;
		// 		}

		// 		await postRepo.increment(
		// 			{
		// 				id: postId,
		// 			},
		// 			'points',
		// 			realValue
		// 		);

		// 		return true;
		// 	}
		// );
	}

	@Query(() => PaginatedPosts)
	async posts(
		@Arg('limit', () => Int!) limit: number,
		@Arg('cursor', () => String, { nullable: true })
		cursor: string | null
	): Promise<PaginatedPosts> {
		const realLimit = Math.min(50, limit);
		const realLimitPlusOne = realLimit + 1;

		// console.log('request', req);
		// NA1w7zuWNYeldpj1smq_-HOtd7NQIMpP
		// kMOZJDWCd2VW2m1rZ_DLQ4PVCabu3bJo

		const replacements: any[] = [
			realLimitPlusOne,
			cursor || new Date().toISOString(),
		];

		const posts = await getConnection().query(
			`
			SELECT p.*
			FROM post p
			WHERE p."createdAt" < $2
			ORDER BY p."createdAt" DESC
			LIMIT $1
		`,
			replacements
		);

		// const qb = getRepository(Post)
		// 	.createQueryBuilder('p')
		// 	// .innerJoinAndSelect(
		// 	// 	'p.creator',
		// 	// 	'u',
		// 	// 	'u.id = p."creatorId"'
		// 	// )
		// 	.orderBy('p."createdAt"', 'DESC')
		// 	.take(realLimitPlusOne);

		// if (cursor) qb.where('p."createdAt" < :cursor', { cursor });
		// const posts = await qb.getMany();

		// const posts = await postRepository.find({
		// 	where: {
		// 		createdAt: LessThan(cursor || new Date().toISOString()),
		// 		updoots: {
		// 			userId: req.session.userId,
		// 		},
		// 	},
		// 	order: { createdAt: 'DESC' },
		// 	take: realLimitPlusOne,
		// 	relations: ['creator', 'updoots'],
		// });

		const sendPosts = posts.slice(0, realLimit);

		// const sendPosts = posts.slice(0, realLimit).map((post: Post) => {
		// 	return {
		// 		...post,
		// 		creator: {
		// 			...post.creator,
		// 			createdAt: new Date(post.creator.createdAt),
		// 			updatedAt: new Date(post.creator.updatedAt),
		// 		},
		// 	};
		// });

		return {
			posts: sendPosts,
			hasMore: posts.length === realLimitPlusOne,
		};
	}

	@Query(() => Post, { nullable: true })
	post(
		@Arg('id', () => Int!) id: number,
		@Ctx() { postRepository }: MyContext
	): Promise<Post> {
		return postRepository.findOneOrFail(id, {
			relations: ['creator'],
		});
	}

	@Mutation(() => Post)
	@UseMiddleware(isAuth)
	async createPost(
		@Arg('input') input: PostInput,
		@Ctx() { req, postRepository, userRepository }: MyContext
	): Promise<Post> {
		const creator = await userRepository.findOneOrFail(req.session.userId);

		const post = await postRepository
			.create({
				...input,
				creator,
			})
			.save();

		return post;
	}

	@Mutation(() => Post, { nullable: true })
	@UseMiddleware(isAuth)
	async updatePost(
		@Arg('id', () => Int!) id: number,
		@Arg('title') title: string,
		@Arg('text') text: string,
		@Ctx() { postRepository, req }: MyContext
	): Promise<Post | null> {
		const result = await postRepository
			.createQueryBuilder()
			.update()
			.set({ title, text })
			.where('id = :id', { id })
			.andWhere('"creatorId" = :creatorId', {
				creatorId: req.session.userId,
			})
			.returning('*')
			.execute();
		// const result = await postRepository.update(
		// 	{ id, creator: { id: req.session.userId } },
		// 	{ title, text }
		// );
		// const post = await postRepository.findOneOrFail(id);
		// post.title = title;
		// post.text = text;
		// await post.save();

		return result.raw[0];
	}

	@Mutation(() => Boolean)
	@UseMiddleware(isAuth)
	async deletePost(
		@Arg('id', () => Int!) id: number,
		@Ctx() { req, postRepository }: MyContext
	): Promise<boolean> {
		// const post = await postRepository.findOne(id, {
		// 	relations: ['creator'],
		// });
		// if (!post) return false;
		// if (post.creator.id !== req.session.userId) {
		// 	throw new Error('not authorized');
		// }

		// await updootRepository.delete({ postId: id });
		// await post.remove();

		// delete post and updoots (by CASCADE)
		await postRepository.delete({
			id,
			creator: { id: req.session.userId },
		});
		return true;
	}
}

export default PostResolver;
