import { IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for individual questionnaire response
 */
export class QuestionnaireResponseDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsNotEmpty()
  answer: any; // Can be string, boolean, number, or file reference
}

/**
 * DTO for submitting questionnaire responses
 */
export class SubmitQuestionnaireResponsesDto {
  @IsObject()
  @IsNotEmpty()
  responses: Record<string, any>; // Map of questionId to answer

  @IsString({ each: true })
  photoUrls?: string[]; // URLs of uploaded photos
}
