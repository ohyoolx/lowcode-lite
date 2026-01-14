import { useSignals } from '@preact/signals-react/runtime';
import { X, Settings, Grid, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCoreContext, useEditor } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { AppData } from '@lowcode-lite/shared';
import { GRID_ROW_HEIGHT, GRID_MARGIN, GRID_COLS } from '../canvas/gridUtils';

interface SettingsDialogProps {
  onClose?: () => void;
}

type TabType = 'general' | 'canvas' | 'about';

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  useSignals();
  
  const appContext = useCoreContext();
  const editor = useEditor();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  
  const schema = appContext.schema;
  
  const handleNameChange = (name: string) => {
    appContext.updateSchema(s => ({ ...s, name }), '修改应用名称');
  };
  
  const handleClose = () => {
    editor.showSettings.value = false;
    onClose?.();
  };
  
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: '基本设置', icon: Settings },
    { id: 'canvas', label: '画布设置', icon: Grid },
    { id: 'about', label: '关于', icon: Info },
  ];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">应用设置</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Tabs */}
          <div className="w-48 border-r bg-muted/30 p-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          
          {/* Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'general' && (
              <GeneralSettings 
                name={schema.name}
                onNameChange={handleNameChange}
              />
            )}
            {activeTab === 'canvas' && (
              <CanvasSettings />
            )}
            {activeTab === 'about' && (
              <AboutPanel schema={schema} />
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={handleClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}

// 基本设置面板
function GeneralSettings({ 
  name, 
  onNameChange 
}: { 
  name: string; 
  onNameChange: (name: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4">基本信息</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              应用名称
            </label>
            <Input 
              value={name}
              onChange={e => onNameChange(e.target.value)}
              placeholder="输入应用名称"
            />
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-4">危险操作</h3>
        <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">
            以下操作不可恢复，请谨慎操作
          </p>
          <Button variant="destructive" size="sm">
            清空所有组件
          </Button>
        </div>
      </div>
    </div>
  );
}

// 画布设置面板
function CanvasSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4">画布说明</h3>
        <div className="p-4 border rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground mb-3">
            画布会自动根据屏幕宽度铺满，始终保持 {GRID_COLS} 列网格布局，列宽会根据画布宽度自动调整。
          </p>
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-4">网格设置</h3>
        <div className="p-4 border rounded-lg bg-muted/30">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">列数</span>
              <p className="font-medium">{GRID_COLS} 列（固定）</p>
            </div>
            <div>
              <span className="text-muted-foreground">行数</span>
              <p className="font-medium">自动拓展</p>
            </div>
            <div>
              <span className="text-muted-foreground">行高</span>
              <p className="font-medium">{GRID_ROW_HEIGHT}px</p>
            </div>
            <div>
              <span className="text-muted-foreground">间距</span>
              <p className="font-medium">{GRID_MARGIN}px</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 关于面板
function AboutPanel({ schema }: { schema: AppData }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
          <span className="text-2xl text-white font-bold">L</span>
        </div>
        <h3 className="text-xl font-bold">LowCode Lite</h3>
        <p className="text-sm text-muted-foreground mt-1">轻量化低代码平台</p>
        <p className="text-xs text-muted-foreground mt-4">版本 0.1.0</p>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm py-2 border-b">
          <span className="text-muted-foreground">应用版本</span>
          <span className="font-medium">v{schema.version}</span>
        </div>
        <div className="flex justify-between text-sm py-2 border-b">
          <span className="text-muted-foreground">前端框架</span>
          <span className="font-medium">React + Signals</span>
        </div>
        <div className="flex justify-between text-sm py-2 border-b">
          <span className="text-muted-foreground">后端框架</span>
          <span className="font-medium">Bun + Hono</span>
        </div>
        <div className="flex justify-between text-sm py-2 border-b">
          <span className="text-muted-foreground">UI 库</span>
          <span className="font-medium">shadcn/ui</span>
        </div>
      </div>
      
      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>Made with ❤️ by LuTing & AI</p>
        <p className="mt-1">© 2026 LowCode Lite</p>
      </div>
    </div>
  );
}
