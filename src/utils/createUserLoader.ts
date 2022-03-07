import DataLoader from 'dataloader';
import { Repository } from 'typeorm';
import User from '../entities/User';

const createUserLoader = (userRepository: Repository<User>) =>
	new DataLoader<number, User>(async (userIds) => {
		const users = await userRepository.findByIds(userIds as number[]);
		const userIdToUser: Record<number, User> = {};
		users.forEach((u) => {
			userIdToUser[u.id] = u;
		});

		const sortedUsers = userIds.map((userId) => userIdToUser[userId]);
		return sortedUsers;
	});

export default createUserLoader;
