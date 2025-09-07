import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  findAll() {
    return [];
  }

  findOne(id: number) {
    return null;
  }

  create(createUserDto: any) {
    return {};
  }

  update(id: number, updateUserDto: any) {
    return {};
  }

  remove(id: number) {
    return {};
  }
}
