import DataLoader from 'dataloader';
import { Repository } from 'typeorm';
import Updoot from '../entities/Updoot';

const createUpdootLoader = (updootRepository: Repository<Updoot>) =>
	new DataLoader<{ postId: number; userId: number }, Updoot | null>(
		async (updootIds) => {
			const updoots = await updootRepository.findByIds(
				updootIds as any[]
			);
			const updootIdsToUpdoot: Record<string, Updoot> = {};
			updoots.forEach((updoot) => {
				updootIdsToUpdoot[`${updoot.userId}|${updoot.postId}`] = updoot;
			});

			return updootIds.map(
				(updootId) =>
					updootIdsToUpdoot[`${updootId.userId}|${updootId.postId}`]
			);
		}
	);

export default createUpdootLoader;
