import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUser } from '../interfaces/auth.interface';

/**
 * Current User decorator
 * Extracts the current authenticated user from the request
 * 
 * @example
 * @Get('/profile')
 * getProfile(@CurrentUser() user: IUser) {
 *   return { user };
 * }
 * 
 * @example
 * // Get specific user property
 * @Get('/my-id')
 * getMyId(@CurrentUser('id') userId: string) {
 *   return { userId };
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof IUser | undefined, ctx: ExecutionContext): IUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user: IUser = request.user;

    return data ? user?.[data] : user;
  },
);