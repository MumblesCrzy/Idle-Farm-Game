/**
 * Input Validation Utilities
 * 
 * Provides validation functions for user inputs, save data schemas,
 * and game value constraints to prevent invalid/corrupted data.
 */

// ============================================================================
// NUMBER VALIDATION
// ============================================================================

/**
 * Validation result with optional error message
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedValue?: number;
}

/**
 * Options for number validation
 */
export interface NumberValidationOptions {
  min?: number;
  max?: number;
  allowNegative?: boolean;
  allowZero?: boolean;
  allowDecimal?: boolean;
  defaultValue?: number;
}

/**
 * Validates and sanitizes a numeric input value
 * @param value - The value to validate (string or number)
 * @param options - Validation options
 * @returns Validation result with sanitized value if valid
 */
export function validateNumber(
  value: string | number,
  options: NumberValidationOptions = {}
): ValidationResult {
  const {
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    allowNegative = false,
    allowZero = true,
    allowDecimal = false,
    defaultValue = 0
  } = options;

  // Handle empty or undefined
  if (value === '' || value === undefined || value === null) {
    return { valid: true, sanitizedValue: defaultValue };
  }

  // Parse to number
  const parsed = typeof value === 'string' ? parseFloat(value) : value;

  // Check if valid number
  if (isNaN(parsed) || !isFinite(parsed)) {
    return { valid: false, error: 'Please enter a valid number' };
  }

  // Check negative
  if (!allowNegative && parsed < 0) {
    return { valid: false, error: 'Value cannot be negative' };
  }

  // Check zero
  if (!allowZero && parsed === 0) {
    return { valid: false, error: 'Value cannot be zero' };
  }

  // Check decimal
  if (!allowDecimal && !Number.isInteger(parsed)) {
    return { valid: true, sanitizedValue: Math.floor(parsed) };
  }

  // Check min/max bounds
  if (parsed < min) {
    return { valid: false, error: `Value must be at least ${min}` };
  }

  if (parsed > max) {
    return { valid: false, error: `Value cannot exceed ${max}` };
  }

  return { valid: true, sanitizedValue: parsed };
}

/**
 * Clamp a number to a valid range, sanitizing invalid inputs
 * @param value - The value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @param defaultValue - Default if invalid
 * @returns The clamped and sanitized value
 */
export function clampNumber(
  value: string | number,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER,
  defaultValue: number = 0
): number {
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }
  
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Sanitize input for positive integers only (e.g., resource amounts)
 */
export function sanitizePositiveInteger(value: string | number, defaultValue: number = 0): number {
  const result = validateNumber(value, {
    min: 0,
    allowNegative: false,
    allowDecimal: false,
    defaultValue
  });
  return result.sanitizedValue ?? defaultValue;
}

/**
 * Sanitize input for day counts (1 to 365000 - ~1000 years)
 */
export function sanitizeDayCount(value: string | number): number {
  return clampNumber(value, 1, 365000, 1);
}

/**
 * Sanitize input for money/resource amounts
 */
export function sanitizeResourceAmount(value: string | number): number {
  return clampNumber(value, 0, Number.MAX_SAFE_INTEGER, 0);
}

// ============================================================================
// SAVE DATA VALIDATION
// ============================================================================

/**
 * Detailed validation errors for save data
 */
export interface SaveValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the basic structure of save data
 */
function validateBasicStructure(data: unknown): string[] {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Save data must be a valid object');
    return errors;
  }
  
  return errors;
}

/**
 * Validates required core fields
 */
