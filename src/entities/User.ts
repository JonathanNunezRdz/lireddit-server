import { Field, ObjectType } from 'type-graphql';
import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import Post from './Post';
import Updoot from './Updoot';

@ObjectType()
@Entity()
class User extends BaseEntity {
	@Field()
	@PrimaryGeneratedColumn()
	id!: number;

	@Field()
	@Column({ unique: true })
	username!: string;

	@Field()
	@Column({ unique: true })
	email!: string;

	@Column()
	password!: string;

	@OneToMany(() => Post, (post) => post.creator)
	posts: Post[];

	@OneToMany(() => Updoot, (updoot) => updoot.user)
	updoots: Updoot[];

	@Field(() => Date)
	@CreateDateColumn({ type: 'timestamptz' })
	createdAt: Date;

	@Field(() => Date)
	@UpdateDateColumn({ type: 'timestamptz' })
	updatedAt: Date;
}

export default User;
