/**
 * Partner Onboarding Request Entity
 * Represents a company's application to join the platform
 */

export interface ServiceAreaRequest {
  state: string;
  lga: string[];
  areas?: string[]; // Specific localities within LGA
}

export type OnboardingStatus = 
  | 'pending' 
  | 'under_review' 
  | 'approved' 
  | 'rejected' 
  | 'company_created';

export interface PartnerOnboardingRequest {
  id: string;
  
  // Company Information
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  alternatePhone?: string;
  
  // Business Registration
  registrationNumber?: string;
  taxId?: string;
  businessType: 'sole_proprietorship' | 'partnership' | 'limited_company';
  
  // Company Address
  address: string;
  city: string;
  state: string;
  country: string;
  
  // Service Coverage Areas
  serviceAreas: ServiceAreaRequest[];
  
  // Contact Person/Owner
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  
  // Additional Info
  numberOfRiders?: number;
  numberOfBikes?: number;
  yearsInBusiness?: number;
  description?: string;
  websiteUrl?: string;
  
  // Status & Workflow
  status: OnboardingStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string; // Admin ID who reviewed
  approvedAt?: Date;
  rejectedAt?: Date;
  companyCreatedAt?: Date;
  
  // Admin Notes
  adminNotes?: string;
  rejectionReason?: string;
  
  // Created Company Reference
  companyId?: string; // Set when company is created
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  
  // IP & Security
  ipAddress?: string;
  userAgent?: string;
}
