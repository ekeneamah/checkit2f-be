/**
 * Customer Details Value Object
 * Immutable value object for customer information
 */
export class CustomerDetails {
  constructor(
    public readonly fullName: string,
    public readonly phoneNumber: string,
    public readonly email: string | null,
    public readonly bvn?: string,
    public readonly nin?: string,
    public readonly dateOfBirth?: Date,
    public readonly gender?: 'MALE' | 'FEMALE' | 'OTHER',
    public readonly nationality?: string,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.fullName?.trim()) {
      throw new Error('Customer full name is required');
    }
    if (!this.phoneNumber?.trim()) {
      throw new Error('Customer phone number is required');
    }
    // Validate Nigerian phone format
    const phoneRegex = /^(\+234|234|0)?[789][01]\d{8}$/;
    if (!phoneRegex.test(this.phoneNumber.replace(/\s/g, ''))) {
      throw new Error('Invalid Nigerian phone number format');
    }
  }

  /**
   * Get masked phone number for display
   */
  get maskedPhone(): string {
    const clean = this.phoneNumber.replace(/\D/g, '');
    return `${clean.slice(0, 4)}****${clean.slice(-3)}`;
  }

  /**
   * Get masked BVN for display
   */
  get maskedBvn(): string | null {
    if (!this.bvn) return null;
    return `${this.bvn.slice(0, 3)}*****${this.bvn.slice(-3)}`;
  }

  toJSON(): Record<string, unknown> {
    return {
      fullName: this.fullName,
      phoneNumber: this.phoneNumber,
      email: this.email,
      bvn: this.bvn,
      nin: this.nin,
      dateOfBirth: this.dateOfBirth?.toISOString(),
      gender: this.gender,
      nationality: this.nationality,
    };
  }

  static fromJSON(data: Record<string, unknown>): CustomerDetails {
    return new CustomerDetails(
      data.fullName as string,
      data.phoneNumber as string,
      data.email as string | null,
      data.bvn as string | undefined,
      data.nin as string | undefined,
      data.dateOfBirth ? new Date(data.dateOfBirth as string) : undefined,
      data.gender as 'MALE' | 'FEMALE' | 'OTHER' | undefined,
      data.nationality as string | undefined,
    );
  }
}
