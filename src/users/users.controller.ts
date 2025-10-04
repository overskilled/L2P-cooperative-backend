import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Query,
  Patch,
  ForbiddenException,
  Req,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SignupDto } from 'src/dto/signup.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PaginationDto } from 'src/dto/pagination.dto';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { RoleType } from 'src/types/user';
import { AuthenticatedRequest } from 'src/auth/auth.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // GET /users → list all users
  @Get()
  @UseGuards(AuthGuard)
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async findAll(
    @Query() pagination: PaginationDto = { page: 1, limit: 10 },
  ) {
    return this.usersService.getUsers(pagination);
  }

  // GET /users/:id → get user details
  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Get("profile")
  @UseGuards(AuthGuard)
  async profile(@Request() req) {
    console.log("User Object from JWT:", req.user);
    return this.usersService.getUserById(req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<SignupDto>
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }


  // POST /users → create a new user
  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() createUserDto: SignupDto) {
    return this.usersService.createUser(createUserDto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/make-admin')
  async makeAdmin(@Param('id') userId: string, @Req() req: any) {
    // Ensure the requesting user is an ADMIN
    if (req.user.roleType !== RoleType.ADMIN) {
      throw new ForbiddenException('Only admins can promote users');
    }

    return this.usersService.makeAdmin(userId);
  }

  // Create user account
  @UseGuards(AuthGuard)
  @Post('createAccount')
  async createUserAccount(@Body() dto: SignupDto, @Req() req: any) {
    // Ensure the requesting user is an ADMIN
    if (req.user.roleType !== RoleType.ADMIN) {
      throw new ForbiddenException('Only admins can create users accounts');
    }

    return this.usersService.createUserAccount(dto);
  }
  
  // @UseGuards(AuthGuard)
  // @Post('admin-stats')
  // async createUserAccount(@Body() dto: SignupDto, @Req() req: any) {
  //   // Ensure the requesting user is an ADMIN
  //   if (req.user.roleType !== RoleType.ADMIN) {
  //     throw new ForbiddenException('Only admins can create users accounts');
  //   }

  //   return this.usersService.createUserAccount(dto);
  // }

  // PUT /users/:id → update user details
  @Put(':id')
  @UseGuards(AuthGuard)
  async update(
    @Param() id: string,
    @Body() updateUserDto: Partial<SignupDto>,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  // DELETE /users/:id → soft delete a user
  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Param() id: string) {
    return this.usersService.softDeleteUser(id);
  }
}
