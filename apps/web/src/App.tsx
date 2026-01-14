import { useState } from 'react';
import { createAppContext } from '@lowcode-lite/core';
import { registerBuiltinComponents } from '@lowcode-lite/components';
import { Header } from './components/layout/Header';
import { ComponentPanel } from './components/panels/ComponentPanel';
import { Canvas } from './components/canvas/Canvas';
import { PropertyPanel } from './components/panels/PropertyPanel';
import { AppProvider } from './context/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// 注册内置组件
registerBuiltinComponents();

function EditorContent() {
  // 使用键盘快捷键
  useKeyboardShortcuts();

  return (
    <div className="editor-layout">
      <Header className="editor-header" />
      <ComponentPanel className="editor-sidebar-left" />
      <Canvas className="editor-canvas" />
      <PropertyPanel className="editor-sidebar-right" />
    </div>
  );
}

function App() {
  const [appContext] = useState(() => createAppContext());

  return (
    <AppProvider context={appContext}>
      <EditorContent />
    </AppProvider>
  );
}

export default App;
