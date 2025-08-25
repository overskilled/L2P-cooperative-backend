import { Body, Controller, Get, HttpCode, HttpStatus, NotImplementedException, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { PassportLocalGuard } from './guards/passport-local.guard';
import { SignupDto } from 'src/dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  // @UseGuards(PassportLocalGuard )
  login(@Body() input: { username: string, password: string }) {
    return this.authService.authenticate(input);
  }

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getUserInfo(@Request() request) {
    return request.user
  }

}
