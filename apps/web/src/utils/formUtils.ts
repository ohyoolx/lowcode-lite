import { generateId, generateComponentName, type ComponentData } from '@lowcode-lite/shared';

/**
 * 为表单组件创建初始子组件
 * @param existingNames 已存在的组件名称列表（用于生成唯一名称）
 * @returns 初始子组件数组
 */
export function createFormInitialChildren(existingNames: string[]): ComponentData[] {
  const allNames = [...existingNames];
  
  // 创建标题文本组件
  const titleName = generateComponentName('text', allNames);
  allNames.push(titleName);
  const titleComp: ComponentData = {
    id: generateId('comp'),
    type: 'text',
    name: titleName,
    props: {
      content: '表单标题',
      fontSize: 'lg',
      fontWeight: 'semibold',
    },
    position: { x: 0, y: 0, w: 14, h: 2 },
  };
  
  // 创建输入框组件（用于收集表单数据）
  const inputName = generateComponentName('input', allNames);
  allNames.push(inputName);
  const inputComp: ComponentData = {
    id: generateId('comp'),
    type: 'input',
    name: inputName,
    props: {
      value: '',
      placeholder: '请输入...',
    },
    position: { x: 0, y: 3, w: 14, h: 2 },
  };
  
  // 创建取消按钮
  const cancelBtnName = generateComponentName('button', allNames);
  allNames.push(cancelBtnName);
  const cancelBtn: ComponentData = {
    id: generateId('comp'),
    type: 'button',
    name: cancelBtnName,
    props: {
      text: '取消',
      variant: 'secondary',
    },
    position: { x: 0, y: 8, w: 4, h: 2 },
  };
  
  // 创建提交按钮
  const submitBtnName = generateComponentName('button', allNames);
  allNames.push(submitBtnName);
  const submitBtn: ComponentData = {
    id: generateId('comp'),
    type: 'button',
    name: submitBtnName,
    props: {
      text: '提交',
      variant: 'default',
    },
    position: { x: 4, y: 8, w: 4, h: 2 },
  };
  
  return [titleComp, inputComp, cancelBtn, submitBtn];
}
