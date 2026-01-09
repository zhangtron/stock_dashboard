/**
 * 主题管理器
 * 支持三主题循环切换：Teal（默认）→ Red → Dark → Teal
 */
class ThemeManager {
  constructor() {
    this.themes = ['teal', 'red', 'dark'];
    this.currentTheme = localStorage.getItem('theme') || 'teal';
    this.themeIcons = {
      teal: 'bi-palette',
      red: 'bi-palette-fill',
      dark: 'bi-moon-fill'
    };
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
    const floatToggle = document.getElementById('theme-toggle-float');

    [desktopToggle, floatToggle].forEach(toggle => {
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
    const floatToggle = document.getElementById('theme-toggle-float');

    const iconClass = this.themeIcons[this.currentTheme] || 'bi-palette';

    if (desktopToggle) {
      desktopToggle.innerHTML = `<i class="bi ${iconClass}"></i>`;
    }

    if (floatToggle) {
      floatToggle.innerHTML = `<i class="bi ${iconClass}"></i>`;
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    const desktopContainer = document.querySelector('.theme-toggle-container');
    const desktopToggle = document.getElementById('theme-toggle-desktop');
    const floatToggle = document.getElementById('theme-toggle-float');

    // 桌面端主题切换容器 - 循环切换主题
    if (desktopContainer) {
      desktopContainer.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });
    }

    // 浮动主题切换按钮 - 循环切换主题
    if (floatToggle) {
      floatToggle.addEventListener('click', (e) => {
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

// 创建全局主题管理器实例
const themeManager = new ThemeManager();

// 导出到全局作用域，供其他模块使用
window.themeManager = themeManager;
