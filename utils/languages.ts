export const SUPPORTED_LANGUAGES = [
  'python',
  'javascript',
  'java',
  'kotlin',
  'c',
  'cpp',
  'go',
  'ruby',
  'php',
  'rust',
  'dart',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface TemplateLanguageSource {
  language?: string | null;
  title?: string | null;
  code?: string | null;
  tags?: Array<{ name?: string | null }>;
}

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value.toLowerCase() as SupportedLanguage);
}

export function inferTemplateLanguage(template: TemplateLanguageSource): SupportedLanguage {
  const explicitLanguage = template.language?.trim().toLowerCase();
  if (isSupportedLanguage(explicitLanguage)) return explicitLanguage;

  const tags = template.tags?.map((tag) => tag.name || '').join(' ') || '';
  const description = `${template.title || ''} ${tags}`.toLowerCase();
  const code = template.code || '';

  if (/c\+\+|\bcpp\b/.test(description) || /#include\s*<iostream>/.test(code)) return 'cpp';
  if (/javascript|\bnode\b/.test(description) || /console\.log\s*\(/.test(code)) return 'javascript';
  if (/kotlin/.test(description) || /\bfun\s+main\s*\(/.test(code)) return 'kotlin';
  if (/rust/.test(description) || /println!\s*\(/.test(code)) return 'rust';
  if (/dart/.test(description)) return 'dart';
  if (/ruby/.test(description) || /^\s*puts\s+/m.test(code)) return 'ruby';
  if (/php/.test(description) || /<\?php/.test(code)) return 'php';
  if (/golang|\bgo\b/.test(description) || /^\s*package\s+main/m.test(code)) return 'go';
  if (/java/.test(description) || /\bpublic\s+class\s+Main\b/.test(code)) return 'java';
  if (/\bc\b/.test(description) || /#include\s*<stdio\.h>/.test(code)) return 'c';

  return 'python';
}
