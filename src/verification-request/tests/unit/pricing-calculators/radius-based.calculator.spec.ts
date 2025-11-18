import { RadiusBasedCalculator } from '../../../application/services/pricing-calculators/radius-based.calculator';
import { PricingType } from '../../../domain/enums/pricing-type.enum';
import { RadiusPricingVO } from '../../../domain/value-objects/radius-pricing.value-object';
import { IRadiusPricingParams } from '../../../domain/interfaces/pricing-calculator.interface';

describe('RadiusBasedCalculator', () => {
  let calculator: RadiusBasedCalculator;

  beforeEach(() => {
    calculator = new RadiusBasedCalculator();
  });

  describe('Pricing Type', () => {
    it('should return RADIUS_BASED as pricing type', () => {
      expect(calculator.pricingType).toBe(PricingType.RADIUS_BASED);
    });
  });

  describe('calculatePrice', () => {
    it('should calculate price for radius within first tier', () => {
      const radiusPricing = new RadiusPricingVO([
        { radiusKm: 5, price: 800000 },
        { radiusKm: 10, price: 1200000 },
        { radiusKm: 20, price: 1500000 },
      ]);

      const params = {
        requestTypeId: 'test-request',
        radiusKm: 3,
        radiusPricingTable: Array.from(radiusPricing.tiers),
      };

      const result = calculator.calculatePrice(params);

      expect(result).toBe(800000); // ₦8,000
    });

    it('should calculate price for radius in middle tier', () => {
      const radiusPricing = new RadiusPricingVO([
        { radiusKm: 5, price: 800000 },
        { radiusKm: 10, price: 1200000 },
        { radiusKm: 20, price: 1500000 },
      ]);

      const params = {
        requestTypeId: 'test-request',
        radiusKm: 7,
        radiusPricingTable: Array.from(radiusPricing.tiers),
      };

      const result = calculator.calculatePrice(params);

      expect(result).toBe(1200000); // ₦12,000
    });

    it('should calculate price for maximum radius', () => {
      const radiusPricing = new RadiusPricingVO([
        { radiusKm: 5, price: 800000 },
        { radiusKm: 10, price: 1200000 },
        { radiusKm: 20, price: 1500000 },
      ]);

      const params = {
        requestTypeId: 'test-request',
        radiusKm: 20,
        radiusPricingTable: Array.from(radiusPricing.tiers),
      };

      const result = calculator.calculatePrice(params);

      expect(result).toBe(1500000); // ₦15,000
    });

    it('should use highest tier for radius exceeding all tiers', () => {
      const radiusPricing = new RadiusPricingVO([
        { radiusKm: 5, price: 800000 },
        { radiusKm: 10, price: 1200000 },
        { radiusKm: 20, price: 1500000 },
      ]);

      const params = {
        requestTypeId: 'test-request',
        radiusKm: 25,
        radiusPricingTable: Array.from(radiusPricing.tiers),
      };

      const result = calculator.calculatePrice(params);

      expect(result).toBe(1500000); // Use highest tier
    });
  });

  describe('validateParams', () => {
    it('should pass validation with valid params', () => {
      const radiusPricing = new RadiusPricingVO([
        { radiusKm: 10, price: 800000 },
      ]);

      const params = {
        requestTypeId: 'test-request',
        radiusKm: 5,
        radiusPricingTable: Array.from(radiusPricing.tiers),
      };

      expect(() => calculator.validateParams(params)).not.toThrow();
    });

    it('should throw error when radiusKm is missing', () => {
      const params = {
        requestTypeId: 'test-request',
        radiusPricingTable: [],
      } as unknown as IRadiusPricingParams;

      expect(() => calculator.validateParams(params)).toThrow(
        'radiusKm is required',
      );
    });

    it('should throw error when radiusPricingTable is missing', () => {
      const params = {
        requestTypeId: 'test-request',
        radiusKm: 5,
      } as unknown as IRadiusPricingParams;

      expect(() => calculator.validateParams(params)).toThrow(
        'radiusPricingTable is required',
      );
    });

    it('should throw error when radiusKm is negative', () => {
      const params = {
        requestTypeId: 'test-request',
        radiusKm: -5,
        radiusPricingTable: [],
      };

      expect(() => calculator.validateParams(params)).toThrow(
        'radiusKm must be a positive number',
      );
    });
  });

  describe('getPriceBreakdown', () => {
    it('should return correct breakdown', () => {
      const radiusPricing = new RadiusPricingVO([
        { radiusKm: 10, price: 800000 },
      ]);

      const params = {
        requestTypeId: 'test-request',
        radiusKm: 5,
        radiusPricingTable: Array.from(radiusPricing.tiers),
      };

      const breakdown = calculator.getPriceBreakdown(params);

      expect(breakdown).toContain('Radius-based pricing');
      expect(breakdown).toContain('5 km');
      expect(breakdown).toContain('₦8,000.00');
    });
  });
});
