/**
 * User roles enumeration for RBAC
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN', 
  AGENT_MANAGER = 'AGENT_MANAGER',
  AGENT = 'AGENT',
  CLIENT = 'CLIENT',
  GUEST = 'GUEST',
}

/**
 * Permissions enumeration
 */
export enum Permission {
  // Verification Request Permissions
  CREATE_VERIFICATION_REQUEST = 'CREATE_VERIFICATION_REQUEST',
  READ_VERIFICATION_REQUEST = 'READ_VERIFICATION_REQUEST',
  UPDATE_VERIFICATION_REQUEST = 'UPDATE_VERIFICATION_REQUEST',
  DELETE_VERIFICATION_REQUEST = 'DELETE_VERIFICATION_REQUEST',
  ASSIGN_VERIFICATION_REQUEST = 'ASSIGN_VERIFICATION_REQUEST',
  
  // User Management Permissions
  CREATE_USER = 'CREATE_USER',
  READ_USER = 'READ_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  MANAGE_USER_ROLES = 'MANAGE_USER_ROLES',
  
  // Agent Permissions
  ACCEPT_ASSIGNMENT = 'ACCEPT_ASSIGNMENT',
  COMPLETE_VERIFICATION = 'COMPLETE_VERIFICATION',
  UPLOAD_REPORT = 'UPLOAD_REPORT',
  
  // Payment Permissions
  PROCESS_PAYMENT = 'PROCESS_PAYMENT',
  VIEW_PAYMENT_DETAILS = 'VIEW_PAYMENT_DETAILS',
  ISSUE_REFUND = 'ISSUE_REFUND',
  
  // Admin Permissions
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  MANAGE_SYSTEM_SETTINGS = 'MANAGE_SYSTEM_SETTINGS',
  ACCESS_AUDIT_LOGS = 'ACCESS_AUDIT_LOGS',
  
  // API Key Permissions
  MANAGE_API_KEYS = 'MANAGE_API_KEYS',
  ACCESS_EXTERNAL_APIS = 'ACCESS_EXTERNAL_APIS',
  API_KEY_CREATE = 'API_KEY_CREATE',
  API_KEY_READ = 'API_KEY_READ',
  API_KEY_UPDATE = 'API_KEY_UPDATE',
  API_KEY_DELETE = 'API_KEY_DELETE',
}

/**
 * Role-Permission mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    // All permissions
    ...Object.values(Permission),
  ],
  
  [UserRole.ADMIN]: [
    Permission.CREATE_VERIFICATION_REQUEST,
    Permission.READ_VERIFICATION_REQUEST,
    Permission.UPDATE_VERIFICATION_REQUEST,
    Permission.DELETE_VERIFICATION_REQUEST,
    Permission.ASSIGN_VERIFICATION_REQUEST,
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.MANAGE_USER_ROLES,
    Permission.PROCESS_PAYMENT,
    Permission.VIEW_PAYMENT_DETAILS,
    Permission.ISSUE_REFUND,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_SYSTEM_SETTINGS,
    Permission.ACCESS_AUDIT_LOGS,
    Permission.MANAGE_API_KEYS,
    Permission.API_KEY_CREATE,
    Permission.API_KEY_READ,
    Permission.API_KEY_UPDATE,
    Permission.API_KEY_DELETE,
  ],
  
  [UserRole.AGENT_MANAGER]: [
    Permission.READ_VERIFICATION_REQUEST,
    Permission.UPDATE_VERIFICATION_REQUEST,
    Permission.ASSIGN_VERIFICATION_REQUEST,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.VIEW_PAYMENT_DETAILS,
    Permission.VIEW_ANALYTICS,
  ],
  
  [UserRole.AGENT]: [
    Permission.READ_VERIFICATION_REQUEST,
    Permission.UPDATE_VERIFICATION_REQUEST,
    Permission.ACCEPT_ASSIGNMENT,
    Permission.COMPLETE_VERIFICATION,
    Permission.UPLOAD_REPORT,
    Permission.READ_USER,
  ],
  
  [UserRole.CLIENT]: [
    Permission.CREATE_VERIFICATION_REQUEST,
    Permission.READ_VERIFICATION_REQUEST,
    Permission.UPDATE_VERIFICATION_REQUEST,
    Permission.PROCESS_PAYMENT,
    Permission.VIEW_PAYMENT_DETAILS,
    Permission.READ_USER,
    Permission.UPDATE_USER,
  ],
  
  [UserRole.GUEST]: [
    Permission.READ_VERIFICATION_REQUEST,
    Permission.READ_USER,
  ],
};

/**
 * User authentication interface
 */
export interface IUser {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified: boolean;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  permissions: Permission[];
  provider?: string;
  passwordHash?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * JWT Payload interface
 */
export interface IJwtPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  permissions: Permission[];
  iat: number;
  exp?: number; // Optional - JWT library will add this based on expiresIn option
  type: 'access' | 'refresh';
}

/**
 * Authentication result interface
 */
export interface IAuthResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Firebase user interface
 */
export interface IFirebaseUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  provider?: string;
  providerData: Array<{
    uid: string;
    email?: string;
    phoneNumber?: string;
    displayName?: string;
    photoURL?: string;
    providerId: string;
  }>;
  customClaims?: Record<string, any>;
}

/**
 * API Key interface
 */
export interface IApiKey {
  id: string;
  name: string;
  description?: string;
  key: string;
  keyHash?: string;
  permissions: Permission[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}