import UsernamePasswordInput from '../resolvers/UsernamePasswordInput';
import validateEmail from './validateEmail';

const validateRegister = (options: UsernamePasswordInput) => {
	if (!validateEmail(options.email))
		return [
			{
				field: 'email',
				message: 'Email not valid',
			},
		];

	if (options.username.length <= 2)
		return [
			{
				field: 'username',
				message: 'Username length must be greater than 2',
			},
		];

	if (options.password.length <= 2)
		return [
			{
				field: 'password',
				message: 'Password length must be greater than 2',
			},
		];

	return null;
};

export default validateRegister;
