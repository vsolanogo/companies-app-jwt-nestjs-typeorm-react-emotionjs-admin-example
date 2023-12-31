import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { IsString, IsEmail, IsArray } from 'class-validator';
import { Company } from '../company/company.entity';
import { Role } from '../models/models';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => Company, (i) => i.user)
  companies: Company[];

  @Column({ default: [Role.User], type: 'simple-array' })
  @IsArray()
  roles: string[];

  @Column({ nullable: false, length: 255, unique: true })
  @IsString()
  @IsEmail()
  email: string;

  @Column({ nullable: false })
  password: string;

  @Column({ nullable: false })
  @IsString()
  phoneNumber: string;

  @Column()
  @IsString()
  lastName: string;

  @Column()
  @IsString()
  firstName: string;

  @Column({ nullable: false, length: 50, unique: true })
  @IsString()
  nickName: string;

  @Column({ type: 'text', nullable: false })
  @IsString()
  description: string;

  @Column({ nullable: false })
  @IsString()
  position: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export type UserWithoutPassword = Omit<User, 'password'>;
