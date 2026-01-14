/**
 * 生成唯一 ID
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}-${timestamp}${randomPart}` : `${timestamp}${randomPart}`;
}

/**
 * 生成组件实例名
 */
export function generateComponentName(type: string, existingNames: string[]): string {
  let index = 1;
  let name = `${type}${index}`;
  
  while (existingNames.includes(name)) {
    index++;
    name = `${type}${index}`;
  }
  
  return name;
}
