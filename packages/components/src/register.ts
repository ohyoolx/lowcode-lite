import { registerComponents } from '@lowcode-lite/core';
// 基础组件
import {
  ButtonComp,
  TextComp,
  InputComp,
  ImageComp,
  ContainerComp,
} from './basic';
// 表单组件
import {
  SelectComp,
  CheckboxComp,
  SwitchComp,
  TextareaComp,
  RadioComp,
} from './form';
// 数据展示组件
import {
  TableComp,
  ProgressComp,
  BadgeComp,
} from './data';
// 布局组件
import { DividerComp, FormComp, ModalComp } from './layout';

/**
 * 注册所有内置组件
 */
export function registerBuiltinComponents() {
  registerComponents([
    // 基础组件
    ButtonComp,
    TextComp,
    InputComp,
    ImageComp,
    ContainerComp,
    // 表单组件
    SelectComp,
    CheckboxComp,
    SwitchComp,
    TextareaComp,
    RadioComp,
    // 数据展示组件
    TableComp,
    ProgressComp,
    BadgeComp,
    // 布局组件
    DividerComp,
    FormComp,
    ModalComp,
  ]);
}
