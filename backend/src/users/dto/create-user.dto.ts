import { IsEmail, IsString, IsOptional, IsInt, Min, Max, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'student@example.com' 
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: 'User password',
    example: 'securepassword123',
    minLength: 6 
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ 
    description: 'Display name for the user',
    example: 'Alex Smith',
    required: false 
  })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiProperty({ 
    description: 'User grade level (3-7)',
    example: 5,
    minimum: 3,
    maximum: 7,
    required: false 
  })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(7)
  grade?: number;

  @ApiProperty({ 
    description: 'User role',
    example: 'student',
    enum: ['student', 'teacher', 'admin'],
    default: 'student' 
  })
  @IsOptional()
  @IsString()
  role?: 'student' | 'teacher' | 'admin';
}
