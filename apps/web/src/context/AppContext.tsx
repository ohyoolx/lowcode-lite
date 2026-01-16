import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { signal, type Signal } from '@preact/signals-react';
import type { AppContext as CoreAppContext } from '@lowcode-lite/core';
import type { ComponentData } from '@lowcode-lite/shared';

interface EditorState {
  selectedComponentId: Signal<string | null>;
  isDragging: Signal<boolean>;
  isPreviewMode: Signal<boolean>;
  showSettings: Signal<boolean>;
  /** 剪贴板中的组件数据（用于复制粘贴） */
  clipboard: Signal<ComponentData | null>;
}

interface AppContextValue {
  appContext: CoreAppContext;
  editor: EditorState;
}

const AppContext = createContext<AppContextValue | null>(null);

// 创建稳定的编辑器状态（只创建一次）
function createEditorState(): EditorState {
  return {
    selectedComponentId: signal<string | null>(null),
    isDragging: signal(false),
    isPreviewMode: signal(false),
    showSettings: signal(false),
    clipboard: signal<ComponentData | null>(null),
  };
}

export function AppProvider({
  context,
  children,
}: {
  context: CoreAppContext;
  children: ReactNode;
}) {
  // 使用 useMemo 确保 editorState 只创建一次
  const editorState = useMemo(() => createEditorState(), []);

  // 使用 useMemo 确保 value 对象引用稳定
  const value = useMemo(
    () => ({ appContext: context, editor: editorState }),
    [context, editorState]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

export function useEditor(): EditorState {
  return useAppContext().editor;
}

export function useCoreContext(): CoreAppContext {
  return useAppContext().appContext;
}
