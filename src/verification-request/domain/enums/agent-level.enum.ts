/**
 * Agent Level/Qualification Enumeration
 * Defines agent qualification levels for different request types
 */
export enum AgentLevel {
  BASIC = 'BASIC',               // Entry-level agents (Standard Verification)
  VERIFIED = 'VERIFIED',         // Verified agents with good track record (Discovery, Comparison)
  PROFESSIONAL = 'PROFESSIONAL', // Professional agents (Site Survey, Compliance)
  EXPERT = 'EXPERT',             // Expert agents (Complex surveys, specialized tasks)
}
