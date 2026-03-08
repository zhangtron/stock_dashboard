/**
 * 事件处理模块
 * 处理页面的所有交互事件
 */
class Events {
  static state = {
    currentPage: 1,
    sortBy: 'overall_score',
    sortOrder: 'desc',
    searchKeyword: '',
    searchDebounceTimer: null,
    sectorFilter: null, // 新增：板块筛选状态
    isSyncing: false, // 同步状态
  };
  
  /**
   * 初始化所有事件监听器
   */
  static init() {
    this.bindSortEvents();
    this.bindFilterEvents();
    this.bindPaginationEvents();
    this.bindSearchEvents();
    this.bindTopNavEvents();
    this.bindMobileMenuEvents();
    this.cloneNavLinksToMobileMenu();
    this.bindDetailEvents();
    this.bindSectorDoubleClickEvents(); // 新增：双击板块筛选事件
    this.bindSyncButton(); // 新增：同步按钮事件
  }

  /**
   * 绑定排序事件
   */
  static bindSortEvents() {
    document.querySelectorAll('.stock-table th.sort-icon').forEach(th => {
      th.addEventListener('click', () => {
        const sortBy = th.dataset.sort;
        
        if (this.state.sortBy === sortBy) {
          this.state.sortOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          this.state.sortBy = sortBy;
          this.state.sortOrder = 'desc';
        }
        
        this.fetchData();
      });
    });
  }
  
