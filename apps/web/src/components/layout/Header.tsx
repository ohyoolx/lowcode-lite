import { Link } from 'react-router-dom';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Save, 
  Undo, 
  Redo, 
  Settings, 
  Blocks, 
  ArrowLeft, 
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';
import { useCoreContext, useEditor } from '@/context/AppContext';

interface HeaderProps {
  className?: string;
  appName?: string;
  onSave?: () => void;
  saving?: boolean;
}

export function Header({ className, appName = '未命名应用', onSave, saving }: HeaderProps) {
  useSignals();
  
  const appContext = useCoreContext();
  const editor = useEditor();
  
  const canUndo = appContext.history.canUndo.value;
  const canRedo = appContext.history.canRedo.value;
  const isPreviewMode = editor.isPreviewMode.value;
  
  const handleUndo = () => {
    if (appContext.undo()) {
      editor.selectedComponentId.value = null;
    }
  };
  
  const handleRedo = () => {
    if (appContext.redo()) {
      editor.selectedComponentId.value = null;
    }
  };
  
  const togglePreview = () => {
    editor.isPreviewMode.value = !editor.isPreviewMode.value;
    if (editor.isPreviewMode.value) {
      editor.selectedComponentId.value = null;
    }
  };
  
  const toggleSettings = () => {
    editor.showSettings.value = !editor.showSettings.value;
  };

  // 预览模式的精简 Header
  if (isPreviewMode) {
    return (
      <header
        className={cn(
          'flex items-center justify-between px-4 border-b bg-gradient-to-r from-green-500 to-emerald-500 text-white',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5" />
          <span className="font-medium">预览模式</span>
          <span className="text-white/80 text-sm">- {appName}</span>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={togglePreview}
          className="text-white hover:bg-white/20"
        >
          <X className="h-4 w-4 mr-1" />
          退出预览
        </Button>
      </header>
    );
  }
  
  return (
    <header
      className={cn(
        'flex items-center justify-between px-4 border-b bg-background',
        className
      )}
    >
      {/* Logo & Back */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          title="返回应用列表"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Blocks className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            LowCode Lite
          </h1>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">{appName}</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          title={`撤销${canUndo ? ` (${appContext.history.undoCount})` : ''}`}
          disabled={!canUndo}
          onClick={handleUndo}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          title={`重做${canRedo ? ` (${appContext.history.redoCount})` : ''}`}
          disabled={!canRedo}
          onClick={handleRedo}
        >
          <Redo className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-2" />
        <Button 
          variant="ghost" 
          size="icon" 
          title="预览 (Ctrl+P)"
          onClick={togglePreview}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <Play className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          title="设置"
          onClick={toggleSettings}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          {saving ? '保存中...' : '保存'}
        </Button>
        <Button size="sm">发布</Button>
      </div>
    </header>
  );
}
