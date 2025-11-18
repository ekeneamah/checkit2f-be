/**
 * Price value object representing monetary amount
 * Immutable value object following DDD principles
 */
export class Price {
  constructor(
    private readonly _amount: number,
    private readonly _currency: string = 'USD',
  ) {
    this.validateAmount();
    this.validateCurrency();
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  /**
   * Validate amount
   */
  private validateAmount(): void {
    if (this._amount < 0) {
      throw new Error('Price amount cannot be negative');
    }

    if (!Number.isFinite(this._amount)) {
      throw new Error('Price amount must be a valid number');
    }

    // Check for reasonable decimal places (max 2 for most currencies)
    const decimalPlaces = (this._amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      throw new Error('Price amount cannot have more than 2 decimal places');
    }
  }

  /**
   * Validate currency code
   */
  private validateCurrency(): void {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'GHS'];
    
    if (!this._currency || this._currency.length !== 3) {
      throw new Error('Currency must be a valid 3-letter ISO currency code');
    }

    if (!validCurrencies.includes(this._currency.toUpperCase())) {
      throw new Error(`Currency '${this._currency}' is not supported`);
    }
  }

  /**
   * Add another price (must be same currency)
   */
  public add(otherPrice: Price): Price {
    if (this._currency !== otherPrice._currency) {
      throw new Error('Cannot add prices with different currencies');
    }

    return new Price(this._amount + otherPrice._amount, this._currency);
  }

  /**
   * Subtract another price (must be same currency)
   */
  public subtract(otherPrice: Price): Price {
    if (this._currency !== otherPrice._currency) {
      throw new Error('Cannot subtract prices with different currencies');
    }

    const result = this._amount - otherPrice._amount;
    if (result < 0) {
      throw new Error('Subtraction would result in negative price');
    }

    return new Price(result, this._currency);
  }

  /**
   * Multiply by a factor
   */
  public multiply(factor: number): Price {
    if (factor < 0) {
      throw new Error('Cannot multiply price by negative factor');
    }

    if (!Number.isFinite(factor)) {
      throw new Error('Factor must be a valid number');
    }

    return new Price(Math.round(this._amount * factor * 100) / 100, this._currency);
  }

  /**
   * Apply discount percentage (0-100)
   */
  public applyDiscount(discountPercentage: number): Price {
    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    const discountFactor = (100 - discountPercentage) / 100;
    return this.multiply(discountFactor);
  }

  /**
   * Check if price is greater than another price
   */
  public isGreaterThan(otherPrice: Price): boolean {
    if (this._currency !== otherPrice._currency) {
      throw new Error('Cannot compare prices with different currencies');
    }

    return this._amount > otherPrice._amount;
  }

  /**
   * Check if price is less than another price
   */
  public isLessThan(otherPrice: Price): boolean {
    if (this._currency !== otherPrice._currency) {
      throw new Error('Cannot compare prices with different currencies');
    }

    return this._amount < otherPrice._amount;
  }

  /**
   * Check equality with another price
   */
  public equals(other: Price): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  /**
   * Format price for display
   */
  public format(): string {
    const currencySymbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      NGN: '₦',
      KES: 'KSh',
      ZAR: 'R',
      GHS: '₵',
    };

    const symbol = currencySymbols[this._currency] || this._currency;
    return `${symbol}${this._amount.toFixed(2)}`;
  }

  /**
   * Get amount in cents/smallest currency unit
   */
  public toCents(): number {
    return Math.round(this._amount * 100);
  }

  /**
   * Convert to plain object
   */
  public toJSON(): Record<string, any> {
    return {
      amount: this._amount,
      currency: this._currency,
    };
  }

  /**
   * Create Price from plain object
   */
  public static fromJSON(data: any): Price {
    return new Price(data.amount, data.currency);
  }

  /**
   * Create Price from cents/smallest currency unit
   */
  public static fromCents(cents: number, currency: string = 'USD'): Price {
    return new Price(cents / 100, currency);
  }

  /**
   * Create zero price
   */
  public static zero(currency: string = 'USD'): Price {
    return new Price(0, currency);
  }
}