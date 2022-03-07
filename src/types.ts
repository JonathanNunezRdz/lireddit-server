import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import Post from './entities/Post';
import Updoot from './entities/Updoot';
import User from './entities/User';
import createUpdootLoader from './utils/createUpdootLoader';
import createUserLoader from './utils/createUserLoader';

export type MyContext = {
	req: Request;
	res: Response;
	redis: Redis;
	postRepository: Repository<Post>;
	userRepository: Repository<User>;
	updootRepository: Repository<Updoot>;
	userLoader: ReturnType<typeof createUserLoader>;
	updootLoader: ReturnType<typeof createUpdootLoader>;
};
