import type { ParameterType, ProgrammingLanguage } from '../types/question';

// Display-only type keywords per language, for rendering a human-readable function
// signature in the question preview. Not used for grading (that happens server-side
// against the stored ParameterType values directly) - purely cosmetic, so an
// approximate/idiomatic keyword per language is fine here.
const TYPE_KEYWORDS: Record<ProgrammingLanguage, Partial<Record<ParameterType, string>>> = {
  CSharp: {
    Int: 'int',
    Long: 'long',
    Double: 'double',
    Boolean: 'bool',
    String: 'string',
    IntArray: 'int[]',
    DoubleArray: 'double[]',
    StringArray: 'string[]',
  },
  Java: {
    Int: 'int',
    Long: 'long',
    Double: 'double',
    Boolean: 'boolean',
    String: 'String',
    IntArray: 'int[]',
    DoubleArray: 'double[]',
    StringArray: 'String[]',
  },
  Python: {
    Int: 'int',
    Long: 'int',
    Double: 'float',
    Boolean: 'bool',
    String: 'str',
    IntArray: 'List[int]',
    DoubleArray: 'List[float]',
    StringArray: 'List[str]',
  },
  Cpp: {
    Int: 'int',
    Long: 'long',
    Double: 'double',
    Boolean: 'bool',
    String: 'string',
    IntArray: 'vector<int>',
    DoubleArray: 'vector<double>',
    StringArray: 'vector<string>',
  },
  JavaScript: {},
  Sql: {},
};

interface SignatureParams {
  functionName: string;
  returnType: ParameterType | null | undefined;
  parameters: { name: string; type: ParameterType }[];
  language: ProgrammingLanguage | null | undefined;
}

/** Builds a one-line, language-idiomatic function signature string for the preview - e.g. "public int Fibonacci(int n)" for C#, "def fibonacci(n: int) -> int:" for Python. Returns null when there isn't enough real data (no functionName) to build one. */
export function buildFunctionSignature({ functionName, returnType, parameters, language }: SignatureParams): string | null {
  if (!functionName.trim()) return null;
  const lang = language ?? 'CSharp';
  const keyword = (t: ParameterType) => TYPE_KEYWORDS[lang]?.[t] ?? t;
  const retKeyword = returnType ? keyword(returnType) : 'void';

  switch (lang) {
    case 'Python': {
      const args = parameters.map((p) => `${p.name}: ${keyword(p.type)}`).join(', ');
      return `def ${functionName}(${args})${returnType ? ` -> ${retKeyword}` : ''}:`;
    }
    case 'JavaScript': {
      const args = parameters.map((p) => p.name).join(', ');
      return `function ${functionName}(${args})`;
    }
    case 'Cpp': {
      const args = parameters.map((p) => `${keyword(p.type)} ${p.name}`).join(', ');
      return `${retKeyword} ${functionName}(${args})`;
    }
    case 'Java': {
      const args = parameters.map((p) => `${keyword(p.type)} ${p.name}`).join(', ');
      return `public ${retKeyword} ${functionName}(${args})`;
    }
    case 'CSharp':
    default: {
      const args = parameters.map((p) => `${keyword(p.type)} ${p.name}`).join(', ');
      return `public ${retKeyword} ${functionName}(${args})`;
    }
  }
}
