/**
 * 网格布局工具函数
 */

// 默认配置
export const GRID_COLS = 24;        // 24 列网格
export const GRID_ROW_HEIGHT = 16;  // 每行高度 16px
export const GRID_MARGIN = 4;       // 网格间距

// 计算初始行数：基于 16:9 比例
// 画布宽度 1200px，按 16:9 计算高度约为 675px
// 每行实际占用 = 行高 + 间距 = 16 + 4 = 20px
// 减去上下 padding (16*2=32px)，可用高度约 643px
// 初始行数 = 643 / 20 ≈ 32 行
export const INITIAL_GRID_ROWS = 32;

// 最小行数
export const MIN_GRID_ROWS = 20;

// 自动拓展阈值：当组件距离底部小于这个行数时，自动拓展
export const AUTO_EXPAND_THRESHOLD = 5;

// 组件最小尺寸限制（网格单位）
export const MIN_COMPONENT_WIDTH = 2;   // 最小宽度 2 列
export const MIN_COMPONENT_HEIGHT = 2;  // 最小高度 2 行

// 网格线显示配置
// 水平线间距与实际吸附单位一致（1 行 = 16px），便于用户直观理解吸附位置
export const GRID_LINE_ROW_INTERVAL = 1;  // 每 1 行画一条线 (1×16=16px)，与吸附间隔一致

export interface GridConfig {
  cols: number;
  rows: number;
  rowHeight: number;
  margin: number;
  containerWidth: number;
  containerPadding: number;
}

export const defaultGridConfig: GridConfig = {
  cols: GRID_COLS,
  rows: INITIAL_GRID_ROWS,
  rowHeight: GRID_ROW_HEIGHT,
  margin: GRID_MARGIN,
  containerWidth: 1200,
  containerPadding: 16,
};

/**
 * 计算需要的最小行数（基于所有组件的位置）
 */
export function calculateRequiredRows(components: Array<{ position: { y: number; h: number } }>): number {
  if (components.length === 0) {
    return INITIAL_GRID_ROWS;
  }
  
  // 找到最底部组件的位置
  const maxBottomY = Math.max(
    ...components.map(comp => comp.position.y + comp.position.h)
  );
  
  // 至少需要的行数 = 最底部位置 + 自动拓展阈值
  const requiredRows = maxBottomY + AUTO_EXPAND_THRESHOLD;
  
  // 返回需要的行数，但不小于初始行数
  return Math.max(INITIAL_GRID_ROWS, requiredRows);
}

/**
 * 计算单列宽度（像素）
 */
export function calcColWidth(config: GridConfig): number {
  const { cols, margin, containerWidth, containerPadding } = config;
  return (containerWidth - margin * (cols - 1) - containerPadding * 2) / cols;
}

/**
 * 计算画布高度（像素）
 */
export function calcCanvasHeight(config: GridConfig): number {
  const { rows, rowHeight, margin, containerPadding } = config;
  return rows * rowHeight + (rows - 1) * margin + containerPadding * 2;
}

/**
 * 将像素坐标转换为网格单位
 */
export function pxToGrid(
  config: GridConfig,
  leftPx: number,
  topPx: number
): { x: number; y: number } {
  const { margin, rowHeight, containerPadding, cols, rows } = config;
  const colWidth = calcColWidth(config);
  
  let x = Math.round((leftPx - containerPadding) / (colWidth + margin));
  let y = Math.round((topPx - containerPadding) / (rowHeight + margin));
  
  // 限制在有效范围内
  x = Math.max(0, Math.min(x, cols - 1));
  y = Math.max(0, Math.min(y, rows - 1));
  
  return { x, y };
}

/**
 * 将网格单位转换为像素坐标
 */
export function gridToPx(
  config: GridConfig,
  x: number,
  y: number
): { left: number; top: number } {
  const { margin, rowHeight, containerPadding } = config;
  const colWidth = calcColWidth(config);
  
  const left = Math.round(x * (colWidth + margin) + containerPadding);
  const top = Math.round(y * (rowHeight + margin) + containerPadding);
  
  return { left, top };
}

/**
 * 将像素尺寸转换为网格单位
 */
export function pxToGridSize(
  config: GridConfig,
  widthPx: number,
  heightPx: number
): { w: number; h: number } {
  const { margin, rowHeight } = config;
  const colWidth = calcColWidth(config);
  
  const w = Math.max(MIN_COMPONENT_WIDTH, Math.round((widthPx + margin) / (colWidth + margin)));
  const h = Math.max(MIN_COMPONENT_HEIGHT, Math.round((heightPx + margin) / (rowHeight + margin)));
  
  return { w, h };
}

/**
 * 将网格尺寸转换为像素尺寸
 */
export function gridSizeToPx(
  config: GridConfig,
  w: number,
  h: number
): { width: number; height: number } {
  const { margin, rowHeight } = config;
  const colWidth = calcColWidth(config);
  
  const width = Math.round(w * colWidth + (w - 1) * margin);
  const height = Math.round(h * rowHeight + (h - 1) * margin);
  
  return { width, height };
}

/**
 * 限制网格坐标在有效范围内
 */
export function clampGridPosition(
  config: GridConfig,
  x: number,
  y: number,
  w: number,
  h: number
): { x: number; y: number } {
  const { cols, rows } = config;
  
  return {
    x: Math.max(0, Math.min(x, cols - w)),
    y: Math.max(0, Math.min(y, rows - h)),
  };
}

/**
 * 限制组件尺寸在有效范围内
 */
