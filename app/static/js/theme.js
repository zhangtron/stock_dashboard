/**
 * 主题管理器
 * 支持双主题切换：Teal（默认）和 Red
 */
class ThemeManager {
  constructor() {
    this.themes = ['teal', 'red'];
    this.currentTheme = localStorage.getItem('theme') || 'teal';
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
   * 切换主题
   */
  toggle() {
    const currentIndex = this.themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % this.themes.length;
    const newTheme = this.themes[nextIndex];
    this.applyTheme(newTheme);
  }
  
  /**
   * 更新主题切换按钮图标
   */
  updateThemeToggleIcon() {
    const desktopToggle = document.getElementById('theme-toggle-desktop');
    const floatToggle = document.getElementById('theme-toggle-float');
    
    const iconClass = this.currentTheme === 'teal' ? 'bi-palette' : 'bi-palette-fill';
    
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
    const desktopToggle = document.getElementById('theme-toggle-desktop');
    const floatToggle = document.getElementById('theme-toggle-float');
    
    if (desktopToggle) {
      desktopToggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });
    }
    
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
