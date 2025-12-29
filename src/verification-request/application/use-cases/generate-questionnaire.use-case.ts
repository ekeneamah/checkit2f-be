import { Injectable, Logger, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { GeminiQuestionnaireService, Questionnaire } from '../../../external-services/gemini-ai/gemini-questionnaire.service';
import { IVerificationRequestRepository } from '../interfaces/verification-request.repository.interface';

@Injectable()
export class GenerateQuestionnaireUseCase {
  private readonly logger = new Logger(GenerateQuestionnaireUseCase.name);

  constructor(
    private readonly questionnaireService: GeminiQuestionnaireService,
    @Inject('IVerificationRequestRepository')
    private readonly verificationRequestRepository: IVerificationRequestRepository,
  ) {}

  /**
   * Generate questionnaire for a verification request
   * @param verificationRequestId - The verification request ID
   * @param agentId - The agent requesting the questionnaire (for authorization)
   */
  async execute(verificationRequestId: string, agentId?: string): Promise<Questionnaire> {
    this.logger.log(`Generating questionnaire for verification request: ${verificationRequestId}`);

    // Get verification request
    const request = await this.verificationRequestRepository.findById(verificationRequestId);
    if (!request) {
      throw new NotFoundException(`Verification request ${verificationRequestId} not found`);
    }

    // Authorization: Verify agent is assigned to this request
    if (agentId && request.assignedAgentId && request.assignedAgentId !== agentId) {
      this.logger.warn(`Agent ${agentId} attempted to access questionnaire for request assigned to ${request.assignedAgentId}`);
      throw new ForbiddenException('You are not authorized to access this verification request');
    }

    // Generate questionnaire using Gemini AI
    const questionnaire = await this.questionnaireService.generateQuestionnaire(
      request.verificationType.type,
      request.description,
      request.verificationType.specialInstructions,
    );

    this.logger.log(`Questionnaire generated successfully with ${questionnaire.items.length} items`);
    return questionnaire;
  }
}
