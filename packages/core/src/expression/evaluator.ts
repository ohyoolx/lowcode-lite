import { getValueByPath } from '@lowcode-lite/shared';
import {
  EXPRESSION_REGEX,
  extractExpression,
  isSimpleExpression,
  isSimplePropertyPath,
} from './utils';
import { evalInSandbox } from './sandbox';

/**
 * 求值表达式
 * 支持简单属性引用和复杂表达式
 * 注意：表达式需要用 {{}} 包裹
 */
export function evaluateExpr(expr: string, context: Record<string, any>): any {
  // 提取表达式内容
  const content = extractExpression(expr);
  if (!content) {
    return expr; // 不是表达式，返回原值
  }
  
  // 简单属性引用: {{button1.text}}
  if (isSimplePropertyPath(content)) {
    return getValueByPath(context, content);
  }
  
  // 复杂表达式: {{button1.text + ' - ' + input1.value}}
  // 支持完整的 JavaScript 语法，包括数组方法、lodash 等
  return evalInSandbox(content, context);
}

/**
 * 求值纯表达式（不需要 {{}} 包裹）
 * 用于 DataResponder 的 watch 表达式和 Transformer 的代码求值
 */
export function evaluatePureExpr(expr: string, context: Record<string, any>): any {
  const trimmedExpr = expr.trim();
  
  if (!trimmedExpr) {
    return undefined;
  }
  
  // 简单属性引用: select1.value
  if (isSimplePropertyPath(trimmedExpr)) {
    return getValueByPath(context, trimmedExpr);
  }
  
  // 复杂表达式: button1.text + ' - ' + input1.value
  // 支持完整的 JavaScript 语法
  return evalInSandbox(trimmedExpr, context);
}

/**
 * 求值模板字符串
 * 支持混合文本和表达式: "Hello, {{name}}!"
 */
export function evaluateTemplate(
  template: string,
  context: Record<string, any>
): string {
  // 如果是简单表达式，直接返回求值结果（可能不是字符串）
  if (isSimpleExpression(template)) {
    const result = evaluateExpr(template, context);
    return String(result ?? '');
  }
  
  // 混合模板，替换所有表达式
  return template.replace(EXPRESSION_REGEX, (match, expr) => {
    try {
      const trimmedExpr = expr.trim();
      
      // 简单属性引用
      if (isSimplePropertyPath(trimmedExpr)) {
        const result = getValueByPath(context, trimmedExpr);
        return String(result ?? '');
      }
      
      // 复杂表达式
      const result = evalInSandbox(trimmedExpr, context);
      return String(result ?? '');
    } catch (error) {
      console.warn('Template expression failed:', match, error);
      return match; // 保持原样
    }
  });
}

/**
 * 获取表达式中的依赖
 * 返回表达式引用的组件名列表
 */
export function getExpressionDependencies(expr: string): string[] {
  const content = extractExpression(expr);
  if (!content) return [];
  
  const deps = new Set<string>();
  
  // 匹配所有标识符
  const identifierRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  let match;
  
  while ((match = identifierRegex.exec(content)) !== null) {
    const identifier = match[1];
    // 排除 JavaScript 关键字和内置对象
    const keywords = [
      'true', 'false', 'null', 'undefined',
      'if', 'else', 'for', 'while', 'return',
      'function', 'var', 'let', 'const',
      'Math', 'Date', 'String', 'Number', 'Boolean', 'Array', 'Object',
      'JSON', 'console',
      '_', // lodash
      'parseInt', 'parseFloat', 'isNaN', 'isFinite',
      'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
      'NaN', 'Infinity',
      'filter', 'map', 'reduce', 'find', 'some', 'every', 'includes',
      'item', 'index', 'arr', 'acc', 'val', 'key', 'value', // 常用回调参数名
    ];
    
    if (!keywords.includes(identifier)) {
      deps.add(identifier);
    }
  }
  
  return Array.from(deps);
}
