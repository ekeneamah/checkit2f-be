import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for AI Assist Chat Request
 */
export class AIAssistChatRequestDto {
  @ApiProperty({
    description: 'User query or question about verification requirements',
    example: 'property condition',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Location type (point, street, area)',
    example: 'point',
  })
  @IsEnum(['point', 'street', 'area'])
  locationType: 'point' | 'street' | 'area';

  @ApiPropertyOptional({
    description: 'Location address for context',
    example: '123 Victoria Island, Lagos',
  })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiPropertyOptional({
    description: 'Current description being built',
    example: 'Verify the property condition',
  })
  @IsOptional()
  @IsString()
  currentDescription?: string;
}

/**
 * DTO for AI Assist Chat Response
 */
export class AIAssistChatResponseDto {
  @ApiProperty({
    description: 'AI response message',
    example: 'Here are some verification questions for "property condition":',
  })
  message: string;

  @ApiProperty({
    description: 'List of suggested verification questions',
    example: [
      'Please verify the overall structural condition of the building, including walls, roof, and foundation.',
      'Check for any visible cracks, water damage, or signs of deterioration.',
    ],
  })
  suggestions: string[];

  @ApiPropertyOptional({
    description: 'Additional context or tips',
  })
  context?: string;
}
