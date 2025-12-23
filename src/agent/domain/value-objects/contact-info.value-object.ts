import { BadRequestException } from '@nestjs/common';

/**
 * Agent Contact Information Value Object
 */
export class ContactInfo {
  private constructor(
    private readonly _email: string,
    private readonly _phoneNumber: string,
    private readonly _emergencyContact?: string,
  ) {
    this.validate();
  }

  static create(email: string, phoneNumber: string, emergencyContact?: string): ContactInfo {
    return new ContactInfo(email, phoneNumber, emergencyContact);
  }

  private validate(): void {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this._email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Phone number validation (basic)
    if (!this._phoneNumber || this._phoneNumber.trim().length < 10) {
      throw new BadRequestException('Phone number must be at least 10 digits');
    }

    if (this._emergencyContact && this._emergencyContact.trim().length < 10) {
      throw new BadRequestException('Emergency contact must be at least 10 digits');
    }
  }

  get email(): string {
    return this._email;
  }

  get phoneNumber(): string {
    return this._phoneNumber;
  }

  get emergencyContact(): string | undefined {
    return this._emergencyContact;
  }

  toJSON() {
    return {
      email: this._email,
      phoneNumber: this._phoneNumber,
      emergencyContact: this._emergencyContact,
    };
  }

  static fromJSON(data: any): ContactInfo {
    return new ContactInfo(data.email, data.phoneNumber, data.emergencyContact);
  }
}
