import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && await bcrypt.compare(password, user.password_hash)) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
    await this.supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      grade: user.grade 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        grade: user.grade,
        display_name: user.display_name,
      },
    };
  }

  async register(createUserDto: CreateUserDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Create user
    const { data: user, error } = await this.supabase
      .from('users')
      .insert({
        email: createUserDto.email,
        password_hash: hashedPassword,
        role: createUserDto.role || 'student',
        grade: createUserDto.grade,
      })
      .select('id, email, role, grade')
      .single();

    if (error) {
      throw new ConflictException('Failed to create user');
    }

    // Create user profile
    await this.supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        display_name: createUserDto.display_name || createUserDto.email.split('@')[0],
      });

    // Initialize bandit model for students
    if (user.role === 'student') {
      await this.initializeBanditModel(user.id);
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      grade: user.grade 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  private async initializeBanditModel(userId: string) {
    const contextFeatures = {
      time_of_day: 'morning',
      session_length: 0,
      recent_performance: 0.5,
      engagement_level: 0.5,
    };

    const armParameters = {
      easy: { alpha: 1, beta: 1 },
      medium: { alpha: 1, beta: 1 },
      hard: { alpha: 1, beta: 1 },
    };

    await this.supabase
      .from('bandit_models')
      .insert({
        user_id: userId,
        context_features: contextFeatures,
        arm_parameters: armParameters,
      });
  }

  async refreshToken(userId: string) {
    const user = await this.usersService.findById(userId);
    
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid user');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      grade: user.grade 
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
