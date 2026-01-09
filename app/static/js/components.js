/**
 * 组件渲染模块
 * 处理页面组件的渲染逻辑
 */
class Components {
  /**
   * 获取得分等级类名
   * @param {number} score - 得分
   * @returns {string} 类名
   */
  static getScoreClass(score) {
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
  }
  
  /**
   * 获取推荐等级类名
   * @param {string} recommendation - 推荐等级
   * @returns {string} 类名
   */
  static getRecommendationClass(recommendation) {
    const classes = {
      'STRONG_BUY': 'recommendation-strong-buy',
      'BUY': 'recommendation-buy',
      'HOLD': 'recommendation-hold',
      'AVOID': 'recommendation-avoid'
    };
    return classes[recommendation] || '';
  }
  
  /**
   * 获取推荐等级文本
   * @param {string} recommendation - 推荐等级
   * @returns {string} 推荐文本
   */
  static getRecommendationText(recommendation) {
    const texts = {
      'STRONG_BUY': '强烈推荐',
      'BUY': '买入',
      'HOLD': '持有',
      'AVOID': '回避'
    };
    return texts[recommendation] || recommendation || '-';
  }
  
  /**
   * 渲染 Top 3 推荐股票卡片
   * @param {Array} top3Data - Top 3 数据
   */
  static renderTop3(top3Data) {
    for (let i = 0; i < 3; i++) {
      const container = document.getElementById(`top3-${i}`);
      if (!container) continue;
      
      if (top3Data && top3Data[i]) {
        const item = top3Data[i];
        const scoreClass = this.getScoreClass(item.overall_score);
        const recClass = this.getRecommendationClass(item.recommendation);
        const recText = this.getRecommendationText(item.recommendation);
        
        container.innerHTML = `
          <div class="card-code">${item.stock_code || '-'}</div>
          <div class="card-name">${item.stock_name || '-'}</div>
          <div class="card-price ${scoreClass}">${item.overall_score || '-'}</div>
          <div class="card-tag ${recClass}">${recText}</div>
        `;
      } else {
        container.innerHTML = '<div class="card-code text-muted">暂无数据</div>';
      }
    }
  }
  
  /**
   * 渲染数据表格
   * @param {Array} data - 数据数组
   */
  static renderTable(data) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    if (!data || data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center text-muted">
            暂无数据
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = data.map(item => `
      <tr>
        <td><strong>${item.stock_code || '-'}</strong></td>
        <td>${item.stock_name || '-'}</td>
        <td class="${this.getScoreClass(item.overall_score)}">${item.overall_score || '-'}</td>
        <td>${item.growth_score || '-'}</td>
        <td>${item.profitability_score || '-'}</td>
        <td>${item.solvency_score || '-'}</td>
        <td>${item.cashflow_score || '-'}</td>
        <td><span class="card-tag ${this.getRecommendationClass(item.recommendation)}">${this.getRecommendationText(item.recommendation)}</span></td>
        <td><small class="text-muted">${item.calc_time ? item.calc_time.slice(0, 10) : '-'}</small></td>
      </tr>
    `).join('');
  }
  
  /**
   * 渲染分页
   * @param {number} total - 总数据量
   * @param {number} page - 当前页码
   * @param {number} pageSize - 每页数量
   * @param {number} totalPages - 总页数
   */
  static renderPagination(total, page, pageSize, totalPages) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    if (totalPages === 0 || !totalPages) {
      pagination.innerHTML = '';
      return;
    }
    
    let html = '';
    
    // 上一页
    html += `
      <li class="page-item ${page === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${page - 1}">
          <i class="bi bi-chevron-left"></i>
        </a>
      </li>
    `;
    
    // 页码
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    if (startPage > 1) {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
      if (startPage > 2) {
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      html += `
        <li class="page-item ${i === page ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }
    
    // 下一页
    html += `
      <li class="page-item ${page === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${page + 1}">
          <i class="bi bi-chevron-right"></i>
        </a>
      </li>
    `;
    
    pagination.innerHTML = html;
  }
  
  /**
   * 更新排序图标
   * @param {string} sortBy - 排序字段
   * @param {string} sortOrder - 排序方向
   */
  static updateSortIcons(sortBy, sortOrder) {
    document.querySelectorAll('.stock-table th.sort-icon').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      const icon = th.querySelector('i');
      
      if (icon) {
        icon.className = 'bi bi-arrow-down-up';
        icon.style.opacity = '0.5';
      }
      
      if (th.dataset.sort === sortBy) {
        if (sortOrder === 'asc') {
          th.classList.add('sort-asc');
          if (icon) {
            icon.className = 'bi bi-arrow-up';
            icon.style.opacity = '1';
          }
        } else {
          th.classList.add('sort-desc');
          if (icon) {
            icon.className = 'bi bi-arrow-down';
            icon.style.opacity = '1';
          }
        }
      }
    });
  }
  
  /**
   * 更新数据总数
   * @param {number} total - 总数
   */
  static updateTotalCount(total) {
    const totalCount = document.getElementById('totalCount');
    if (totalCount) {
      totalCount.textContent = total || 0;
    }
  }
  
  /**
   * 显示加载状态
   * @param {boolean} loading - 是否加载中
   */
  static setLoading(loading) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    if (loading) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center">
            <div class="spinner"></div>
          </td>
        </tr>
      `;
    }
  }
  
