import { UserResponse } from '../../../domain/models/user';

export class AuthResponseDto {
  user: UserResponse;
  token: string;
}
