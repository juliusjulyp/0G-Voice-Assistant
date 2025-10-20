import { useState, useCallback, useRef } from 'react';
import { ValidationResult } from '../types';
import { ValidationSchema } from '../utils/validation';

interface UseFormOptions<T extends Record<string, any>> {
  initialValues: T;
  validationSchema?: ValidationSchema<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  onSubmit?: (values: T) => void | Promise<void>;
  onError?: (errors: Partial<Record<keyof T, string>>) => void;
}

interface FormState<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export const useForm = <T extends Record<string, any>>(
  options: UseFormOptions<T>
) => {
  const {
    initialValues,
    validationSchema,
    validateOnChange = true,
    validateOnBlur = true,
    onSubmit,
    onError
  } = options;

  const initialValuesRef = useRef(initialValues);
  
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true,
    isDirty: false
  });

  // Validate a single field
  const validateField = useCallback((
    name: keyof T,
    value: T[keyof T],
    allValues: T
  ): string | undefined => {
    if (!validationSchema) return undefined;

    const testData = { ...allValues, [name]: value };
    const result = validationSchema.validate(testData);
    return result.errors[name];
  }, [validationSchema]);

  // Validate all fields
  const validateForm = useCallback((values: T): ValidationResult<T> => {
    if (!validationSchema) {
      return {
        isValid: true,
        errors: {},
        data: values
      };
    }

    return validationSchema.validate(values);
  }, [validationSchema]);

  // Set field value
  const setFieldValue = useCallback((name: keyof T, value: T[keyof T]) => {
    setState(prevState => {
      const newValues = { ...prevState.values, [name]: value };
      const isDirty = JSON.stringify(newValues) !== JSON.stringify(initialValuesRef.current);
      
      let newErrors = prevState.errors;
      if (validateOnChange) {
        const fieldError = validateField(name, value, newValues);
        newErrors = {
          ...prevState.errors,
          [name]: fieldError
        };
        
        // Remove error if field is now valid
        if (!fieldError) {
          const updatedErrors = { ...newErrors };
          delete updatedErrors[name];
          newErrors = updatedErrors;
        }
      }

      const hasErrors = Object.keys(newErrors).length > 0;

      return {
        ...prevState,
        values: newValues,
        errors: newErrors,
        isValid: !hasErrors,
        isDirty
      };
    });
  }, [validateOnChange, validateField]);

  // Set field error
  const setFieldError = useCallback((name: keyof T, error: string | undefined) => {
    setState(prevState => {
      const newErrors = { ...prevState.errors };
      
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }

      const hasErrors = Object.keys(newErrors).length > 0;

      return {
        ...prevState,
        errors: newErrors,
        isValid: !hasErrors
      };
    });
  }, []);

  // Set field touched
  const setFieldTouched = useCallback((name: keyof T, touched = true) => {
    setState(prevState => ({
      ...prevState,
      touched: {
        ...prevState.touched,
        [name]: touched
      }
    }));
  }, []);

  // Handle field blur
  const handleBlur = useCallback((name: keyof T) => {
    setFieldTouched(name, true);
    
    if (validateOnBlur) {
      const fieldError = validateField(name, state.values[name], state.values);
      setFieldError(name, fieldError);
    }
  }, [validateOnBlur, validateField, setFieldTouched, setFieldError, state.values]);

  // Handle field change
  const handleChange = useCallback((name: keyof T, value: T[keyof T]) => {
    setFieldValue(name, value);
  }, [setFieldValue]);

  // Get field props for form controls
  const getFieldProps = useCallback((name: keyof T) => {
    return {
      name: String(name),
      value: state.values[name] || '',
      error: state.touched[name] ? state.errors[name] : undefined,
      onChange: (value: T[keyof T]) => handleChange(name, value),
      onBlur: () => handleBlur(name)
    };
  }, [state.values, state.errors, state.touched, handleChange, handleBlur]);

  // Submit form
  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    setState(prevState => ({ ...prevState, isSubmitting: true }));

    try {
      // Validate all fields
      const validationResult = validateForm(state.values);
      
      if (!validationResult.isValid) {
        setState(prevState => ({
          ...prevState,
          errors: validationResult.errors,
          isValid: false,
          isSubmitting: false,
          touched: Object.keys(state.values).reduce((acc, key) => ({
            ...acc,
            [key]: true
          }), {})
        }));

        if (onError) {
          onError(validationResult.errors);
        }
        return;
      }

      // Call submit handler
      if (onSubmit) {
        await onSubmit(state.values);
      }

      setState(prevState => ({
        ...prevState,
        isSubmitting: false
      }));

    } catch (error) {
      setState(prevState => ({
        ...prevState,
        isSubmitting: false
      }));

      const errorMessage = error instanceof Error ? error.message : 'Submission failed';
      if (onError) {
        onError({ submit: errorMessage } as Partial<Record<keyof T, string>>);
      }
    }
  }, [state.values, validateForm, onSubmit, onError]);

  // Reset form
  const reset = useCallback((newValues?: Partial<T>) => {
    const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues;
    initialValuesRef.current = resetValues;
    
    setState({
      values: resetValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
      isDirty: false
    });
  }, [initialValues]);

  // Set multiple values
  const setValues = useCallback((newValues: Partial<T>) => {
    setState(prevState => {
      const updatedValues = { ...prevState.values, ...newValues };
      const isDirty = JSON.stringify(updatedValues) !== JSON.stringify(initialValuesRef.current);
      
      let newErrors = prevState.errors;
      if (validateOnChange) {
        const validationResult = validateForm(updatedValues);
        newErrors = validationResult.errors;
      }

      const hasErrors = Object.keys(newErrors).length > 0;

      return {
        ...prevState,
        values: updatedValues,
        errors: newErrors,
        isValid: !hasErrors,
        isDirty
      };
    });
  }, [validateOnChange, validateForm]);

  // Set multiple errors
  const setErrors = useCallback((errors: Partial<Record<keyof T, string>>) => {
    setState(prevState => ({
      ...prevState,
      errors,
      isValid: Object.keys(errors).length === 0
    }));
  }, []);

  return {
    // State
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    isValid: state.isValid,
    isDirty: state.isDirty,

    // Field helpers
    getFieldProps,
    setFieldValue,
    setFieldError,
    setFieldTouched,

    // Form helpers
    handleSubmit,
    reset,
    setValues,
    setErrors,
    validateForm,

    // Event handlers
    handleChange,
    handleBlur
  };
};

// Specialized hooks for common form patterns
export const useEmailForm = (onSubmit: (email: string) => void | Promise<void>) => {
  return useForm({
    initialValues: { email: '' },
    onSubmit: async (values) => {
      await onSubmit(values.email);
    }
  });
};

export const useContractForm = (onSubmit: (address: string) => void | Promise<void>) => {
  return useForm({
    initialValues: { address: '' },
    onSubmit: async (values) => {
      await onSubmit(values.address);
    }
  });
};