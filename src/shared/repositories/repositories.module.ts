import { Module } from '@nestjs/common';
import { PermissionRepository } from './permission.repository';
import { RoleRepository } from './role.repository';
import { SessionRepository } from './session.repository';
import { UserRepository } from './user.repository';

@Module({
  providers: [
    PermissionRepository,
    RoleRepository,
    SessionRepository,
    UserRepository,
  ],
  exports: [
    PermissionRepository,
    RoleRepository,
    SessionRepository,
    UserRepository,
  ],
})
export class RepositoriesModule {}
