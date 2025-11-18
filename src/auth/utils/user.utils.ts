import { IUser } from '../interfaces/auth.interface';
import { UserResponseDto } from '../dto/auth.dto';

/**
 * Helper function to convert IUser to UserResponseDto
 * Handles both Date objects and Firestore Timestamps
 */
export function convertUserToResponseDto(user: IUser): UserResponseDto {
  // Helper to convert Date or Firestore Timestamp to ISO string
  const toISOString = (dateOrTimestamp: any): string => {
    if (!dateOrTimestamp) return undefined;
    if (typeof dateOrTimestamp === 'string') return dateOrTimestamp;
    if (dateOrTimestamp.toDate) return dateOrTimestamp.toDate().toISOString(); // Firestore Timestamp
    if (dateOrTimestamp.toISOString) return dateOrTimestamp.toISOString(); // Date object
    return new Date(dateOrTimestamp).toISOString(); // Fallback
  };

  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    phoneNumber: user.phoneNumber,
    phoneVerified: user.phoneVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: toISOString(user.lastLoginAt),
    createdAt: toISOString(user.createdAt),
    updatedAt: toISOString(user.updatedAt),
  };
}