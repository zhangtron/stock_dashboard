/**
 * 骨架屏管理器
 * 处理加载状态的骨架屏显示
 */
class SkeletonManager {
  /**
   * 显示 Top 3 卡片骨架屏
   */
  static showTop3Skeleton() {
    for (let i = 0; i < 3; i++) {
      const container = document.getElementById(`top3-${i}`);
      if (container) {
        container.innerHTML = `
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text-short"></div>
          <div class="skeleton skeleton-price"></div>
          <div class="skeleton skeleton-tag"></div>
        `;
      }
    }
  }
  
  /**
   * 隐藏 Top 3 卡片骨架屏
   */
  static hideTop3Skeleton() {
    // 实际数据加载后，由 Components.renderTop3 替换
  }
  
  /**
   * 显示表格骨架屏
   */
  static showTableSkeleton(rows = 10) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    let html = '';
    for (let i = 0; i < rows; i++) {
      html += `
        <tr>
          <td><div class="skeleton skeleton-text-short"></div></td>
          <td><div class="skeleton skeleton-text"></div></td>
          <td><div class="skeleton skeleton-text-short"></div></td>
          <td><div class="skeleton skeleton-text-short"></div></td>
          <td><div class="skeleton skeleton-text-short"></div></td>
          <td><div class="skeleton skeleton-text-short"></div></td>
          <td><div class="skeleton skeleton-text-short"></div></td>
          <td><div class="skeleton skeleton-tag" style="width: 60px;"></div></td>
          <td><div class="skeleton skeleton-text-short"></div></td>
        </tr>
      `;
    }
    
    tbody.innerHTML = html;
  }
  
  /**
   * 显示分页骨架屏
   */
  static showPaginationSkeleton() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    let html = '';
    for (let i = 0; i < 7; i++) {
      html += `<li class="page-item"><span class="skeleton skeleton-tag" style="width: 36px; height: 36px;"></span></li>`;
    }
    
    pagination.innerHTML = html;
  }
  
  /**
   * 显示所有骨架屏
   */
  static showAllSkeletons() {
    this.showTop3Skeleton();
    this.showTableSkeleton();
    this.showPaginationSkeleton();
  }
  
  /**
   * 隐藏分页骨架屏
   */
  static hidePaginationSkeleton() {
    // 实际数据加载后，由 Components.renderPagination 替换
  }
}

// 导出到全局作用域
window.SkeletonManager = SkeletonManager;