  /**
   * 显示错误信息
   * @param {string} message - 错误信息
   */
  static showError(message) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted">
          <i class="bi bi-exclamation-circle text-danger"></i>
          ${message || '加载失败，请重试'}
        </td>
      </tr>
    `;
  }
  
  /**
   * 渲染搜索建议
   * @param {Array} suggestions - 建议列表
   */
  static renderSearchSuggestions(suggestions) {
    const container = document.getElementById('searchSuggestions');
    if (!container) return;
    
    if (!suggestions || suggestions.length === 0) {
      container.innerHTML = `
        <div class="suggestion-empty">
          未找到相关股票
        </div>
      `;
      container.style.display = 'block';
      return;
    }
    
    container.innerHTML = suggestions.map(item => `
      <div class="suggestion-item" data-code="${item.stock_code}" data-name="${item.stock_name}">
        <span class="suggestion-code">${item.stock_code}</span>
        <span class="suggestion-name">${item.stock_name}</span>
        <i class="bi bi-box-arrow-up-right suggestion-arrow"></i>
      </div>
    `).join('');
    
    container.style.display = 'block';
  }
  
  /**
   * 显示搜索建议加载状态
   */
  static showSearchSuggestionsLoading() {
    const container = document.getElementById('searchSuggestions');
    if (!container) return;
    
    container.innerHTML = `
      <div class="suggestion-loading">
        <i class="bi bi-arrow-repeat"></i>
        <span>加载中...</span>
      </div>
    `;
    container.style.display = 'block';
  }
  
  /**
   * 隐藏搜索建议
   */
  static hideSearchSuggestions() {
    const container = document.getElementById('searchSuggestions');
    if (container) {
      container.style.display = 'none';
    }
  }
  
  /**
   * 提取纯数字股票代码（去除后缀）
   * @param {string} stockCode - 完整股票代码（如 "600519.SH"）
   * @returns {string} 纯数字代码（如 "600519"）
   */
  static extractStockCode(stockCode) {
    const match = stockCode.match(/^(\d+)(?:\.\w+)?$/);
    return match ? match[1] : stockCode;
  }
  
  /**
   * 跳转到同花顺 F10
   * @param {string} stockCode - 股票代码
   */
  static openThsF10(stockCode) {
    const pureCode = this.extractStockCode(stockCode);
    const url = `http://basic.10jqka.com.cn/${pureCode}/finance.html`;
    window.open(url, '_blank');
  }
}

// 导出到全局作用域
window.Components = Components;

// 监听主题切换事件，更新颜色
window.addEventListener('themechange', (event) => {
  console.log('主题切换，更新组件颜色:', event.detail.theme);
  
  // 更新卡片价格颜色
  const cardPrices = document.querySelectorAll('.card-price');
  cardPrices.forEach(price => {
    price.style.color = `var(--primary-color)`;
  });
  
  // 更新卡片标签颜色
  const cardTags = document.querySelectorAll('.card-tag');
  cardTags.forEach(tag => {
    tag.style.background = `var(--primary-light)`;
    tag.style.color = `var(--primary-color)`;
  });
  
  // 更新得分颜色
  const scoreElements = document.querySelectorAll('.score-high, .score-medium, .score-low');
  scoreElements.forEach(el => {
    const scoreValue = parseFloat(el.textContent);
    if (!isNaN(scoreValue)) {
      el.classList.remove('score-high', 'score-medium', 'score-low');
      el.classList.add(Components.getScoreClass(scoreValue));
    }
  });
  
  // 更新推荐标签颜色
  const recommendationTags = document.querySelectorAll('[class*="recommendation-"]');
  recommendationTags.forEach(tag => {
    tag.style.background = `var(--primary-light)`;
    tag.style.color = `var(--primary-color)`;
  });
  
  // 更新表头图标透明度
  const headerIcons = document.querySelectorAll('.stock-table th i');
  headerIcons.forEach(icon => {
    icon.style.opacity = '0.5';
  });
});
