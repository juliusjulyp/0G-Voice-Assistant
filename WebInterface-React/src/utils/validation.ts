import { ValidationRule } from '../types';

// Common validation functions
export const validators = {
  required: (message = 'This field is required'): ValidationRule => ({
    test: (value: string) => value.trim().length > 0,
    message
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value: string) => value.length >= min,
    message: message || `Must be at least ${min} characters`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value: string) => value.length <= max,
    message: message || `Must be no more than ${max} characters`
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    test: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    test: (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message
  }),

  ethereumAddress: (message = 'Please enter a valid Ethereum address'): ValidationRule => ({
    test: (value: string) => {
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      return ethAddressRegex.test(value);
    },
    message
  }),

  numeric: (message = 'Please enter a valid number'): ValidationRule => ({
    test: (value: string) => !isNaN(Number(value)) && isFinite(Number(value)),
    message
  }),

  integer: (message = 'Please enter a valid integer'): ValidationRule => ({
    test: (value: string) => Number.isInteger(Number(value)),
    message
  }),

  positive: (message = 'Must be a positive number'): ValidationRule => ({
    test: (value: string) => Number(value) > 0,
    message
  }),

  min: (minimum: number, message?: string): ValidationRule => ({
    test: (value: string) => Number(value) >= minimum,
    message: message || `Must be at least ${minimum}`
  }),

  max: (maximum: number, message?: string): ValidationRule => ({
    test: (value: string) => Number(value) <= maximum,
    message: message || `Must be no more than ${maximum}`
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule => ({
    test: (value: string) => regex.test(value),
    message
  }),

  custom: (testFn: (value: string) => boolean, message: string): ValidationRule => ({
    test: testFn,
    message
  }),

  // File validation
  fileSize: (maxSizeBytes: number, message?: string): ValidationRule<File> => ({
    test: (file: File) => file.size <= maxSizeBytes,
    message: message || `File size must be less than ${formatBytes(maxSizeBytes)}`
  }),

  fileType: (allowedTypes: string[], message?: string): ValidationRule<File> => ({
    test: (file: File) => allowedTypes.includes(file.type),
    message: message || `File type must be one of: ${allowedTypes.join(', ')}`
  }),

  // Contract specific validations
  contractFunctionName: (message = 'Invalid function name'): ValidationRule => ({
    test: (value: string) => {
      const functionNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      return functionNameRegex.test(value);
    },
    message
  }),

  tokenAmount: (decimals = 18, message = 'Invalid token amount'): ValidationRule => ({
    test: (value: string) => {
      const num = Number(value);
      return !isNaN(num) && num >= 0 && countDecimals(value) <= decimals;
    },
    message
  })
};

// Utility functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const countDecimals = (value: string): number => {
  if (value.includes('.')) {
    return value.split('.')[1]?.length || 0;
  }
  return 0;
};

// Validation schema builder
export class ValidationSchema<T extends Record<string, any>> {
  private rules: Record<keyof T, ValidationRule[]> = {} as Record<keyof T, ValidationRule[]>;

  field(name: keyof T): FieldValidator<T> {
    return new FieldValidator(this, name);
  }

  validate(data: T): ValidationResult<T> {
    const errors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const [field, fieldRules] of Object.entries(this.rules) as [keyof T, ValidationRule[]][]) {
      const value = data[field];
      
      for (const rule of fieldRules) {
        if (!rule.test(value)) {
          errors[field] = rule.message;
          isValid = false;
          break; // Stop at first error for this field
        }
      }
    }

    return {
      isValid,
      errors,
      data
    };
  }

  // Async validation support
  async validateAsync(data: T, asyncRules?: Record<keyof T, AsyncValidationRule[]>): Promise<ValidationResult<T>> {
    const syncResult = this.validate(data);
    
    if (!asyncRules || !syncResult.isValid) {
      return syncResult;
    }

    const asyncErrors: Partial<Record<keyof T, string>> = {};
    
    for (const [field, fieldRules] of Object.entries(asyncRules) as [keyof T, AsyncValidationRule[]][]) {
      const value = data[field];
      
      for (const rule of fieldRules) {
        try {
          const isValid = await rule.test(value);
          if (!isValid) {
            asyncErrors[field] = rule.message;
            break;
          }
        } catch (error) {
          asyncErrors[field] = 'Validation error occurred';
          break;
        }
      }
    }

    return {
      isValid: Object.keys(asyncErrors).length === 0,
      errors: { ...syncResult.errors, ...asyncErrors },
      data
    };
  }

  addRule(field: keyof T, rule: ValidationRule): this {
    if (!this.rules[field]) {
      this.rules[field] = [];
    }
    this.rules[field].push(rule);
    return this;
  }
}

