import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async validateUser(_username: string, _password: string) {
    return null;
  }

  async login(_user: any) {
    return {};
  }

  async refreshToken(_refreshToken: string) {
    return {};
  }
}
