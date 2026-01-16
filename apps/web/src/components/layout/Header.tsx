import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSignals } from '@preact/signals-react/runtime';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Pencil,
  Check,
  ChevronDown,
} from 'lucide-react';
import { useCoreContext, useEditor } from '@/context/AppContext';

interface HeaderProps {
  className?: string;
  appName?: string;
  onSave?: () => Promise<void> | void;
  onRename?: (newName: string) => Promise<void> | void;
  saving?: boolean;
}

export function Header({ className, appName = '未命名应用', onSave, onRename, saving }: HeaderProps) {
  useSignals();
  
  const appContext = useCoreContext();
  const editor = useEditor();
  
  const canUndo = appContext.history.canUndo.value;
  const canRedo = appContext.history.canRedo.value;
  const isPreviewMode = editor.isPreviewMode.value;
  
  // 应用名称编辑状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(appName);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // 历史记录下拉菜单状态
  const [showUndoHistory, setShowUndoHistory] = useState(false);
  const [showRedoHistory, setShowRedoHistory] = useState(false);
  
  // 同步 appName 到编辑状态
  useEffect(() => {
    setEditingName(appName);
  }, [appName]);
  
  // 聚焦输入框
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);
  
  // Ctrl+S 快捷键保存
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSave && !saving) {
          try {
            await onSave();
            toast.success('保存成功');
          } catch (err) {
            toast.error('保存失败');
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, saving]);
  
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
  
  // 处理名称编辑提交
  const handleNameSubmit = async () => {
    if (editingName.trim() && editingName !== appName) {
      try {
        await onRename?.(editingName.trim());
        toast.success('重命名成功');
      } catch (err) {
        toast.error('重命名失败');
        setEditingName(appName);
      }
    } else {
      setEditingName(appName);
    }
    setIsEditingName(false);
  };
  
  // 处理按键事件
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingName(appName);
      setIsEditingName(false);
    }
  };
  
  // 处理保存按钮点击
  const handleSaveClick = async () => {
    if (onSave && !saving) {
      try {
        await onSave();
        toast.success('保存成功');
      } catch (err) {
        toast.error('保存失败');
      }
    }
  };
  
  // 获取历史记录
  const undoList = appContext.history.getUndoList();
  const redoList = appContext.history.getRedoList();

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
        {isEditingName ? (
          <div className="flex items-center gap-1">
            <Input
              ref={nameInputRef}
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleNameKeyDown}
              className="h-7 w-40 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleNameSubmit}
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            onClick={() => setIsEditingName(true)}
            title="点击编辑应用名称"
          >
            <span>{appName}</span>
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1">
        {/* 撤销按钮组 */}
        <div className="relative flex items-center rounded-md hover:bg-muted/50 transition-colors">
          <Button 
            variant="ghost" 
            size="icon" 
            title={`撤销${canUndo ? ` (${appContext.history.undoCount})` : ''}`}
            disabled={!canUndo}
            onClick={handleUndo}
            className="rounded-r-none hover:bg-transparent"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border/40" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-5 rounded-l-none px-0 hover:bg-transparent"
            disabled={!canUndo}
            onClick={() => setShowUndoHistory(!showUndoHistory)}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          
          {/* 撤销历史下拉菜单 */}
          {showUndoHistory && undoList.length > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUndoHistory(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-xl border py-1 w-56 z-20 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                  撤销历史 ({undoList.length})
                </div>
                {undoList.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 text-sm hover:bg-slate-100 flex items-center justify-between"
                  >
                    <span className="truncate">{item.description}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* 重做按钮组 */}
        <div className="relative flex items-center rounded-md hover:bg-muted/50 transition-colors">
          <Button 
            variant="ghost" 
            size="icon" 
            title={`重做${canRedo ? ` (${appContext.history.redoCount})` : ''}`}
            disabled={!canRedo}
            onClick={handleRedo}
            className="rounded-r-none hover:bg-transparent"
          >
            <Redo className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border/40" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-5 rounded-l-none px-0 hover:bg-transparent"
            disabled={!canRedo}
            onClick={() => setShowRedoHistory(!showRedoHistory)}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          
          {/* 重做历史下拉菜单 */}
          {showRedoHistory && redoList.length > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowRedoHistory(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-xl border py-1 w-56 z-20 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                  重做历史 ({redoList.length})
                </div>
                {redoList.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 text-sm hover:bg-slate-100 flex items-center justify-between"
                  >
                    <span className="truncate">{item.description}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
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
        <Button variant="outline" size="sm" onClick={handleSaveClick} disabled={saving} title="保存 (Ctrl+S)">
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
