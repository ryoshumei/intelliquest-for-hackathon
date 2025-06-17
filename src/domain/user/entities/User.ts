import { DomainError } from '../../shared/errors/DomainError';

/**
 * User Entity - Represents a survey creator (调查者)
 * Contains business logic and rules for user management
 */
export class User {
  private constructor(
    private readonly id: string,
    private email: string,
    private displayName: string,
    private readonly createdAt: Date,
    private lastLoginAt: Date,
    private readonly isAnonymous: boolean = false,
    private photoURL?: string,
    private preferences: UserPreferences = UserPreferences.getDefaults()
  ) {
    this.validateEmail(email);
    this.validateDisplayName(displayName);
  }

  /**
   * Create a new registered user (调查者)
   */
  static createRegistered(
    id: string,
    email: string,
    displayName: string,
    photoURL?: string
  ): User {
    return new User(
      id,
      email,
      displayName,
      new Date(),
      new Date(),
      false,
      photoURL
    );
  }

  /**
   * Create an anonymous user (for survey responses)
   */
  static createAnonymous(id: string): User {
    return new User(
      id,
      `anonymous_${id}@temp.com`,
      `匿名用户_${id.slice(-6)}`,
      new Date(),
      new Date(),
      true
    );
  }

  /**
   * Restore user from persistence
   */
  static restore(
    id: string,
    email: string,
    displayName: string,
    createdAt: Date,
    lastLoginAt: Date,
    isAnonymous: boolean,
    photoURL?: string,
    preferences?: UserPreferences
  ): User {
    return new User(
      id,
      email,
      displayName,
      createdAt,
      lastLoginAt,
      isAnonymous,
      photoURL,
      preferences || UserPreferences.getDefaults()
    );
  }

  // Getters
  getId(): string { return this.id; }
  getEmail(): string { return this.email; }
  getDisplayName(): string { return this.displayName; }
  getCreatedAt(): Date { return this.createdAt; }
  getLastLoginAt(): Date { return this.lastLoginAt; }
  getIsAnonymous(): boolean { return this.isAnonymous; }
  getPhotoURL(): string | undefined { return this.photoURL; }
  getPreferences(): UserPreferences { return this.preferences; }

  /**
   * Update user profile
   */
  updateProfile(displayName?: string, photoURL?: string): void {
    if (this.isAnonymous) {
      throw DomainError.businessRule('Cannot update profile of anonymous user');
    }

    if (displayName) {
      this.validateDisplayName(displayName);
      this.displayName = displayName;
    }

    if (photoURL !== undefined) {
      this.photoURL = photoURL;
    }
  }

  /**
   * Update email (requires re-authentication in real implementation)
   */
  updateEmail(newEmail: string): void {
    if (this.isAnonymous) {
      throw DomainError.businessRule('Cannot update email of anonymous user');
    }

    this.validateEmail(newEmail);
    this.email = newEmail;
  }

  /**
   * Record login activity
   */
  recordLogin(): void {
    this.lastLoginAt = new Date();
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  /**
   * Check if user can create surveys
   */
  canCreateSurveys(): boolean {
    return !this.isAnonymous;
  }

  /**
   * Check if user can view analytics
   */
  canViewAnalytics(): boolean {
    return !this.isAnonymous;
  }

  private validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw DomainError.validation('Email cannot be empty');
    }

    // Basic email validation - in real app, use more robust validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw DomainError.validation('Invalid email format');
    }
  }

  private validateDisplayName(displayName: string): void {
    if (!displayName || displayName.trim().length === 0) {
      throw DomainError.validation('Display name cannot be empty');
    }

    if (displayName.length > 50) {
      throw DomainError.validation('Display name cannot exceed 50 characters');
    }
  }

  /**
   * Convert to plain object for persistence
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      displayName: this.displayName,
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt,
      isAnonymous: this.isAnonymous,
      photoURL: this.photoURL,
      preferences: this.preferences
    };
  }
}

/**
 * User Preferences Value Object
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US' | 'ja-JP';
  notifications: {
    email: boolean;
    push: boolean;
    survey_responses: boolean;
    system_updates: boolean;
  };
  survey_defaults: {
    is_public: boolean;
    allow_anonymous: boolean;
    auto_generate_ai: boolean;
  };
}

export class UserPreferences {
  static getDefaults(): UserPreferences {
    return {
      theme: 'light',
      language: 'zh-CN',
      notifications: {
        email: true,
        push: true,
        survey_responses: true,
        system_updates: false
      },
      survey_defaults: {
        is_public: true,
        allow_anonymous: true,
        auto_generate_ai: true
      }
    };
  }
} 