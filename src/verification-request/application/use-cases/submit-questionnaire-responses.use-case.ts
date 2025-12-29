import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { IVerificationRequestRepository } from '../interfaces/verification-request.repository.interface';
import { GeminiQuestionnaireService } from '../../../external-services/gemini-ai/gemini-questionnaire.service';

export interface QuestionnaireResponseData {
  responses: Record<string, any>;
  photoUrls?: string[];
}

export interface QuestionnaireReport {
  summary: string;
  verificationRequestId: string;
  submittedAt: Date;
  responses: Record<string, any>;
  photoUrls?: string[];
}

@Injectable()
export class SubmitQuestionnaireResponsesUseCase {
  private readonly logger = new Logger(SubmitQuestionnaireResponsesUseCase.name);

  constructor(
    @Inject('IVerificationRequestRepository')
    private readonly verificationRequestRepository: IVerificationRequestRepository,
    private readonly questionnaireService: GeminiQuestionnaireService,
  ) {}

  /**
   * Submit questionnaire responses and generate AI report
   * @param verificationRequestId - The verification request ID
   * @param agentId - The agent submitting responses
   * @param responseData - The questionnaire responses
   */
  async execute(
    verificationRequestId: string,
    agentId: string,
    responseData: QuestionnaireResponseData,
  ): Promise<QuestionnaireReport> {
    this.logger.log(`Submitting questionnaire responses for request: ${verificationRequestId}`);

    // Get verification request
    const request = await this.verificationRequestRepository.findById(verificationRequestId);
    if (!request) {
      throw new NotFoundException(`Verification request ${verificationRequestId} not found`);
    }

    // Authorization: Verify agent is assigned to this request
    if (request.assignedAgentId !== agentId) {
      this.logger.warn(`Agent ${agentId} attempted to submit responses for request assigned to ${request.assignedAgentId}`);
      throw new ForbiddenException('You are not authorized to submit responses for this verification request');
    }

    // Validate responses are not empty
    if (!responseData.responses || Object.keys(responseData.responses).length === 0) {
      throw new BadRequestException('Responses cannot be empty');
    }

    // Generate questionnaire to get the structure
    const questionnaire = await this.questionnaireService.generateQuestionnaire(
      request.verificationType.type,
      request.description,
      request.verificationType.specialInstructions,
    );

    // Validate required fields are answered
    const missingRequired = questionnaire.items
      .filter(item => item.required && !responseData.responses[item.id])
      .map(item => item.id);

    if (missingRequired.length > 0) {
      throw new BadRequestException(`Missing required responses: ${missingRequired.join(', ')}`);
    }

    // Generate AI report from responses
    const report = await this.questionnaireService.compileReport(questionnaire, responseData.responses);

    // Create report object
    const questionnaireReport: QuestionnaireReport = {
      summary: report,
      verificationRequestId,
      submittedAt: new Date(),
      responses: responseData.responses,
      photoUrls: responseData.photoUrls,
    };

    // TODO: Store report in database (could be a separate collection or part of verification request)
    // For now, we're just returning it. In production, you'd want to persist this.
    
    this.logger.log(`Questionnaire report generated successfully for request: ${verificationRequestId}`);
    return questionnaireReport;
  }
}
