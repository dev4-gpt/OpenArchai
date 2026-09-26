#!/usr/bin/env node
/**
 * Zero-dependency Unit & E2E Test Runner for AtelierOS.
 * Built on Node v26 native `node:test` and `jiti`.
 *
 * Scans and executes all tests matching `src/lib/calculators/*.test.ts`
 * providing Jest/Vitest-compatible BDD globals (describe, it, test, expect).
 */

import { describe, it, test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createJiti } from 'jiti';

// Expose BDD test lifecycle globals
globalThis.describe = describe;
globalThis.it = it;
globalThis.test = test;
globalThis.before = before;
globalThis.after = after;
globalThis.beforeEach = beforeEach;
globalThis.afterEach = afterEach;

/**
 * Robust expect assertion wrapper conforming to Jest/Vitest contract.
 */
function createExpect(actual, isNot = false) {
  const matchers = {
    toBe(expected) {
      if (isNot) {
        if (actual === 0 && expected === 0) {
          assert.fail(`Expected value not to strictly equal: ${expected}`);
        } else {
          assert.notStrictEqual(actual, expected, `Expected value not to strictly equal: ${expected}`);
        }
      } else {
        if (actual === 0 && expected === 0) {
          assert.ok(true);
        } else {
          assert.strictEqual(actual, expected);
        }
      }
    },
    toEqual(expected) {
      if (isNot) {
        assert.notDeepStrictEqual(actual, expected, `Expected values not to deeply equal`);
      } else {
        assert.deepStrictEqual(actual, expected);
      }
    },
    toBeDefined() {
      if (isNot) {
        assert.strictEqual(actual, undefined, `Expected value to be undefined`);
      } else {
        assert.notStrictEqual(actual, undefined, `Expected value to be defined`);
      }
    },
    toBeUndefined() {
      if (isNot) {
        assert.notStrictEqual(actual, undefined, `Expected value not to be undefined`);
      } else {
        assert.strictEqual(actual, undefined, `Expected value to be undefined, received ${actual}`);
      }
    },
    toBeNull() {
      if (isNot) {
        assert.notStrictEqual(actual, null, `Expected value not to be null`);
      } else {
        assert.strictEqual(actual, null, `Expected null, received ${actual}`);
      }
    },
    toBeTruthy() {
      if (isNot) {
        assert.ok(!actual, `Expected falsy value, received truthy: ${actual}`);
      } else {
        assert.ok(actual, `Expected truthy value, received falsy: ${actual}`);
      }
    },
    toBeFalsy() {
      if (isNot) {
        assert.ok(actual, `Expected truthy value, received falsy: ${actual}`);
      } else {
        assert.ok(!actual, `Expected falsy value, received truthy: ${actual}`);
      }
    },
    toBeGreaterThan(expected) {
      if (isNot) {
        assert.ok(actual <= expected, `Expected ${actual} <= ${expected}`);
      } else {
        assert.ok(actual > expected, `Expected ${actual} > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (isNot) {
        assert.ok(actual < expected, `Expected ${actual} < ${expected}`);
      } else {
        assert.ok(actual >= expected, `Expected ${actual} >= ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (isNot) {
        assert.ok(actual >= expected, `Expected ${actual} >= ${expected}`);
      } else {
        assert.ok(actual < expected, `Expected ${actual} < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (isNot) {
        assert.ok(actual > expected, `Expected ${actual} > ${expected}`);
      } else {
        assert.ok(actual <= expected, `Expected ${actual} <= ${expected}`);
      }
    },
    toBeCloseTo(expected, numDigits = 2) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -numDigits) / 2;
      if (isNot) {
        assert.ok(diff > tolerance, `Expected ${actual} NOT close to ${expected} (diff: ${diff}, tol: ${tolerance})`);
      } else {
        assert.ok(diff <= tolerance, `Expected ${actual} close to ${expected} (diff: ${diff}, tol: ${tolerance})`);
      }
    },
    toContain(expected) {
      if (typeof actual === 'string') {
        const contains = actual.includes(expected);
        if (isNot) {
          assert.ok(!contains, `Expected string not to contain "${expected}"`);
        } else {
          assert.ok(contains, `Expected string to contain "${expected}", received "${actual}"`);
        }
      } else if (Array.isArray(actual)) {
        const contains = actual.includes(expected);
        if (isNot) {
          assert.ok(!contains, `Expected array not to contain item`);
        } else {
          assert.ok(contains, `Expected array to contain item`);
        }
      } else if (actual instanceof Set || actual instanceof Map) {
        const contains = actual.has(expected);
        if (isNot) {
          assert.ok(!contains, `Expected collection not to have key/item`);
        } else {
          assert.ok(contains, `Expected collection to have key/item`);
        }
      } else {
        throw new TypeError(`toContain requires string, array, or set/map, received ${typeof actual}`);
      }
    },
    toHaveLength(expected) {
      const len = actual?.length;
      if (isNot) {
        assert.notStrictEqual(len, expected, `Expected length not to be ${expected}`);
      } else {
        assert.strictEqual(len, expected, `Expected length ${expected}, received ${len}`);
      }
    },
    toHaveProperty(prop, value) {
      const hasProp = actual != null && Object.prototype.hasOwnProperty.call(actual, prop);
      if (isNot) {
        assert.ok(!hasProp, `Expected object not to have property "${prop}"`);
      } else {
        assert.ok(hasProp, `Expected object to have property "${prop}"`);
        if (value !== undefined) {
          assert.deepStrictEqual(actual[prop], value);
        }
      }
    },
    toMatch(pattern) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      const matches = regex.test(String(actual));
      if (isNot) {
        assert.ok(!matches, `Expected "${actual}" not to match ${regex}`);
      } else {
        assert.ok(matches, `Expected "${actual}" to match ${regex}`);
      }
    },
    toThrow(expectedError) {
      if (typeof actual !== 'function') {
        throw new TypeError(`toThrow expects a function, received ${typeof actual}`);
      }
      if (isNot) {
        assert.doesNotThrow(actual);
      } else if (expectedError) {
        assert.throws(actual, expectedError);
      } else {
        assert.throws(actual);
      }
    }
  };

  if (!isNot) {
    Object.defineProperty(matchers, 'not', {
      get() {
        return createExpect(actual, true);
      },
      configurable: true,
    });
  }
  return matchers;
}

globalThis.expect = (actual) => createExpect(actual);

// Locate project directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const calculatorsDir = path.resolve(webRoot, 'src/lib/calculators');

// Initialize Jiti TypeScript compiler
const jiti = createJiti(import.meta.url);

// Discover test files matching *.test.ts
const files = readdirSync(calculatorsDir)
  .filter((file) => file.endsWith('.test.ts'))
  .sort();

if (files.length === 0) {
  console.warn(`[test-runner] No test files found in ${calculatorsDir}`);
  process.exit(0);
}

console.log(`[test-runner] Discovered ${files.length} test suite(s) in src/lib/calculators:`);
for (const file of files) {
  console.log(`  • ${file}`);
}
console.log();

// Sequentially import and execute each test file
for (const file of files) {
  const filePath = path.resolve(calculatorsDir, file);
  await jiti.import(filePath);
}
