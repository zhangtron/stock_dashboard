/**
 * 主题管理器
 * 支持10个主题自由切换
 */
class ThemeManager {
  constructor() {
    // 所有可用主题
    this.themes = [
      'teal',           // 默认青色主题
      'red',            // 红色主题
      'dark',           // 深色主题
      'purple-dream',   // 紫色梦幻（毛玻璃）
      'ocean-blue',     // 海洋蓝（毛玻璃）
      'sunset-orange',  // 日落橙（纯色）
      'neon',           // 霓虹炫彩（纯色）
      'dark-elegant',   // 深色优雅（纯色）
      'fresh-green',    // 清新绿色（毛玻璃）
      'passion-red'     // 热情红色（纯色）
    ];
    
    // 主题显示名称
    this.themeNames = {
      'teal': '青色主题',
      'red': '红色主题',
      'dark': '深色主题',
      'purple-dream': '紫色梦幻',
      'ocean-blue': '海洋蓝',
      'sunset-orange': '日落橙',
      'neon': '霓虹炫彩',
      'dark-elegant': '深色优雅',
      'fresh-green': '清新绿色',
      'passion-red': '热情红色'
    };
    
    // 主题图标
    this.themeIcons = {
      teal: 'bi-palette',
      red: 'bi-palette-fill',
      dark: 'bi-moon-fill',
      'purple-dream': 'bi-flower1',
      'ocean-blue': 'bi-droplet',
      'sunset-orange': 'bi-sun',
      'neon': 'bi-stars',
      'dark-elegant': 'bi-moon-stars',
      'fresh-green': 'bi-tree',
      'passion-red': 'bi-heart'
    };
    
    this.currentTheme = localStorage.getItem('theme') || 'dark';
    this.init();
  }

  /**
   * 初始化主题管理器
   */
  init() {
    this.applyTheme(this.currentTheme);
    this.bindEvents();
    this.updateThemeToggleIcon();
  }

  /**
   * 应用主题
   * @param {string} theme - 主题名称
   */
  applyTheme(theme) {
    if (!this.themes.includes(theme)) {
      console.warn(`未知主题: ${theme}，使用默认主题`);
      theme = 'teal';
    }

    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    this.currentTheme = theme;
    this.updateThemeToggleIcon();
    this.updateThemeDropdown();

    // 触发主题切换事件
    const event = new CustomEvent('themechange', { detail: { theme } });
    window.dispatchEvent(event);

    console.log(`主题已切换为: ${theme}`);
  }

  /**
   * 切换到下一个主题
   */
  toggle() {
    const currentIndex = this.themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % this.themes.length;
    const newTheme = this.themes[nextIndex];
    this.applyTheme(newTheme);

    // 触发旋转动画
    this.triggerRotateAnimation();
  }

  /**
   * 触发旋转动画
   */
  triggerRotateAnimation() {
    const desktopToggle = document.getElementById('theme-toggle-desktop');
    const mobileToggle = document.getElementById('theme-toggle-mobile');

    [desktopToggle, mobileToggle].forEach(toggle => {
      if (toggle) {
        // 移除动画类（如果存在）
        toggle.classList.remove('rotating');

        // 强制重绘
        void toggle.offsetWidth;

        // 添加动画类
        toggle.classList.add('rotating');

        // 动画结束后移除类
        setTimeout(() => {
          toggle.classList.remove('rotating');
        }, 300);
      }
    });
  }

  /**
   * 更新主题切换按钮图标
   */
  updateThemeToggleIcon() {
    const desktopToggle = document.getElementById('theme-toggle-desktop');
    const mobileToggle = document.getElementById('theme-toggle-mobile');

    const iconClass = this.themeIcons[this.currentTheme] || 'bi-palette';

    if (desktopToggle) {
      desktopToggle.innerHTML = `<i class="bi ${iconClass}"></i>`;
    }

    if (mobileToggle) {
      mobileToggle.innerHTML = `<i class="bi ${iconClass}"></i>`;
    }
  }

