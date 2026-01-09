/**
 * 视差滚动效果
 * 让背景圆形色块在滚动时产生不同的移动速度
 */
class ParallaxEffect {
  constructor() {
    this.shapes = [];
    this.lastScrollY = 0;
    this.init();
  }
  
  /**
   * 初始化视差效果
   */
  init() {
    // 获取所有背景圆形色块
    const shapeElements = document.querySelectorAll('.bg-shape');
    
    // 为每个圆形设置不同的视差速度
    this.shapes = Array.from(shapeElements).map((shape, index) => {
      const speed = (index + 1) * 0.1; // 速度随索引增加
      return {
        element: shape,
        speed: speed,
        initialTop: parseFloat(shape.style.top) || 0,
        initialLeft: parseFloat(shape.style.left) || 0,
        initialBottom: parseFloat(shape.style.bottom) || 0,
        initialRight: parseFloat(shape.style.right) || 0,
      };
    });
    
    // 监听滚动事件
    window.addEventListener('scroll', this.onScroll.bind(this));
    
    // 初始化一次位置
    this.updateShapes(0);
  }
  
  /**
   * 滚动事件处理
   */
  onScroll() {
    const scrollY = window.scrollY;
    const deltaScroll = scrollY - this.lastScrollY;
    
    // 使用 requestAnimationFrame 优化性能
    requestAnimationFrame(() => {
      this.updateShapes(deltaScroll);
    });
    
    this.lastScrollY = scrollY;
  }
  
  /**
   * 更新背景圆形的位置
   * @param {number} scrollDelta - 滚动距离增量
   */
  updateShapes(scrollDelta) {
    const scrollY = window.scrollY;
    
    this.shapes.forEach(shape => {
      const translateY = scrollY * shape.speed * -1;
      const translateX = scrollY * shape.speed * 0.5;
      
      shape.element.style.transform = `translate(${translateX}px, ${translateY}px)`;
    });
  }
  
  /**
   * 销毁视差效果
   */
  destroy() {
    window.removeEventListener('scroll', this.onScroll.bind(this));
    this.shapes = [];
  }
}

// 创建全局视差效果实例
const parallaxEffect = new ParallaxEffect();

// 导出到全局作用域
window.ParallaxEffect = ParallaxEffect;
window.parallaxEffect = parallaxEffect;
