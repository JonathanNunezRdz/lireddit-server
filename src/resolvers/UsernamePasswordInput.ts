import { Field, InputType } from 'type-graphql';

@InputType()
class UsernamePasswordInput {
	@Field()
	email: string;

	@Field()
	username: string;

	@Field()
	password: string;
}

export default UsernamePasswordInput;
