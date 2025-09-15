import { Body, Controller, Get, HttpCode, HttpStatus, NotImplementedException, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiUnauthorizedResponse, ApiCreatedResponse, ApiOkResponse, ApiBadRequestResponse, ApiConflictResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { PassportLocalGuard } from './guards/passport-local.guard';
import { SignupDto } from 'src/dto/signup.dto';
import { LoginDto } from 'src/dto/login.dto';
import { UserProfileResponse } from 'src/dto/user-profile.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @ApiOperation({
    summary: 'User Login',
    description: 'Authenticates a user and returns access tokens for the L2P Cooperative Platform. Uses email/username and password for authentication.'
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials for authentication'
  })
  @ApiOkResponse({
    description: 'Successfully authenticated. Returns access and refresh tokens.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          email: 'user@example.com',
          username: 'johndoe'
        }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials provided. Authentication failed.'
  })
  @ApiBadRequestResponse({
    description: 'Invalid request payload or missing required fields.'
  })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  // @UseGuards(PassportLocalGuard)
  login(@Body() input: { username: string, password: string }) {
    return this.authService.authenticate(input);
  }

  @ApiOperation({
    summary: 'User Registration',
    description: 'Creates a new user account for the L2P Cooperative Platform. Requires email, username, password, and other required profile information.'
  })
  @ApiBody({
    type: SignupDto,
    description: 'User registration data including personal information and credentials'
  })
  @ApiCreatedResponse({
    description: 'User successfully registered. Returns user details and tokens.',
    schema: {
      example: {
        id: 1,
        email: 'newuser@example.com',
        username: 'newuser',
        firstName: 'John',
        lastName: 'Doe',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid registration data or missing required fields.'
  })
  @ApiConflictResponse({
    description: 'User already exists with the provided email or username.'
  })
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @ApiOperation({
    summary: 'Get User Profile',
    description: 'Retrieves the authenticated user\'s profile information. Requires a valid JWT access token in the Authorization header.'
  })
  @ApiBearerAuth('JWT-auth')
  @ApiOkResponse({
    description: 'Successfully retrieved user profile information.',
    type: UserProfileResponse
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token. Please login again.'
  })
  @UseGuards(AuthGuard)
  @Get('profile')
  getUserInfo(@Request() request) {
    return request.user;
  }
}