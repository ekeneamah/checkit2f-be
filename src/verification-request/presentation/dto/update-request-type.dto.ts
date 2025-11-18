import { PartialType } from '@nestjs/mapped-types';
import { CreateRequestTypeDto } from './create-request-type.dto';

/**
 * DTO for updating an existing request type
 * All fields are optional using PartialType from @nestjs/mapped-types
 */
export class UpdateRequestTypeDto extends PartialType(CreateRequestTypeDto) {}
