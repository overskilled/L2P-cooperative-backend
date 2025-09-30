import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { SignupDto } from 'src/dto/signup.dto';
import { LoginDto } from 'src/dto/login.dto';
import { UserProfileResponse } from 'src/dto/user-profile.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // ------------------- LOGIN -------------------
  @ApiOperation({
    summary: 'User Login',
    description:
      'Authenticates a user and returns access tokens for the L2P Cooperative Platform.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Successfully authenticated',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() input: { username: string; password: string }) {
    return this.authService.authenticate(input);
  }

  // ------------------- SIGNUP -------------------
  @ApiOperation({
    summary: 'User Registration',
    description:
      'Creates a new user account for the L2P Cooperative Platform.',
  })
  @ApiBody({ type: SignupDto })
  @ApiCreatedResponse({
    description: 'User successfully registered.',
  })
  @ApiConflictResponse({
    description: 'User already exists.',
  })
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  // ------------------- PROFILE -------------------
  @ApiOperation({
    summary: 'Get User Profile',
    description:
      "Retrieves the authenticated user's profile information. Requires a valid JWT access token.",
  })
  @ApiBearerAuth('JWT-auth')
  @ApiOkResponse({ type: UserProfileResponse })
  @UseGuards(AuthGuard)
  @Get('profile')
  getUserInfo(@Request() request) {
    return request.user;
  }

  // ------------------- FORGOT PASSWORD -------------------
  @ApiOperation({
    summary: 'Request Password Reset',
    description:
      'Sends a reset password link to the provided email if the account exists.',
  })
  @ApiBody({
    schema: {
      example: { email: 'user@example.com' },
    },
  })
  @ApiOkResponse({
    description: 'Password reset link sent to user email',
  })
  @ApiBadRequestResponse({
    description: 'Invalid email or missing field',
  })
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.sendPasswordResetLink(email);
  }

  // ------------------- RESET PASSWORD -------------------
  @ApiOperation({
    summary: 'Reset User Password',
    description:
      'Resets the password for the account associated with the provided email.',
  })
  @ApiBody({
    schema: {
      example: {
        email: 'user@example.com',
        newPassword: 'StrongPassword123!',
      },
    },
  })
  @ApiOkResponse({
    description: 'Password reset successful',
  })
  @ApiBadRequestResponse({
    description: 'Invalid reset request or missing data',
  })
  @Post('reset-password')
  async resetPassword(
    @Body('email') email: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(email, newPassword);
  }

  @Delete('user/:id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') userId: string) {
    return await this.authService.deleteUser(userId);
  }
}
