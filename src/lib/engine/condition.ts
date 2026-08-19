import { ConditionExpression, ConditionOperator } from '../types';

export function getDotPath(obj: Record<string, any>, path: string): any {
  if (!obj || typeof obj !== 'object' || !path) return undefined;
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    // Prototype pollution protection - do not traverse these
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

export function evaluateCondition(
  condition: ConditionExpression,
  context: Record<string, any>
): { result: boolean; explanation: string } {
  const actualValue = getDotPath(context, condition.field);
  const expectedValue = condition.value;
  let result = false;

  switch (condition.operator) {
    case 'equals':
      result = actualValue === expectedValue;
      break;
    case 'not_equals':
      result = actualValue !== expectedValue;
      break;
    case 'greater_than':
      result = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue > expectedValue;
      break;
    case 'greater_than_or_equal':
      result = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue >= expectedValue;
      break;
    case 'less_than':
      result = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue < expectedValue;
      break;
    case 'less_than_or_equal':
      result = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue <= expectedValue;
      break;
    case 'contains':
      if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
        result = actualValue.includes(expectedValue);
      } else if (Array.isArray(actualValue)) {
        result = actualValue.includes(expectedValue);
      }
      break;
    case 'in':
      if (Array.isArray(expectedValue)) {
        result = expectedValue.includes(actualValue as any);
      }
      break;
    default:
      result = false;
  }

  const actualStr = actualValue !== undefined ? JSON.stringify(actualValue) : 'undefined';
  const expectedStr = JSON.stringify(expectedValue);
  const explanation = `${condition.field} (${actualStr}) ${condition.operator} ${expectedStr} -> ${result}`;

  return { result, explanation };
}