function validateRequiredFields(data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const requiredFields: Array<{ field: string; type: string }> = [
    { field: 'veggies', type: 'array' },
    { field: 'money', type: 'number' },
    { field: 'experience', type: 'number' },
    { field: 'knowledge', type: 'number' },
    { field: 'activeVeggie', type: 'number' },
    { field: 'day', type: 'number' },
    { field: 'maxPlots', type: 'number' },
    { field: 'farmTier', type: 'number' },
  ];
  
  for (const { field, type } of requiredFields) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    } else if (type === 'array' && !Array.isArray(data[field])) {
      errors.push(`Field '${field}' must be an array`);
    } else if (type === 'number' && typeof data[field] !== 'number') {
      errors.push(`Field '${field}' must be a number`);
    } else if (type === 'boolean' && typeof data[field] !== 'boolean') {
      errors.push(`Field '${field}' must be a boolean`);
    }
  }
  
  return errors;
}

/**
 * Validates numeric fields are within reasonable bounds
 */
function validateNumericBounds(data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  
  // Money should be non-negative
  if (typeof data.money === 'number' && data.money < 0) {
    errors.push('Money cannot be negative');
  }
  
  // Experience should be non-negative
  if (typeof data.experience === 'number' && data.experience < 0) {
    errors.push('Experience cannot be negative');
  }
  
  // Knowledge should be non-negative
  if (typeof data.knowledge === 'number' && data.knowledge < 0) {
    errors.push('Knowledge cannot be negative');
  }
  
  // Day should be positive
  if (typeof data.day === 'number' && data.day < 1) {
    errors.push('Day must be at least 1');
  }
  
  // Farm tier should be between 1 and 10
  if (typeof data.farmTier === 'number' && (data.farmTier < 1 || data.farmTier > 10)) {
    errors.push('Farm tier must be between 1 and 10');
  }
  
  // Max plots should be at least 4 (no upper limit due to farm tier upgrades)
  if (typeof data.maxPlots === 'number' && data.maxPlots < 4) {
    errors.push('Max plots must be at least 4');
  }
  
  return errors;
}

/**
 * Validates veggie array structure
 */
function validateVeggiesArray(veggies: unknown[]): string[] {
  const errors: string[] = [];
  
  if (veggies.length === 0) {
    errors.push('Veggies array cannot be empty');
    return errors;
  }
  
  for (let i = 0; i < veggies.length; i++) {
    const veggie = veggies[i] as Record<string, unknown>;
    
    if (!veggie || typeof veggie !== 'object') {
      errors.push(`Veggie at index ${i} must be an object`);
      continue;
    }
    
    // Check required veggie fields
    if (typeof veggie.name !== 'string') {
      errors.push(`Veggie at index ${i} must have a name`);
    }
    
    if (typeof veggie.growth !== 'number' || veggie.growth < 0) {
      errors.push(`Veggie at index ${i} has invalid growth value`);
    }
    
    if (typeof veggie.stash !== 'number' || veggie.stash < 0) {
      errors.push(`Veggie at index ${i} has invalid stash value`);
    }
  }
  
  return errors;
}

/**
 * Validates canning state structure
 */
function validateCanningState(canningState: Record<string, unknown>): string[] {
  const errors: string[] = [];
  
  if (!Array.isArray(canningState.recipes)) {
    errors.push('Canning state must have recipes array');
  }
  
  if (!Array.isArray(canningState.upgrades)) {
    errors.push('Canning state must have upgrades array');
  }
  
  if (!Array.isArray(canningState.activeProcesses)) {
    errors.push('Canning state must have activeProcesses array');
  }
  
  if (typeof canningState.maxSimultaneousProcesses !== 'number' || canningState.maxSimultaneousProcesses < 1) {
    errors.push('Canning state maxSimultaneousProcesses must be at least 1');
  }
  
  return errors;
}

/**
 * Validates bee state structure
 */
function validateBeeState(beeState: Record<string, unknown>): string[] {
  const errors: string[] = [];
  
  if (typeof beeState.unlocked !== 'boolean') {
    errors.push('Bee state unlocked must be a boolean');
  }
  
  if (!Array.isArray(beeState.boxes)) {
    errors.push('Bee state must have boxes array');
  }
  
  if (typeof beeState.regularHoney !== 'number' || beeState.regularHoney < 0) {
    errors.push('Bee state regularHoney must be a non-negative number');
  }
  
  if (typeof beeState.goldenHoney !== 'number' || beeState.goldenHoney < 0) {
    errors.push('Bee state goldenHoney must be a non-negative number');
  }
  
  return errors;
}

