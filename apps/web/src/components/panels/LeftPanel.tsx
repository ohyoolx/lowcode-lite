import { useState } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { ComponentPanel } from './ComponentPanel';
import { OutlinePanel } from './OutlinePanel';
import { DataPanel } from './DataPanel';
import { Layers, Plus, Database } from 'lucide-react';

interface LeftPanelProps {
  className?: string;
}

type TabType = 'components' | 'outline' | 'data';

export function LeftPanel({ className }: LeftPanelProps) {
  useSignals();
  
  const [activeTab, setActiveTab] = useState<TabType>('components');

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'components', label: '组件', icon: Plus },
    { id: 'outline', label: '大纲', icon: Layers },
    { id: 'data', label: '数据', icon: Database },
  ];

  return (
    <aside className={cn('border-r bg-background flex flex-col', className)}>
      {/* Tab 切换 */}
      <div className="flex border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'components' && (
          <ComponentPanel className="h-full border-r-0" />
        )}
        {activeTab === 'outline' && (
          <OutlinePanel className="h-full" />
        )}
        {activeTab === 'data' && (
          <DataPanel className="h-full" />
        )}
      </div>
    </aside>
  );
}
