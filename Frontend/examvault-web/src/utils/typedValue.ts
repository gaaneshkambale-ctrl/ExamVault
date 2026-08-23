import type { ParameterType } from '../types/question';

// Admin authoring UI keeps every typed argument/expected-output as a plain
// text input, parsed into a real JSON value (number/string/boolean/array)
// against the parameter's declared type only when building the request -
// keeps the form simple while the wire payload stays properly typed.

function isArrayType(type: ParameterType): boolean {
  return type === 'IntArray' || type === 'DoubleArray' || type === 'StringArray';
}

function elementType(type: ParameterType): ParameterType {
  switch (type) {
    case 'IntArray':
      return 'Int';
    case 'DoubleArray':
      return 'Double';
    case 'StringArray':
      return 'String';
    default:
      return type;
  }
}

export function parseTypedValue(text: string, type: ParameterType): unknown {
  if (isArrayType(type)) {
    const inner = elementType(type);
    const trimmed = text.trim();
    if (!trimmed) return [];
    return trimmed.split(',').map((part) => parseTypedValue(part.trim(), inner));
  }

  switch (type) {
    case 'Int':
    case 'Long':
    case 'Double':
      return Number(text.trim());
    case 'Boolean':
      return text.trim().toLowerCase() === 'true';
    case 'String':
    default:
      return text;
  }
}

export function formatTypedValue(value: unknown, type: ParameterType): string {
  if (isArrayType(type)) {
    const inner = elementType(type);
    if (!Array.isArray(value)) return '';
    return value.map((item) => formatTypedValue(item, inner)).join(', ');
  }

  if (value === null || value === undefined) return '';
  return String(value);
}

export function typedValuePlaceholder(type: ParameterType): string {
  switch (type) {
    case 'Int':
    case 'Long':
      return 'e.g. 5';
    case 'Double':
      return 'e.g. 5.5';
    case 'Boolean':
      return 'true or false';
    case 'String':
      return 'e.g. hello';
    case 'IntArray':
      return 'e.g. 12, 35, 1, 10, 34, 1';
    case 'DoubleArray':
      return 'e.g. 1.5, 2.5, 3.5';
    case 'StringArray':
      return 'e.g. apple, banana, cherry';
    default:
      return '';
  }
}