/**
 * Validates Christmas event state structure
 */
function validateChristmasEventState(state: Record<string, unknown>): string[] {
  const errors: string[] = [];
  
  if (typeof state.holidayCheer !== 'number' || state.holidayCheer < 0) {
    errors.push('Holiday cheer must be a non-negative number');
  }
  
  if (!Array.isArray(state.treePlots)) {
    errors.push('Christmas event must have treePlots array');
  }
  
  if (state.materials && typeof state.materials !== 'object') {
    errors.push('Christmas event materials must be an object');
  }
  
  return errors;
}

/**
 * Comprehensive save data validation
 * @param data - The data to validate
 * @returns Detailed validation result with errors and warnings
 */
export function validateSaveData(data: unknown): SaveValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic structure validation
  const structureErrors = validateBasicStructure(data);
  if (structureErrors.length > 0) {
    return { valid: false, errors: structureErrors, warnings };
  }
  
  const saveData = data as Record<string, unknown>;
  
  // Required fields validation
  errors.push(...validateRequiredFields(saveData));
  
  // If we have critical errors, return early
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }
  
  // Numeric bounds validation
  errors.push(...validateNumericBounds(saveData));
  
  // Veggies validation
  if (Array.isArray(saveData.veggies)) {
    errors.push(...validateVeggiesArray(saveData.veggies));
  }
  
  // Optional: Canning state validation
  if (saveData.canningState && typeof saveData.canningState === 'object') {
    errors.push(...validateCanningState(saveData.canningState as Record<string, unknown>));
  } else if (!saveData.canningState) {
    warnings.push('No canning state found - will be initialized with defaults');
  }
  
  // Optional: Bee state validation
  if (saveData.beeState && typeof saveData.beeState === 'object') {
    errors.push(...validateBeeState(saveData.beeState as Record<string, unknown>));
  } else if (!saveData.beeState) {
    warnings.push('No bee state found - will be initialized with defaults');
  }
  
  // Optional: Christmas event state validation
  if (saveData.christmasEventState && typeof saveData.christmasEventState === 'object') {
    errors.push(...validateChristmasEventState(saveData.christmasEventState as Record<string, unknown>));
  }
  
  // Check for old save format warnings
  if (!saveData.totalDaysElapsed && saveData.totalDaysElapsed !== 0) {
    warnings.push('Old save format detected - totalDaysElapsed will be calculated');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Quick validation check (returns boolean only)
 * For use where detailed errors aren't needed
 */
export function isValidSaveData(data: unknown): boolean {
  return validateSaveData(data).valid;
}

// ============================================================================
// INPUT SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitizes a string input to prevent XSS attacks
 * Used for any user-provided text that might be displayed
 */
export function sanitizeString(value: unknown, maxLength: number = 1000): string {
  if (typeof value !== 'string') {
    return '';
  }
  
  // Trim and limit length
  const trimmed = value.trim().slice(0, maxLength);
  
  // Remove potentially dangerous characters
  return trimmed.replace(/[<>'"&]/g, '');
}

/**
 * Validates and sanitizes recipe ingredient quantities
 */
export function validateIngredientQuantity(quantity: unknown): number {
  if (typeof quantity !== 'number' || isNaN(quantity)) {
    return 1;
  }
  
  // Clamp between 1 and 999
  return Math.max(1, Math.min(999, Math.floor(quantity)));
}

/**
 * Validates upgrade cost calculation doesn't overflow
 */
export function validateUpgradeCost(baseCost: number, scaling: number, level: number): number {
  // Prevent extremely high costs from calculations
  const MAX_COST = 1e15; // 1 quadrillion
  
  try {
    const cost = Math.ceil(baseCost * Math.pow(scaling, level));
    return Math.min(cost, MAX_COST);
  } catch {
    return MAX_COST;
  }
}
