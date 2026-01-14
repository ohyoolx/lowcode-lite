/**
 * 表达式正则匹配
 */
export const EXPRESSION_REGEX = /\{\{(.+?)\}\}/g;
export const SIMPLE_EXPRESSION_REGEX = /^\{\{(.+)\}\}$/;

/**
 * 检查字符串是否是表达式
 */
export function isExpression(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return EXPRESSION_REGEX.test(value);
}

/**
 * 检查是否是简单表达式（整个字符串都是表达式）
 */
export function isSimpleExpression(value: string): boolean {
  return SIMPLE_EXPRESSION_REGEX.test(value);
}

/**
 * 提取表达式内容
 */
export function extractExpression(value: string): string | null {
  const match = value.match(SIMPLE_EXPRESSION_REGEX);
  return match ? match[1].trim() : null;
}

/**
 * 检查是否是简单属性引用（如 button1.text）
 */
export function isSimplePropertyPath(expr: string): boolean {
  return /^[\w.]+$/.test(expr);
}
