import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LocationContextDto {
  @ApiProperty({ description: 'Latitude of current map center' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude of current map center' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Current map zoom level', required: false })
  @IsOptional()
  @IsNumber()
  zoom?: number;

  @ApiProperty({ description: 'Visible map bounds', required: false })
  @IsOptional()
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };

  @ApiProperty({ description: 'Address or location name', required: false })
  @IsOptional()
  @IsString()
  address?: string;
}

export class MapChatRequestDto {
  @ApiProperty({ description: 'User message/question' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Current location context on the map' })
  @ValidateNested()
  @Type(() => LocationContextDto)
  location: LocationContextDto;

  @ApiProperty({ description: 'Conversation ID for maintaining chat history', required: false })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ description: 'Previous messages for context', required: false })
  @IsOptional()
  @IsArray()
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export class MapChatResponseDto {
  @ApiProperty({ description: 'AI response message' })
  message: string;

  @ApiProperty({ description: 'Conversation ID' })
  conversationId: string;

  @ApiProperty({ description: 'Suggested places or locations', required: false })
  suggestedPlaces?: Array<{
    name: string;
    type: string;
    location?: { lat: number; lng: number };
    distance?: number;
  }>;

  @ApiProperty({ description: 'Map actions to perform', required: false })
  mapActions?: {
    centerTo?: { lat: number; lng: number };
    zoom?: number;
    drawMarkers?: Array<{ lat: number; lng: number; label: string }>;
    searchQuery?: string;
  };
}
