/**
 * 表达式沙箱执行器
 * 提供安全的 JavaScript 执行环境
 */
import * as _ from 'lodash-es';

// 全局变量黑名单，禁止访问
const blacklist = new Set<PropertyKey>([
  'top',
  'parent',
  'document',
  'location',
  'chrome',
  'fetch',
  'XMLHttpRequest',
  'importScripts',
  'Navigator',
  'MutationObserver',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'eval',
  'Function',
]);

// 全局变量名称
const globalVarNames = new Set<PropertyKey>(['window', 'globalThis', 'self', 'global']);

// 内置对象名称集合（这些对象不应该被复制/冻结，因为它们的方法不是可枚举的）
const builtinObjectNames = new Set<PropertyKey>([
  '_', 'Math', 'Date', 'JSON', 'String', 'Number', 'Boolean', 'Array', 'Object',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
  'console', 'undefined', 'NaN', 'Infinity',
]);

// 内置对象和方法，提供给表达式使用
const builtins: Record<string, unknown> = {
  // lodash
  _,
  
  // 数学
  Math,
  
  // 日期
  Date,
  
  // JSON
  JSON,
  
  // 类型转换
  String,
  Number,
  Boolean,
  Array,
  Object,
  
  // 工具函数
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURI,
  decodeURI,
  encodeURIComponent,
  decodeURIComponent,
  
  // 常量
  undefined,
  NaN,
  Infinity,
  
  // 控制台（可选，用于调试）
  console: {
    log: (...args: unknown[]) => console.log('[Expression]', ...args),
    warn: (...args: unknown[]) => console.warn('[Expression]', ...args),
    error: (...args: unknown[]) => console.error('[Expression]', ...args),
  },
  
  // 常用的数组/字符串方法都通过原型链自动可用
};

/**
 * 创建黑洞对象，用于拦截对禁止访问的属性的访问
 */
function createBlackHole(): unknown {
  return new Proxy(
    function () {
      return createBlackHole();
    },
    {
      get(target, prop) {
        if (prop === 'toString') {
          return function () {
            return '';
          };
        }
        if (prop === Symbol.toPrimitive) {
          return function () {
            return '';
          };
        }
        return createBlackHole();
      },
    }
  );
}

/**
 * 创建沙箱代理
 */
function createSandbox(context: Record<string, unknown>): Record<string, unknown> {
  // 合并上下文和内置对象
  const fullContext = { ...builtins, ...context };
  
  // 缓存已访问的值（冻结后的）
  const cache: Record<string | symbol, unknown> = {};
  
  return new Proxy(fullContext, {
    has() {
      // 代理所有变量访问
      return true;
    },
    
    get(target, prop, receiver) {
      if (prop === Symbol.unscopables) {
        return undefined;
      }
      
      if (prop === 'toJSON') {
        return target;
      }
      
      // 全局变量名返回沙箱本身
      if (globalVarNames.has(prop)) {
        return receiver;
      }
      
      // 检查是否在上下文中
      if (prop in target) {
        // 使用缓存
        if (prop in cache) {
          return cache[prop];
        }
        
        let value = Reflect.get(target, prop, receiver);
        
        // 内置对象直接返回，不进行冻结/复制
        // 因为内置对象（如 JSON, Math）的方法不是可枚举的，复制会丢失这些方法
        if (builtinObjectNames.has(prop)) {
          cache[prop] = value;
          return value;
        }
        
        // 对用户上下文中的对象进行冻结，防止意外修改
        if (typeof value === 'object' && value !== null && typeof value !== 'function') {
          try {
            // 深度冻结可能导致性能问题，只冻结第一层
            value = Object.freeze({ ...value as object });
          } catch {
            // 某些对象不能冻结，忽略
          }
        }
        
        cache[prop] = value;
        return value;
      }
      
      // 检查黑名单
      if (typeof prop === 'string' && blacklist.has(prop)) {
        return createBlackHole();
      }
      
      // 其他情况返回 undefined
      return undefined;
    },
    
    set(target, prop, value) {
      // 禁止修改上下文变量
      if (prop in target) {
        throw new Error(`Cannot modify "${String(prop)}"`);
      }
      // 允许创建临时变量
      return Reflect.set(target, prop, value);
    },
    
    defineProperty(target, prop) {
      if (prop in target) {
        throw new Error(`Cannot redefine "${String(prop)}"`);
      }
      return false;
    },
    
    deleteProperty() {
      throw new Error('Cannot delete properties in sandbox');
    },
    
    setPrototypeOf() {
      throw new Error('Cannot change prototype in sandbox');
    },
  });
}

/**
 * 在沙箱中执行表达式
 */
export function evalInSandbox(code: string, context: Record<string, unknown>): unknown {
  const sandbox = createSandbox(context);
  
  // 使用 with 语句将沙箱作为作用域
  const wrappedCode = `
    with (this) {
      return (function() {
        'use strict';
        return (${code});
      }).call(this);
    }
  `;
  
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(wrappedCode);
    return fn.call(sandbox);
  } catch (error) {
    throw new Error(
      `Expression evaluation failed: ${code}\n${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 在沙箱中执行函数体（支持多语句）
 */
export function evalFuncInSandbox(
  functionBody: string,
  context: Record<string, unknown>,
  isAsync = false
): unknown {
  const sandbox = createSandbox(context);
  
  const wrappedCode = `
    with (this) {
      return (${isAsync ? 'async ' : ''}function() {
        'use strict';
        ${functionBody}
      }).call(this);
    }
  `;
  
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(wrappedCode);
    return fn.call(sandbox);
  } catch (error) {
    throw new Error(
      `Function evaluation failed\n${error instanceof Error ? error.message : String(error)}`
    );
  }
}
