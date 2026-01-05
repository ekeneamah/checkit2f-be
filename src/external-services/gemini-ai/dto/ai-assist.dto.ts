import { IsString, IsOptional, IsEnum, IsArray, MaxLength, ArrayMaxSize } from 'class-validator';
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

/**
 * DTO for Refine Instructions Request
 */
export class RefineInstructionsRequestDto {
  @ApiProperty({
    description: 'Raw instructions text entered by the user (can contain bullet points, new lines, etc.)',
    example: '• Take clear photo of building\n• Check security features\n• Verify the addres matches',
  })
  @IsString()
  @MaxLength(5000)
  rawInstructions: string;

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
}

/**
 * DTO for Refine Instructions Response
 */
export class RefineInstructionsResponseDto {
  @ApiProperty({
    description: 'Whether refinement was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Array of refined, cleaned instructions (max 10)',
    example: [
      'Take a clear photo of the building frontage',
      'Verify the security features are in place',
      'Confirm the address matches the location',
    ],
  })
  refinedInstructions: string[];

  @ApiProperty({
    description: 'Original count of instructions parsed from input',
    example: 3,
  })
  originalCount: number;

  @ApiPropertyOptional({
    description: 'Warning message if instructions were truncated or had issues',
    example: 'Instructions limited to 10 items. 2 items were removed.',
  })
  warning?: string;

  @ApiPropertyOptional({
    description: 'Summary of changes made',
    example: 'Fixed 2 spelling errors, improved clarity of 3 instructions',
  })
  changesSummary?: string;
}
