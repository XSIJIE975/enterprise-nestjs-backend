import { Module } from '@nestjs/common';
import { PermissionRepository } from './permission.repository';
import { RoleRepository } from './role.repository';
import { UserRepository } from './user.repository';

@Module({
  providers: [PermissionRepository, RoleRepository, UserRepository],
  exports: [PermissionRepository, RoleRepository, UserRepository],
})
export class RepositoriesModule {}
