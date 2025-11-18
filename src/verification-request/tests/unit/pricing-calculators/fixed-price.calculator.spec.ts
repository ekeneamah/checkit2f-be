import { FixedPriceCalculator } from '../../../application/services/pricing-calculators/fixed-price.calculator';
import { PricingType } from '../../../domain/enums/pricing-type.enum';
import { IFixedPricingParams } from '../../../domain/interfaces/pricing-calculator.interface';

describe('FixedPriceCalculator', () => {
  let calculator: FixedPriceCalculator;

  beforeEach(() => {
    calculator = new FixedPriceCalculator();
  });

  describe('Pricing Type', () => {
    it('should return FIXED as pricing type', () => {
      expect(calculator.pricingType).toBe(PricingType.FIXED);
    });
  });

  describe('calculatePrice', () => {
    it('should calculate correct price for fixed pricing', () => {
      const params = {
        requestTypeId: 'test-request',
        basePrice: 500000, // ₦5,000 in kobo
      };

      const result = calculator.calculatePrice(params);

      expect(result).toBe(500000);
    });

    it('should handle zero base price', () => {
      const params = {
        requestTypeId: 'test-request',
        basePrice: 0,
      };

      const result = calculator.calculatePrice(params);

      expect(result).toBe(0);
    });

    it('should handle large base price', () => {
      const params = {
        requestTypeId: 'test-request',
        basePrice: 10000000, // ₦100,000 in kobo
      };

      const result = calculator.calculatePrice(params);

      expect(result).toBe(10000000);
    });
  });

  describe('validateParams', () => {
    it('should pass validation with valid params', () => {
      const params = {
        requestTypeId: 'test-request',
        basePrice: 500000,
      };

      expect(() => calculator.validateParams(params)).not.toThrow();
    });

    it('should throw error when basePrice is missing', () => {
      const params: Omit<{ requestTypeId: string; basePrice: number }, 'basePrice'> & { basePrice?: never } = {
        requestTypeId: 'test-request',
      };

      expect(() => calculator.validateParams(params as IFixedPricingParams)).toThrow(
        'basePrice is required for FIXED pricing',
      );
    });

    it('should throw error when basePrice is negative', () => {
      const params = {
        requestTypeId: 'test-request',
        basePrice: -1000,
      };

      expect(() => calculator.validateParams(params)).toThrow(
        'basePrice must be a positive number',
      );
    });

    it('should throw error when basePrice is zero', () => {
      const params = {
        requestTypeId: 'test-request',
        basePrice: 0,
      };

      expect(() => calculator.validateParams(params)).toThrow(
        'basePrice must be greater than 0',
      );
    });
  });

  describe('getPriceBreakdown', () => {
    it('should return correct breakdown', () => {
      const params = {
        requestTypeId: 'test-request',
        basePrice: 500000,
      };

      const breakdown = calculator.getPriceBreakdown(params);

      expect(breakdown).toContain('Fixed price');
      expect(breakdown).toContain('₦5,000.00');
    });

    it('should format large amounts correctly', () => {
      const params = {
        requestTypeId: 'test-request',
        basePrice: 10000000, // ₦100,000
      };

      const breakdown = calculator.getPriceBreakdown(params);

      expect(breakdown).toContain('₦100,000.00');
    });
  });
});