export function clampGridSize(
  config: GridConfig,
  x: number,
  y: number,
  w: number,
  h: number
): { w: number; h: number } {
  const { cols, rows } = config;
  
  return {
    w: Math.max(MIN_COMPONENT_WIDTH, Math.min(w, cols - x)),
    h: Math.max(MIN_COMPONENT_HEIGHT, Math.min(h, rows - y)),
  };
}

/**
 * 计算组件完整的样式（位置和尺寸）
 */
export function calcComponentStyle(
  config: GridConfig,
  x: number,
  y: number,
  w: number,
  h: number
): { left: number; top: number; width: number; height: number } {
  const { left, top } = gridToPx(config, x, y);
  const { width, height } = gridSizeToPx(config, w, h);
  
  return { left, top, width, height };
}

/**
 * 检测两个组件是否碰撞
 */
export function collides(
  item1: { x: number; y: number; w: number; h: number; id?: string },
  item2: { x: number; y: number; w: number; h: number; id?: string }
): boolean {
  // 同一个组件不算碰撞
  if (item1.id && item2.id && item1.id === item2.id) return false;

  // 检查是否重叠
  if (item1.x + item1.w <= item2.x) return false; // item1 在 item2 左侧
  if (item1.x >= item2.x + item2.w) return false; // item1 在 item2 右侧
  if (item1.y + item1.h <= item2.y) return false; // item1 在 item2 上方
  if (item1.y >= item2.y + item2.h) return false; // item1 在 item2 下方

  return true; // 发生碰撞
}

/**
 * 计算需要向下移动多少行才能解决碰撞
 */
function deltaYToSolveCollision(
  itemToMove: { x: number; y: number; w: number; h: number },
  staticItem: { x: number; y: number; w: number; h: number }
): number {
  if (!collides(itemToMove, staticItem)) {
    return 0;
  }
  // 移动到静态组件的下方
  return staticItem.y + staticItem.h - itemToMove.y;
}

/**
 * 移动组件以解决与其他组件的碰撞
 * @returns [移动后的组件, 碰撞区域]
 */
function moveToSolveCollisions(
  itemToMove: { x: number; y: number; w: number; h: number; id?: string },
  staticItems: Array<{ x: number; y: number; w: number; h: number; id?: string }>
): [{ x: number; y: number; w: number; h: number; id?: string }, { x: number; y: number; w: number; h: number }] {
  const newItem = { ...itemToMove };
  let collisionArea = { x: newItem.x, y: newItem.y, w: newItem.w, h: newItem.h };

  for (const item of staticItems) {
    // 如果新组件的底部已经在当前静态组件的上方，可以跳过后续检查
    if (newItem.y + newItem.h <= item.y) {
      break;
    }

    const deltaY = deltaYToSolveCollision(newItem, item);
    if (deltaY > 0) {
      // 扩展碰撞区域的高度
      collisionArea = { ...collisionArea, h: collisionArea.h + deltaY };
      // 移动新组件
      newItem.y += deltaY;
    }
  }

  return [newItem, collisionArea];
}

/**
 * 级联布局算法：解决所有组件之间的碰撞
 * 
 * 算法思路：
 * 1. 拖动的组件具有最高优先级，位置不变
 * 2. 按 Y 轴从上到下遍历所有其他组件
 * 3. 对于每个组件，检查它是否与上方的任何组件碰撞
 * 4. 如果碰撞，将其向下移动到不碰撞的位置
 * 
 * @param components 所有组件
 * @param priorityComponent 优先级最高的组件（通常是正在拖动的组件，不会被移动）
 * @returns 调整后的组件数组
 */
export function cascadeLayout<T extends { id: string; position: { x: number; y: number; w: number; h: number } }>(
  components: T[],
  priorityComponent?: T
): T[] {
  if (components.length === 0) return [];

  const priorityId = priorityComponent?.id;
  
  // 创建组件位置的副本，用于计算
  const positions: Map<string, { x: number; y: number; w: number; h: number }> = new Map();
  components.forEach(c => {
    positions.set(c.id, { ...c.position });
  });

  // 按 Y 轴排序所有组件（优先组件排在最前面，保证它先被处理）
  const sortedComponents = [...components].sort((a, b) => {
    // 优先组件始终排在最前面
    if (a.id === priorityId) return -1;
    if (b.id === priorityId) return 1;
    // 其他组件按 Y 轴排序
    return a.position.y - b.position.y;
  });

  // 已经确定位置的组件列表
  const settledItems: Array<{ x: number; y: number; w: number; h: number; id: string }> = [];

  for (const comp of sortedComponents) {
    const currentPos = positions.get(comp.id)!;
    
    if (comp.id === priorityId) {
      // 优先组件位置不变，直接加入已确定列表
      settledItems.push({ ...currentPos, id: comp.id });
      continue;
    }

    // 检查当前组件是否与已确定的组件碰撞
    let newY = currentPos.y;
    
    for (const settled of settledItems) {
      // 检查是否碰撞
      const item1 = { ...currentPos, y: newY };
      if (collides(item1, settled)) {
        // 碰撞了，需要移动到已确定组件的下方
        const requiredY = settled.y + settled.h;
        if (requiredY > newY) {
          newY = requiredY;
        }
      }
    }

    // 更新位置
    positions.set(comp.id, { ...currentPos, y: newY });
    
    // 加入已确定列表（按 Y 轴排序插入）
    const settledItem = { ...currentPos, y: newY, id: comp.id };
    const insertIndex = settledItems.findIndex(item => item.y > newY);
    if (insertIndex === -1) {
      settledItems.push(settledItem);
    } else {
      settledItems.splice(insertIndex, 0, settledItem);
    }
  }

  // 返回调整后的组件数组
  return components.map(comp => ({
    ...comp,
    position: positions.get(comp.id)!,
  }));
}