class FieldValidator<T extends Record<string, any>> {
  constructor(
    private schema: ValidationSchema<T>,
    private fieldName: keyof T
  ) {}

  required(message?: string): this {
    this.schema.addRule(this.fieldName, validators.required(message));
    return this;
  }

  minLength(min: number, message?: string): this {
    this.schema.addRule(this.fieldName, validators.minLength(min, message));
    return this;
  }

  maxLength(max: number, message?: string): this {
    this.schema.addRule(this.fieldName, validators.maxLength(max, message));
    return this;
  }

  email(message?: string): this {
    this.schema.addRule(this.fieldName, validators.email(message));
    return this;
  }

  url(message?: string): this {
    this.schema.addRule(this.fieldName, validators.url(message));
    return this;
  }

  ethereumAddress(message?: string): this {
    this.schema.addRule(this.fieldName, validators.ethereumAddress(message));
    return this;
  }

  numeric(message?: string): this {
    this.schema.addRule(this.fieldName, validators.numeric(message));
    return this;
  }

  positive(message?: string): this {
    this.schema.addRule(this.fieldName, validators.positive(message));
    return this;
  }

  min(minimum: number, message?: string): this {
    this.schema.addRule(this.fieldName, validators.min(minimum, message));
    return this;
  }

  max(maximum: number, message?: string): this {
    this.schema.addRule(this.fieldName, validators.max(maximum, message));
    return this;
  }

  pattern(regex: RegExp, message?: string): this {
    this.schema.addRule(this.fieldName, validators.pattern(regex, message));
    return this;
  }

  custom(testFn: (value: any) => boolean, message: string): this {
    this.schema.addRule(this.fieldName, validators.custom(testFn, message));
    return this;
  }

  field(name: keyof T): FieldValidator<T> {
    return this.schema.field(name);
  }

  build(): ValidationSchema<T> {
    return this.schema;
  }
}

// Types
export interface ValidationResult<T> {
  isValid: boolean;
  errors: Partial<Record<keyof T, string>>;
  data: T;
}

export interface AsyncValidationRule<T = string> {
  test: (value: T) => Promise<boolean>;
  message: string;
}

// Factory function
export const createSchema = <T extends Record<string, any>>(): ValidationSchema<T> => {
  return new ValidationSchema<T>();
};

// Predefined schemas for common forms
export const schemas = {
  contractAnalysis: createSchema<{
    address: string;
  }>()
    .field('address')
    .required('Contract address is required')
    .ethereumAddress('Please enter a valid Ethereum address')
    .build(),

  emailSubscription: createSchema<{
    email: string;
  }>()
    .field('email')
    .required('Email is required')
    .email('Please enter a valid email address')
    .build(),

  fileUpload: createSchema<{
    file: File;
  }>()
    .field('file')
    .custom((file: File) => file instanceof File, 'Please select a file')
    .build(),

  tokenTransfer: createSchema<{
    to: string;
    amount: string;
  }>()
    .field('to')
    .required('Recipient address is required')
    .ethereumAddress('Please enter a valid Ethereum address')
    .field('amount')
    .required('Amount is required')
    .numeric('Amount must be a valid number')
    .positive('Amount must be greater than 0')
    .build(),

  networkConfig: createSchema<{
    rpcUrl: string;
    chainId: string;
  }>()
    .field('rpcUrl')
    .required('RPC URL is required')
    .url('Please enter a valid URL')
    .field('chainId')
    .required('Chain ID is required')
    .numeric('Chain ID must be a number')
    .build()
};