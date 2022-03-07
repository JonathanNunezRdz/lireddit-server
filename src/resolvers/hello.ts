import { Query, Resolver } from 'type-graphql';

@Resolver()
class HelloResolver {
	@Query(() => String)
	hello() {
		return 'Hello boy';
	}
}

export default HelloResolver;
