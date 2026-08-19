/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { evaluateCondition, getDotPath } from './condition';
import { ConditionExpression } from '../types';

describe('getDotPath', () => {
  it('should get nested values', () => {
    const obj = { a: { b: { c: 123 } } };
    expect(getDotPath(obj, 'a.b.c')).toBe(123);
  });
  
  it('should return undefined for missing paths', () => {
    const obj = { a: { b: { c: 123 } } };
    expect(getDotPath(obj, 'a.x.c')).toBeUndefined();
  });
  
  it('should prevent prototype pollution', () => {
    const obj = {};
    expect(getDotPath(obj, '__proto__')).toBeUndefined();
    expect(getDotPath(obj, 'constructor')).toBeUndefined();
    expect(getDotPath(obj, 'prototype')).toBeUndefined();
  });
});

describe('evaluateCondition', () => {
  it('should evaluate equals', () => {
    const cond: ConditionExpression = { field: 'a.b', operator: 'equals', value: 5 };
    expect(evaluateCondition(cond, { a: { b: 5 } }).result).toBe(true);
    expect(evaluateCondition(cond, { a: { b: 6 } }).result).toBe(false);
  });
  
  it('should evaluate greater_than', () => {
    const cond: ConditionExpression = { field: 'score', operator: 'greater_than', value: 80 };
    expect(evaluateCondition(cond, { score: 85 }).result).toBe(true);
    expect(evaluateCondition(cond, { score: 80 }).result).toBe(false);
  });
  
  it('should evaluate in', () => {
    const cond: ConditionExpression = { field: 'status', operator: 'in', value: ['ACTIVE', 'PENDING'] };
    expect(evaluateCondition(cond, { status: 'ACTIVE' }).result).toBe(true);
    expect(evaluateCondition(cond, { status: 'CLOSED' }).result).toBe(false);
  });
});