  /**
   * 绑定筛选事件
   */
  static bindFilterEvents() {
    const applyBtn = document.querySelector('.btn-primary');
    const resetBtn = document.querySelector('.btn-secondary');
    
    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.state.currentPage = 1;
        this.fetchData();
      });
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetFilters();
      });
    }
  }
  
  /**
   * 绑定分页事件
   */
  static bindPaginationEvents() {
    document.addEventListener('click', (e) => {
      const pageLink = e.target.closest('.page-link[data-page]');
      
      if (pageLink) {
        e.preventDefault();
        const page = parseInt(pageLink.dataset.page);
        
        if (page > 0 && page !== this.state.currentPage) {
          this.state.currentPage = page;
          this.fetchData();
        }
      }
    });
  }

  /**
   * 绑定顶部导航栏事件
   */
  static bindTopNavEvents() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');

        // 检查是否是建设中的功能
        if (link.classList.contains('under-construction')) {
          e.preventDefault();
          const featureName = link.getAttribute('data-feature');
          this.showUnderConstructionToast(featureName);
          return;
        }

        // 如果链接是 # (占位符)，阻止默认行为
        if (href === '#' || !href) {
          e.preventDefault();
        }

        // 更新激活状态
        navLinks.forEach(nav => nav.classList.remove('active'));
        link.classList.add('active');
      });
    });
  }

  /**
   * 显示建设中功能的提示
   */
  static showUnderConstructionToast(featureName) {
    // 移除现有的 toast
    const existingToast = document.querySelector('.construction-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.className = 'construction-toast';
    toast.innerHTML = `
      <div class="construction-toast-content">
        <span class="construction-toast-icon">🚧</span>
        <div class="construction-toast-text">
          <strong>${featureName}</strong>
          <span class="construction-toast-message">功能正在建设中，敬请期待！</span>
        </div>
        <button class="construction-toast-close" onclick="this.parentElement.parentElement.remove()">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;

    document.body.appendChild(toast);

    // 自动消失
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  /**
   * 绑定移动端汉堡菜单事件
   */
  static bindMobileMenuEvents() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenuDropdown = document.getElementById('mobileMenuDropdown');

    if (!mobileMenuToggle || !mobileMenuDropdown) return;

    // 点击切换菜单
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenuToggle.classList.toggle('active');
      mobileMenuDropdown.classList.toggle('active');
    });

    // 点击外部关闭菜单
    document.addEventListener('click', (e) => {
      if (!mobileMenuToggle.contains(e.target) &&
          !mobileMenuDropdown.contains(e.target)) {
        mobileMenuToggle.classList.remove('active');
        mobileMenuDropdown.classList.remove('active');
      }
    });
  }

  /**
   * 克隆导航链接到移动端菜单
   */
  static cloneNavLinksToMobileMenu() {
    const navLinks = document.querySelector('.top-nav > .nav-links');
    const mobileNavLinks = document.querySelector('.mobile-nav-links');

    if (navLinks && mobileNavLinks) {
      mobileNavLinks.innerHTML = navLinks.innerHTML;

      // 为移动端菜单中的链接添加点击关闭事件
      const mobileLinks = mobileNavLinks.querySelectorAll('.nav-link');
      mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
          const mobileMenuToggle = document.getElementById('mobileMenuToggle');
          const mobileMenuDropdown = document.getElementById('mobileMenuDropdown');

          if (mobileMenuToggle && mobileMenuDropdown) {
            mobileMenuToggle.classList.remove('active');
            mobileMenuDropdown.classList.remove('active');
          }
        });
      });
    }
  }

  /**
   * 获取筛选参数
   * @returns {Object} 筛选参数
   */
  static getFilterParams() {
    const params = {
      page: this.state.currentPage,
      page_size: 20,
      sort_by: this.state.sortBy,
      sort_order: this.state.sortOrder,
    };
    
    if (this.state.searchKeyword) {
      params.search = this.state.searchKeyword;
    } else {
      const stockCode = document.getElementById('stockCode')?.value?.trim();
      if (stockCode) params.stock_code = stockCode;
      
      const stockName = document.getElementById('stockName')?.value?.trim();
      if (stockName) params.stock_name = stockName;
    }
    
    // 添加板块筛选
    if (this.state.sectorFilter) {
      params.sector_name = this.state.sectorFilter;
    }
    
    const minScore = document.getElementById('minScore')?.value;
    if (minScore) params.min_overall_score = minScore;
    
    const maxScore = document.getElementById('maxScore')?.value;
    if (maxScore) params.max_overall_score = maxScore;
    
    const grade = document.getElementById('grade')?.value;
    if (grade) params.recommendation = grade;
    
    return params;
  }
  
  /**
   * 获取数据
   */
  static async fetchData() {
    try {
      // 显示骨架屏
      if (this.state.currentPage === 1) {
        SkeletonManager.showTop3Skeleton();
      }
      SkeletonManager.showTableSkeleton();
      SkeletonManager.showPaginationSkeleton();
      
      const params = this.getFilterParams();
      const data = await API.getScreeningData(params);
      
      // 渲染数据
      Components.renderTop3(data.top3);
      Components.renderTable(data.data);
      Components.renderPagination(data.total, data.page, data.page_size, data.total_pages);
      Components.updateTotalCount(data.total);
      Components.updateSortIcons(this.state.sortBy, this.state.sortOrder);
      
    } catch (error) {
      console.error('获取数据失败:', error);
      Components.showError(error.message || '加载数据失败，请稍后重试');
    }
  }
  
  /**
   * 重置筛选条件
   */
  static resetFilters() {
    const stockCode = document.getElementById('stockCode');
    const stockName = document.getElementById('stockName');
    const minScore = document.getElementById('minScore');
    const maxScore = document.getElementById('maxScore');
    const grade = document.getElementById('grade');
    const headerSearch = document.getElementById('headerSearch');
    const searchClear = document.getElementById('searchClear');
    
    if (stockCode) stockCode.value = '';
    if (stockName) stockName.value = '';
    if (minScore) minScore.value = '';
    if (maxScore) maxScore.value = '';
    if (grade) grade.value = '';
    
    if (headerSearch) headerSearch.value = '';
    if (searchClear) searchClear.style.display = 'none';
    
    this.state.searchKeyword = '';
    this.state.sectorFilter = null; // 清除板块筛选
    this.state.currentPage = 1;
    this.fetchData();
  }
  
  /**
   * 绑定搜索事件
   */
  static bindSearchEvents() {
    const searchToggle = document.getElementById('searchToggle');
    const searchBoxDropdown = document.getElementById('searchBoxDropdown');
    const searchInput = document.getElementById('headerSearch');
    const searchClear = document.getElementById('searchClear');
    const suggestionsContainer = document.getElementById('searchSuggestions');

    // 搜索框展开/收起
    if (searchToggle && searchBoxDropdown) {
      searchToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = searchBoxDropdown.style.display !== 'none';
        searchBoxDropdown.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
          searchInput?.focus();
          if (!searchInput.value.trim()) {
            this.fetchTopStocks();
          }
        }
      });

      // 点击外部关闭搜索框
      document.addEventListener('click', (e) => {
        if (!searchToggle.contains(e.target) && !searchBoxDropdown.contains(e.target)) {
          searchBoxDropdown.style.display = 'none';
        }
      });
    }

    if (!searchInput) return;

    if (suggestionsContainer) {
      suggestionsContainer.addEventListener('mouseleave', (e) => {
        Components.hideSearchSuggestions();
      });

      // 处理搜索建议和股票代码链接的点击事件
      document.addEventListener('click', (e) => {
        const suggestionItem = e.target.closest('.suggestion-item');

        if (suggestionItem) {
          const stockCode = suggestionItem.dataset.code;
          const stockName = suggestionItem.dataset.name;

          searchInput.value = stockCode;
          if (searchClear) {
            searchClear.style.display = 'flex';
          }
          Components.hideSearchSuggestions();
          this.applySearchFilter(stockCode);
        }

        const stockCodeLink = e.target.closest('.stock-code-link');
        if (stockCodeLink) {
          e.preventDefault();
          const code = stockCodeLink.dataset.stockCode;
          Components.openThsF10(code);
        }
      });
    }

    searchInput.addEventListener('input', (e) => {
      const keyword = e.target.value.trim();
      
      if (searchClear) {
        searchClear.style.display = keyword ? 'flex' : 'none';
      }
      
      if (this.state.searchDebounceTimer) {
        clearTimeout(this.state.searchDebounceTimer);
      }
      
      if (!keyword) {
        Components.hideSearchSuggestions();
        this.clearSearchFilter();
        return;
      }
      
      Components.showSearchSuggestionsLoading();
      
      this.state.searchDebounceTimer = setTimeout(async () => {
        await this.fetchSearchSuggestions(keyword);
      }, 500);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const keyword = searchInput.value.trim();
        
        if (keyword) {
          if (this.state.searchDebounceTimer) {
            clearTimeout(this.state.searchDebounceTimer);
          }
          
          this.applySearchFilter(keyword);
        }
      }
      
      if (e.key === 'Escape') {
        Components.hideSearchSuggestions();
      }
    });
    
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.style.display = 'none';
        Components.hideSearchSuggestions();
        this.clearSearchFilter();
        searchInput.focus();
      });
    }
    
    document.addEventListener('click', (e) => {
      if (!searchBoxDropdown || !suggestionsContainer) return;
      
      if (!searchBoxDropdown.contains(e.target) && 
          !suggestionsContainer.contains(e.target)) {
        Components.hideSearchSuggestions();
      }
    });
  }
  
  /**
   * 获取搜索建议
   */
  static async fetchSearchSuggestions(keyword) {
    try {
      const data = await API.getSearchSuggestions(keyword);
      Components.renderSearchSuggestions(data.suggestions);
    } catch (error) {
      console.error('获取搜索建议失败:', error);
      const container = document.getElementById('searchSuggestions');
      if (container) {
        container.innerHTML = `
          <div class="suggestion-empty">
            加载失败，请重试
          </div>
        `;
        container.style.display = 'block';
      }
    }
  }
  
  /**
   * 获取前N名股票
   */
  static async fetchTopStocks() {
    try {
      const data = await API.getTopStocks(8);
      Components.renderSearchSuggestions(data.suggestions);
    } catch (error) {
      console.error('获取前N名股票失败:', error);
    }
  }
  
  /**
   * 应用搜索筛选
   */
  static applySearchFilter(keyword) {
    this.state.searchKeyword = keyword;
    this.state.currentPage = 1;
    Components.hideSearchSuggestions();
    this.fetchData();
  }
  
  /**
   * 清空搜索筛选
   */
  static clearSearchFilter() {
    this.state.searchKeyword = '';
    this.state.currentPage = 1;
    this.fetchData();
  }
  
  /**
   * 绑定详情展开事件
   */
  static bindDetailEvents() {
    document.addEventListener('click', (e) => {
      const detailBtn = e.target.closest('.btn-detail');
      
      if (detailBtn) {
        e.preventDefault();
        const stockCode = detailBtn.dataset.stockCode;
        const detailRow = document.getElementById(`detail-${stockCode}`);
        const icon = detailBtn.querySelector('i');
        
        if (detailRow) {
          if (detailRow.style.display === 'none') {
            // 展开详情
            detailRow.style.display = 'table-row';
            if (icon) {
              icon.className = 'bi bi-chevron-down';
            }
          } else {
            // 收起详情
            detailRow.style.display = 'none';
            if (icon) {
              icon.className = 'bi bi-chevron-right';
            }
          }
        }
      }
    });
  }
  
  /**
   * 绑定双击板块名称筛选事件
   */
  static bindSectorDoubleClickEvents() {
    document.addEventListener('dblclick', (e) => {
      // 检查是否双击了板块名称单元格（表格第3列）
      const sectorCell = e.target.closest('.stock-table td:nth-child(3)');

      if (sectorCell) {
        const sectorName = sectorCell.textContent.trim();

        // 如果板块名称有效且不是"-"
        if (sectorName && sectorName !== '-') {
          console.log('双击了板块:', sectorName); // 调试日志
          this.applySectorFilter(sectorName);

          // 添加视觉反馈
          this.highlightSectorCell(sectorCell);
        }
      }
    });
  }
  
  /**
   * 应用板块筛选
   * @param {string} sectorName - 板块名称
   */
  static applySectorFilter(sectorName) {
    this.state.sectorFilter = sectorName;
    this.state.currentPage = 1;
    this.fetchData();
    
    // 显示筛选状态提示
    this.showSectorFilterToast(sectorName);
  }
  
  /**
   * 高亮显示被双击的板块单元格
   * @param {HTMLElement} cell - 板块单元格元素
   */
  static highlightSectorCell(cell) {
    // 移除之前的高亮
    document.querySelectorAll('.stock-table td.sector-highlight').forEach(td => {
      td.classList.remove('sector-highlight');
    });
    
    // 添加新的高亮
    cell.classList.add('sector-highlight');
    
    // 3秒后移除高亮
    setTimeout(() => {
      cell.classList.remove('sector-highlight');
    }, 3000);
  }
  
  /**
   * 显示板块筛选状态提示
   * @param {string} sectorName - 板块名称
   */
  static showSectorFilterToast(sectorName) {
    // 移除现有的提示
    const existingToast = document.querySelector('.sector-filter-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'sector-filter-toast';
    toast.innerHTML = `
      <div class="sector-filter-toast-content">
        <span class="sector-filter-toast-icon">📊</span>
        <div class="sector-filter-toast-text">
          <strong>已筛选板块：${sectorName}</strong>
          <span class="sector-filter-toast-message">点击"重置"按钮可清除筛选</span>
        </div>
        <button class="sector-filter-toast-close" onclick="this.parentElement.parentElement.remove()">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;

    document.body.appendChild(toast);

    console.log('Toast 已创建，准备显示'); // 调试日志

    // 显示提示
    setTimeout(() => {
      toast.classList.add('show');
      console.log('Toast 已显示'); // 调试日志
    }, 10);

    // 5秒后自动消失
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 5000);
  }

  /**
   * 绑定同步按钮事件
   */
  static bindSyncButton() {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        this.syncScreeningData();
      });
    }
    // 页面加载时获取同步状态
    this.loadSyncStatus();
  }

  /**
   * 同步选股数据
   */
  static async syncScreeningData() {
    if (this.state.isSyncing) {
      return;
    }

    const syncBtn = document.getElementById('syncBtn');
    const syncBtnText = document.getElementById('syncBtnText');
    const syncBtnIcon = syncBtn.querySelector('i');

    this.state.isSyncing = true;
    syncBtn.disabled = true;
    syncBtnIcon.classList.add('spin-icon');
    syncBtnText.textContent = '同步中...';

    try {
      const result = await API.triggerSync(false); // 使用增量同步

      if (result.success) {
        this.showSuccessToast(`同步成功！共同步 ${result.record_count || 0} 条记录`);
        // 重新加载数据
        await this.fetchData();
        // 更新同步状态
        await this.loadSyncStatus();
      } else {
        this.showErrorToast('同步失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      this.showErrorToast('同步失败：' + error.message);
      console.error('同步选股数据失败:', error);
    } finally {
      this.state.isSyncing = false;
      syncBtn.disabled = false;
      syncBtnIcon.classList.remove('spin-icon');
      syncBtnText.textContent = '同步数据';
    }
  }

  /**
   * 加载同步状态
   */
  static async loadSyncStatus() {
    try {
      const response = await API.getSyncStatus();
      // API返回格式: {sync: {stock: {...}, market_breadth: {...}}, scheduler: {...}}
      const status = response.sync || response;
      this.updateSyncStatusDisplay(status);
    } catch (error) {
      console.error('获取同步状态失败:', error);
      const timeEl = document.getElementById('lastUpdateTime');
      if (timeEl) {
        timeEl.innerHTML = '<i class="bi bi-clock"></i> 状态未知';
      }
    }
  }

  /**
   * 更新同步状态显示
   * @param {Object} status - 同步状态对象
   */
  static updateSyncStatusDisplay(status) {
    const timeEl = document.getElementById('lastUpdateTime');
    if (!timeEl) return;

    // API返回格式: {stock: {last_sync_time: 'ISO格式字符串', ...}}
    if (status && status.stock && status.stock.last_sync_time) {
      const lastSync = new Date(status.stock.last_sync_time);
      const now = new Date();
      const diffMs = now - lastSync;
      const diffMins = Math.floor(diffMs / 60000);

      let timeText;
      if (diffMins < 1) {
        timeText = '刚刚';
      } else if (diffMins < 60) {
        timeText = `${diffMins} 分钟前`;
      } else if (diffMins < 1440) {
        timeText = `${Math.floor(diffMins / 60)} 小时前`;
      } else {
        timeText = lastSync.toLocaleDateString('zh-CN');
      }

      timeEl.innerHTML = `<i class="bi bi-clock"></i> 更新时间：${timeText}`;
    } else {
      timeEl.innerHTML = '<i class="bi bi-clock"></i> 暂无数据';
    }
  }

  /**
   * 显示成功提示
   * @param {string} message - 成功消息
   */
  static showSuccessToast(message) {
    this.showToast(message, 'success');
  }

  /**
   * 显示错误提示
   * @param {string} message - 错误消息
   */
  static showErrorToast(message) {
    this.showToast(message, 'error');
  }

  /**
   * 显示提示消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 (success/error)
   */
  static showToast(message, type = 'success') {
    // 移除现有的 toast
    const existingToast = document.querySelector('.sync-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.className = `sync-toast sync-toast-${type}`;
    const icon = type === 'success' ? '✓' : '⚠';
    toast.innerHTML = `
      <div class="sync-toast-content">
        <span class="sync-toast-icon">${icon}</span>
        <div class="sync-toast-text">${message}</div>
        <button class="sync-toast-close" onclick="this.parentElement.parentElement.remove()">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;

    document.body.appendChild(toast);

    // 显示提示
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // 3秒后自动消失
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }
}

// 导出到全局作用域
window.Events = Events;

// 在 DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    Events.init();
    Events.fetchData();
  });
} else {
  Events.init();
  Events.fetchData();
}
