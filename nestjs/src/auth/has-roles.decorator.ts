import { SetMetadata } from '@nestjs/common';
import { Role } from '../models/models';

export const HasRoles = (...roles: Role[]) => SetMetadata('roles', roles);
