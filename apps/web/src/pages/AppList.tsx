import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { appsApi, type AppListItem } from '@/api';
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
  RefreshCw,
  LayoutGrid,
  Blocks,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppList() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newAppName, setNewAppName] = useState('');

  // 加载应用列表
  const loadApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await appsApi.list();
      setApps(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  // 创建应用
  const handleCreate = async () => {
    if (!newAppName.trim()) return;

    try {
      const result = await appsApi.create({ name: newAppName.trim() });
      setNewAppName('');
      setCreating(false);
      // 跳转到编辑器
      navigate(`/editor/${result.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    }
  };

  // 删除应用
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除应用 "${name}" 吗？此操作不可恢复。`)) return;

    try {
      await appsApi.delete(id);
      loadApps();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 过滤应用
  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Blocks className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  LowCode Lite
                </h1>
                <p className="text-xs text-muted-foreground">轻量化低代码平台</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={loadApps} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
                刷新
              </Button>
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4 mr-1" />
                新建应用
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索应用..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            <p>{error}</p>
            <Button variant="link" className="text-red-600 p-0 h-auto mt-2" onClick={loadApps}>
              重试
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && apps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin mb-4" />
            <p>加载中...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && apps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <LayoutGrid className="h-10 w-10 opacity-30" />
            </div>
            <h2 className="text-lg font-medium mb-2">暂无应用</h2>
            <p className="text-sm mb-6">点击"新建应用"开始创建您的第一个应用</p>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" />
              新建应用
            </Button>
          </div>
        )}

        {/* App Grid */}
        {filteredApps.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onEdit={() => navigate(`/editor/${app.id}`)}
                onDelete={() => handleDelete(app.id, app.name)}
              />
            ))}
          </div>
        )}

        {/* No Search Results */}
        {!loading && apps.length > 0 && filteredApps.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>没有找到匹配的应用</p>
          </div>
        )}
      </main>

      {/* Create App Modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">新建应用</h2>
            <Input
              placeholder="输入应用名称"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setCreating(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={!newAppName.trim()}>
                创建
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// App Card Component
function AppCard({
  app,
  onEdit,
  onDelete,
}: {
  app: AppListItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Preview Area */}
      <div
        className="h-40 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center cursor-pointer relative"
        onClick={onEdit}
      >
        <div className="w-16 h-16 rounded-xl bg-white shadow-lg flex items-center justify-center">
          <LayoutGrid className="h-8 w-8 text-slate-400" />
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            'absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium',
            app.status === 'published'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          )}
        >
          {app.status === 'published' ? '已发布' : '草稿'}
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{app.name}</h3>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {app.description || '暂无描述'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              更新于 {new Date(app.updatedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border py-1 w-32 z-20">
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-slate-100 flex items-center gap-2"
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    编辑
                  </button>
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-slate-100 flex items-center gap-2 text-red-600"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Edit className="h-3 w-3 mr-1" />
            编辑
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <ExternalLink className="h-3 w-3 mr-1" />
            预览
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AppList;
