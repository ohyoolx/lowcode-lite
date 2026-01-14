import { getValueByPath } from '@lowcode-lite/shared';
import {
  EXPRESSION_REGEX,
  extractExpression,
  isSimpleExpression,
  isSimplePropertyPath,
} from './utils';

/**
 * 安全的表达式求值器
 * 使用 Function 构造器创建沙箱环境
 */
function safeEvaluate(code: string, context: Record<string, any>): any {
  const contextKeys = Object.keys(context);
  const contextValues = Object.values(context);
  
  try {
    // 创建沙箱函数
    const fn = new Function(
      ...contextKeys,
      `"use strict"; return (${code});`
    );
    
    return fn(...contextValues);
  } catch (error) {
    throw new Error(`Expression evaluation failed: ${code}\n${error}`);
  }
}

/**
 * 求值表达式
 * 支持简单属性引用和复杂表达式
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
  return safeEvaluate(content, context);
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
      const result = safeEvaluate(trimmedExpr, context);
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
    ];
    
    if (!keywords.includes(identifier)) {
      deps.add(identifier);
    }
  }
  
  return Array.from(deps);
}
