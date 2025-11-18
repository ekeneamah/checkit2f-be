import { randomUUID } from 'crypto';

/**
 * Base entity class providing common functionality
 * Implements basic entity requirements following DDD principles
 */
export abstract class BaseEntity {
  protected readonly _id: string;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;

  constructor(id?: string) {
    this._id = id || randomUUID();
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Get entity ID
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get creation timestamp
   */
  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Get last update timestamp
   */
  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Get last modified timestamp (alias for updatedAt)
   */
  get modifiedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Update the entity timestamp
   */
  protected updateTimestamp(): void {
    this._updatedAt = new Date();
  }

  /**
   * Update modified timestamp (alias for updateTimestamp)
   */
  protected updateModified(): void {
    this.updateTimestamp();
  }

  /**
   * Check if entity is the same as another entity
   * @param entity - Entity to compare with
   */
  public equals(entity: BaseEntity): boolean {
    if (!entity) {
      return false;
    }

    if (this === entity) {
      return true;
    }

    return this._id === entity._id;
  }

  /**
   * Convert entity to plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      modifiedAt: this._updatedAt, // Alias for compatibility
    };
  }
}