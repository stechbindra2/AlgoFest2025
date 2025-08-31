import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ 
    description: 'Display name',
    example: 'Alex Smith',
    required: false 
  })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiProperty({ 
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false 
  })
  @IsOptional()
  @IsUrl()
  avatar_url?: string;

  @ApiProperty({ 
    description: 'Preferred learning style',
    example: 'visual',
    required: false 
  })
  @IsOptional()
  @IsString()
  preferred_learning_style?: string;

  @ApiProperty({ 
    description: 'Accessibility settings as JSON',
    example: '{"font_size": "large", "high_contrast": true}',
    required: false 
  })
  @IsOptional()
  accessibility_settings?: any;
}
