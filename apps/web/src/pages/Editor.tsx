import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignals } from '@preact/signals-react/runtime';
import { createAppContext } from '@lowcode-lite/core';
import { registerBuiltinComponents } from '@lowcode-lite/components';
import { Header } from '@/components/layout/Header';
import { LeftPanel } from '@/components/panels/LeftPanel';
import { Canvas } from '@/components/canvas/Canvas';
import { PropertyPanel } from '@/components/panels/PropertyPanel';
import { QueryPanel } from '@/components/panels/QueryPanel';
import { SettingsDialog } from '@/components/dialogs/SettingsDialog';
import { AppProvider, useEditor, useCoreContext } from '@/context/AppContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { appsApi } from '@/api';
import { RefreshCw, AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Globe, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AppData } from '@lowcode-lite/shared';

// 注册内置组件（只执行一次）
registerBuiltinComponents();

function EditorContent({
  onSave,
  saving,
  appName,
}: {
  onSave: () => void;
  saving: boolean;
  appName: string;
}) {
  useSignals();
  useKeyboardShortcuts();
  
  const editor = useEditor();
  const appContext = useCoreContext();
  
  const isPreviewMode = editor.isPreviewMode.value;
  const showSettings = editor.showSettings.value;
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  // 面板高度限制
  const MIN_PANEL_HEIGHT = 150;
  const MAX_PANEL_HEIGHT = 600;

  // 拖拽调整面板高度
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = bottomPanelHeight;
  }, [bottomPanelHeight]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = resizeStartY.current - e.clientY;
      const newHeight = Math.min(
        MAX_PANEL_HEIGHT,
        Math.max(MIN_PANEL_HEIGHT, resizeStartHeight.current + deltaY)
      );
      setBottomPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 添加更多快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z: 撤销
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        appContext.undo();
      }
      // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y: 重做
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        appContext.redo();
      }
      // Ctrl/Cmd + P: 预览
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        editor.isPreviewMode.value = !editor.isPreviewMode.value;
      }
      // Ctrl/Cmd + Q: 切换查询面板
      if ((e.metaKey || e.ctrlKey) && e.key === 'q') {
        e.preventDefault();
        setShowBottomPanel(prev => !prev);
      }
      // Escape: 退出预览/关闭设置
      if (e.key === 'Escape') {
        if (editor.showSettings.value) {
          editor.showSettings.value = false;
        } else if (editor.isPreviewMode.value) {
          editor.isPreviewMode.value = false;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appContext, editor]);

  // 获取布局类名
  const getLayoutClassName = () => {
    if (isPreviewMode) return 'editor-layout-preview';
    if (showBottomPanel) return 'editor-layout-with-bottom';
    return 'editor-layout';
  };

  return (
    <div className={getLayoutClassName()}>
      <Header
        className="editor-header"
        appName={appName}
        onSave={onSave}
        saving={saving}
      />
      
      {!isPreviewMode && (
        <LeftPanel className="editor-sidebar-left" />
      )}
      
      <Canvas className="editor-canvas" />
      
      {!isPreviewMode && (
        <PropertyPanel className="editor-sidebar-right" />
      )}
      
      {/* 底部查询面板 */}
      {!isPreviewMode && showBottomPanel && (
        <div 
          className="editor-bottom-panel flex flex-col"
          style={{ height: bottomPanelHeight }}
        >
          {/* 拖拽调整高度的手柄 */}
          <div
            className={cn(
              'h-1.5 cursor-ns-resize group flex items-center justify-center',
              'hover:bg-primary/20 transition-colors',
              isResizing && 'bg-primary/30'
            )}
            onMouseDown={handleResizeStart}
          >
            <div className={cn(
              'w-12 h-1 rounded-full bg-border',
              'group-hover:bg-primary/50 transition-colors',
              isResizing && 'bg-primary'
            )} />
          </div>
          
          {/* 面板标题栏 */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">数据源 / 查询</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowBottomPanel(false)}
                title="收起面板"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* 面板内容 */}
          <div className="flex-1 overflow-hidden">
            <QueryPanel className="h-full" />
          </div>
        </div>
      )}
      
      {/* 底部面板折叠后的按钮 */}
      {!isPreviewMode && !showBottomPanel && (
        <button
          onClick={() => setShowBottomPanel(true)}
          className={cn(
            'fixed bottom-4 left-1/2 -translate-x-1/2 z-10',
            'flex items-center gap-2 px-4 py-2 rounded-full',
            'bg-primary text-primary-foreground shadow-lg',
            'hover:bg-primary/90 transition-colors'
          )}
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium">查询</span>
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
      
      {/* 设置弹窗 */}
      {showSettings && <SettingsDialog />}
    </div>
  );
}

export function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [appName, setAppName] = useState('未命名应用');
  const [initialSchema, setInitialSchema] = useState<AppData | null>(null);

  // 创建 AppContext
  const appContext = useMemo(() => {
    if (!initialSchema) return null;
    return createAppContext(initialSchema);
  }, [initialSchema]);

  // 加载应用数据
  useEffect(() => {
    if (!id) {
      setError('缺少应用 ID');
      setLoading(false);
      return;
    }

    const loadApp = async () => {
      setLoading(true);
      setError(null);
      try {
        const app = await appsApi.get(id);
        setAppName(app.name);
        setInitialSchema(app.schema);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载应用失败');
      } finally {
        setLoading(false);
      }
    };

    loadApp();
  }, [id]);

  // 保存应用
  const handleSave = useCallback(async () => {
    if (!id || !appContext) return;

    setSaving(true);
    try {
      await appsApi.update(id, {
        schema: appContext.toJSON(),
      });
      console.log('保存成功');
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [id, appContext]);

  // 键盘快捷键保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">加载应用中...</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold mb-2">加载失败</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回列表
            </Button>
            <Button onClick={() => window.location.reload()}>重试</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!appContext) {
    return null;
  }

  return (
    <AppProvider context={appContext}>
      <EditorContent onSave={handleSave} saving={saving} appName={appName} />
    </AppProvider>
  );
}

export default Editor;
