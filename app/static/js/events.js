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
  };
  
  /**
   * 初始化所有事件监听器
   */
  static init() {
    this.bindHamburgerMenu();
    this.bindSortEvents();
    this.bindFilterEvents();
    this.bindPaginationEvents();
    this.bindMobileNavigation();
    this.bindSearchEvents();
  }
  
  /**
   * 绑定汉堡菜单事件
   */
  static bindHamburgerMenu() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    
    if (hamburger && sidebar) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        sidebar.classList.toggle('active');
      });
      
      // 点击外部关闭侧边栏
      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
          hamburger.classList.remove('active');
          sidebar.classList.remove('active');
        }
      });
    }
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
   * 绑定移动端导航事件
   */
  static bindMobileNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // 移除所有激活状态
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // 添加当前激活状态
        item.classList.add('active');
        
        // 在移动端，点击导航后关闭侧边栏
        if (window.innerWidth < 768) {
          const hamburger = document.getElementById('hamburger');
          const sidebar = document.getElementById('sidebar');
          
          if (hamburger && sidebar) {
            hamburger.classList.remove('active');
            sidebar.classList.remove('active');
          }
        }
      });
    });
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
    
    const minScore = document.getElementById('minScore')?.value;
    if (minScore) params.min_overall_score = minScore;
    
    const maxScore = document.getElementById('maxScore')?.value;
    if (maxScore) params.max_overall_score = maxScore;
    
    const recommendation = document.getElementById('recommendation')?.value;
    if (recommendation) params.recommendation = recommendation;
    
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
    const recommendation = document.getElementById('recommendation');
    const headerSearch = document.getElementById('headerSearch');
    const searchClear = document.getElementById('searchClear');
    
    if (stockCode) stockCode.value = '';
    if (stockName) stockName.value = '';
    if (minScore) minScore.value = '';
    if (maxScore) maxScore.value = '';
    if (recommendation) recommendation.value = '';
    
    if (headerSearch) headerSearch.value = '';
    if (searchClear) searchClear.style.display = 'none';
    
    this.state.searchKeyword = '';
    this.state.currentPage = 1;
    this.fetchData();
  }
  
  /**
   * 绑定搜索事件
   */
  static bindSearchEvents() {
    const searchBox = document.querySelector('.search-box');
    const searchInput = document.getElementById('headerSearch');
    const searchClear = document.getElementById('searchClear');
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (!searchBox || !searchInput) return;
    
    searchBox.addEventListener('click', async () => {
      if (!searchInput.value.trim()) {
        await this.fetchTopStocks();
      }
    });
    
    if (suggestionsContainer) {
      suggestionsContainer.addEventListener('mouseleave', (e) => {
        Components.hideSearchSuggestions();
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
      if (!searchBox || !suggestionsContainer) return;
      
      if (!searchBox.contains(e.target) && 
          !suggestionsContainer.contains(e.target)) {
        Components.hideSearchSuggestions();
      }
    });
    
    document.addEventListener('click', (e) => {
      const suggestionItem = e.target.closest('.suggestion-item');
      
      if (suggestionItem) {
        const stockCode = suggestionItem.dataset.code;
        const stockName = suggestionItem.dataset.name;
        
        Components.openThsF10(stockCode);
        
        searchInput.value = stockCode;
        if (searchClear) {
          searchClear.style.display = 'flex';
        }
        Components.hideSearchSuggestions();
        this.applySearchFilter(stockCode);
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