  /**
   * 更新主题下拉菜单中的活动项
   */
  updateThemeDropdown() {
    const dropdown = document.getElementById('theme-dropdown');
    if (!dropdown) return;

    // 更新所有下拉菜单项的活动状态
    dropdown.querySelectorAll('.theme-dropdown-item').forEach(item => {
      const theme = item.getAttribute('data-theme');
      if (theme === this.currentTheme) {
        item.classList.add('active');
        // 确保有勾选图标
        if (!item.querySelector('.bi-check')) {
          item.innerHTML += '<i class="bi bi-check"></i>';
        }
      } else {
        item.classList.remove('active');
        // 移除勾选图标
        const checkIcon = item.querySelector('.bi-check');
        if (checkIcon) {
          checkIcon.remove();
        }
      }
    });
  }

  /**
   * 创建主题选择下拉菜单
   */
  createThemeDropdown() {
    // 检查是否已存在下拉菜单
    if (document.getElementById('theme-dropdown')) {
      return;
    }

    const desktopContainer = document.querySelector('.theme-toggle-container');
    if (!desktopContainer) return;

    // 创建下拉菜单容器
    const dropdown = document.createElement('div');
    dropdown.id = 'theme-dropdown';
    dropdown.className = 'theme-dropdown';
    
    // 创建下拉菜单内容
    let dropdownHTML = '<div class="theme-dropdown-header">选择主题</div>';
    dropdownHTML += '<div class="theme-dropdown-list">';
    
    this.themes.forEach(theme => {
      const isActive = theme === this.currentTheme ? 'active' : '';
      dropdownHTML += `
        <div class="theme-dropdown-item ${isActive}" data-theme="${theme}">
          <i class="bi ${this.themeIcons[theme]}"></i>
          <span>${this.themeNames[theme]}</span>
          ${isActive ? '<i class="bi bi-check"></i>' : ''}
        </div>
      `;
    });
    
    dropdownHTML += '</div>';
    dropdown.innerHTML = dropdownHTML;
    
    // 插入到主题切换容器中
    desktopContainer.appendChild(dropdown);
    
    // 绑定下拉菜单项点击事件
    dropdown.querySelectorAll('.theme-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const theme = item.getAttribute('data-theme');
        this.applyTheme(theme);
        this.closeThemeDropdown();
      });
    });
    
    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', (e) => {
      if (!desktopContainer.contains(e.target)) {
        this.closeThemeDropdown();
      }
    });
  }

  /**
   * 打开主题选择下拉菜单
   */
  openThemeDropdown() {
    this.createThemeDropdown();
    const dropdown = document.getElementById('theme-dropdown');
    if (dropdown) {
      dropdown.classList.add('open');
    }
  }

  /**
   * 关闭主题选择下拉菜单
   */
  closeThemeDropdown() {
    const dropdown = document.getElementById('theme-dropdown');
    if (dropdown) {
      dropdown.classList.remove('open');
    }
  }

  /**
   * 切换主题选择下拉菜单
   */
  toggleThemeDropdown() {
    const dropdown = document.getElementById('theme-dropdown');
    if (dropdown && dropdown.classList.contains('open')) {
      this.closeThemeDropdown();
    } else {
      this.openThemeDropdown();
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    const desktopContainer = document.querySelector('.theme-toggle-container');
    const desktopToggle = document.getElementById('theme-toggle-desktop');
    const mobileToggle = document.getElementById('theme-toggle-mobile');

    // 桌面端主题切换容器 - 点击打开下拉菜单
    if (desktopContainer) {
      desktopContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleThemeDropdown();
      });
    }

    // 移动端主题切换按钮 - 保持循环切换（为了移动端简洁）
    if (mobileToggle) {
      mobileToggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });
    }

    // 监听系统主题变化
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.addEventListener('change', (e) => {
        console.log('系统主题变化:', e.matches ? 'dark' : 'light');
      });
    }
  }

  /**
   * 获取当前主题
   * @returns {string} 当前主题名称
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * 设置指定主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    this.applyTheme(theme);
  }
}

// 等待 DOM 加载完成后创建主题管理器实例
let themeManager = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    themeManager = new ThemeManager();
    window.themeManager = themeManager;
  });
} else {
  themeManager = new ThemeManager();
  window.themeManager = themeManager;
}
