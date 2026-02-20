/**
 * 市场宽度分析模块
 */
class MarketBreadth {
    constructor() {
        this.heatmapChart = null;
        this.trendChart = null;
        this.currentData = null;
        this.industries = [];
        this.isSyncing = false;
        this.init();
    }

    async init() {
        this.checkECharts();
        this.initFilters();
        this.initSyncButton();
        await this.loadIndustries();
        await this.loadData();
        this.renderStatistics();
        this.renderTrendChart();
        this.renderHeatmap();
    }

    checkECharts() {
        if (typeof echarts === 'undefined') {
            console.error('ECharts library not loaded');
            return;
        }
        this.echartsLoaded = true;
    }

    initFilters() {
        const filterForm = document.getElementById('filterForm');
        const resetBtn = document.getElementById('resetBtn');
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        // 如果筛选器被隐藏，直接返回
        if (!filterForm || !resetBtn || !startDateInput || !endDateInput) {
            return;
        }

        // 设置默认日期范围（最近30天）
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        endDateInput.valueAsDate = today;
        startDateInput.valueAsDate = thirtyDaysAgo;

        // 表单提交
        filterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.applyFilters();
        });

        // 重置按钮
        resetBtn.addEventListener('click', () => {
            this.resetFilters();
        });
    }

    initSyncButton() {
        const syncBtn = document.getElementById('syncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.syncMarketBreadthData();
            });
        }
    }

    async syncMarketBreadthData() {
        if (this.isSyncing) {
            return;
        }

        const syncBtn = document.getElementById('syncBtn');
        const syncBtnText = document.getElementById('syncBtnText');
        const syncBtnIcon = syncBtn.querySelector('i');

        this.isSyncing = true;
        syncBtn.disabled = true;
        syncBtnIcon.classList.add('spin-icon');
        syncBtnText.textContent = '同步中...';

        try {
            const response = await API.fetch('/api/market-breadth/sync', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showSuccess(`同步成功！共同步 ${result.record_count} 条记录`);
                // 重新加载数据
                await this.loadData();
                this.renderStatistics();
                this.renderTrendChart();
                this.renderHeatmap();
            } else {
                this.showError('同步失败：' + (result.error || '未知错误'));
            }
        } catch (error) {
            this.showError('同步失败：' + error.message);
            console.error('同步市场宽度数据失败:', error);
        } finally {
            this.isSyncing = false;
            syncBtn.disabled = false;
            syncBtnIcon.classList.remove('spin-icon');
            syncBtnText.textContent = '同步数据';
        }
    }

    showSuccess(message) {
        const toast = document.getElementById('errorToast');
        const errorEl = document.getElementById('errorMessage');

        if (toast && errorEl) {
            errorEl.textContent = message;
            toast.className = 'toast success-toast';
            toast.style.display = 'flex';

            setTimeout(() => {
                toast.style.display = 'none';
                toast.className = 'toast error-toast';
            }, 3000);
        }
    }

    async loadIndustries() {
        try {
            const response = await API.fetch('/api/market-breadth/industries');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.industries = data.industries || [];

            // 填充行业选择器
            const industrySelect = document.getElementById('industrySelect');
            industrySelect.innerHTML = '<option value="">全部行业</option>';
            this.industries.forEach(industry => {
                const option = document.createElement('option');
                option.value = industry;
                option.textContent = industry;
                industrySelect.appendChild(option);
            });
        } catch (error) {
            console.error('加载行业列表失败:', error);
        }
    }

    async applyFilters() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const industrySelect = document.getElementById('industrySelect');
        const selectedIndustries = Array.from(industrySelect.selectedOptions)
            .map(opt => opt.value)
            .filter(v => v !== '');

        await this.loadData(startDate, endDate, selectedIndustries);
        this.renderStatistics();
        this.renderHeatmap();
    }

    resetFilters() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        document.getElementById('startDate').valueAsDate = thirtyDaysAgo;
        document.getElementById('endDate').valueAsDate = today;
        document.getElementById('industrySelect').value = '';

        this.applyFilters();
    }

    async loadData(startDate = null, endDate = null, industries = null) {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (industries && industries.length > 0) params.append('industries', industries.join(','));

            const response = await API.fetch(`/api/market-breadth?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error || data.message);
            }

            this.currentData = data;
            this.updateLastUpdateTime(data.last_update);
        } catch (error) {
            this.showError('加载市场宽度数据失败：' + error.message);
            console.error(error);
        }
    }

    updateLastUpdateTime(lastUpdate) {
        const timeEl = document.getElementById('lastUpdateTime');
        if (timeEl && lastUpdate) {
            const date = new Date(lastUpdate);
            timeEl.innerHTML = `<i class="bi bi-clock"></i> 更新时间：${date.toLocaleString('zh-CN')}`;
        }
    }

    renderStatistics() {
        if (!this.currentData || !this.currentData.statistics) {
            return;
        }

        const stats = this.currentData.statistics;

        // 日期范围
        const dateRangeCard = document.getElementById('dateRangeCard');
        if (dateRangeCard && stats.date_range) {
            dateRangeCard.innerHTML = `<h4 class="card-title">${stats.date_range}</h4><p class="card-text small text-muted">数据日期范围</p>`;
        }

        // 行业数量
        const industryCountCard = document.getElementById('industryCountCard');
        if (industryCountCard && stats.industry_count !== undefined) {
            industryCountCard.innerHTML = `<h4 class="card-title">${stats.industry_count}</h4><p class="card-text small text-muted">行业数量</p>`;
        }

        // 交易日数
        const tradingDaysCard = document.getElementById('tradingDaysCard');
        if (tradingDaysCard && stats.trading_days !== undefined) {
            tradingDaysCard.innerHTML = `<h4 class="card-title">${stats.trading_days}</h4><p class="card-text small text-muted">交易日数</p>`;
        }

        // 平均比例
        const avgValueCard = document.getElementById('avgValueCard');
        if (avgValueCard && stats.avg_value !== undefined) {
            const percentage = stats.avg_value.toFixed(2);
            avgValueCard.innerHTML = `<h4 class="card-title">${percentage}%</h4><p class="card-text small text-muted">平均BIAS>0比例</p>`;
        }
    }

    renderTrendChart() {
        if (!this.echartsLoaded || !this.currentData) {
            return;
        }

        const el = document.getElementById('trendChart');
        if (!el) return;

        if (this.trendChart) {
            this.trendChart.dispose();
        }

        this.trendChart = echarts.init(el);

        const { dates, columns, data } = this.currentData;
        const sumIndex = columns.indexOf('sum');

        // 提取sum数据
        const sumValues = data.map(row => row[sumIndex]);

        // 计算移动平均线（5日）
        const ma5 = [];
        for (let i = 0; i < sumValues.length; i++) {
            if (i < 4) {
                ma5.push(null);
            } else {
                const sum = sumValues.slice(i - 4, i + 1).reduce((a, b) => a + b, 0);
                ma5.push(Math.round(sum / 5));
            }
        }

        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                formatter: (params) => {
                    const date = params[0].axisValue;
                    let result = `<strong>${date}</strong><br/>`;
                    params.forEach(param => {
                        result += `${param.marker}${param.seriesName}: <strong>${param.value}</strong><br/>`;
                    });
                    return result;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: dates,
                axisLabel: {
                    rotate: 45,
                    fontSize: 10
                }
            },
            yAxis: {
                type: 'value',
                name: '上涨家数总和'
            },
            dataZoom: [
                {
                    type: 'slider',
                    show: true,
                    start: 0,
                    end: 100,
                    bottom: '10%'
                },
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                }
            ],
            series: [
                {
                    name: 'sum值',
                    type: 'line',
                    data: sumValues,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        width: 2,
                        color: '#f5465f'
                    },
                    itemStyle: {
                        color: '#f5465f'
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(245, 70, 95, 0.3)' },
                                { offset: 1, color: 'rgba(245, 70, 95, 0.05)' }
                            ]
                        }
                    }
                },
                {
                    name: '5日均线',
                    type: 'line',
                    data: ma5,
                    smooth: true,
                    symbol: 'none',
                    lineStyle: {
                        width: 2,
                        type: 'dashed',
                        color: '#11aac3'
                    },
                    itemStyle: {
                        color: '#11aac3'
                    }
                }
            ]
        };

        this.trendChart.setOption(option);
    }

    renderHeatmap() {
        if (!this.echartsLoaded || !this.currentData) {
            return;
        }

        const el = document.getElementById('heatmapChart');
        if (!el) return;

        if (this.heatmapChart) {
            this.heatmapChart.dispose();
        }

        this.heatmapChart = echarts.init(el);

        const { dates, columns, data } = this.currentData;
        const industryCount = columns.length - 2;  // 排除 index_all 和 sum
        const industryColumns = columns.slice(0, -2);
        const specialColumns = columns.slice(-2);  // ['index_all', 'sum']

        // 交换x轴和y轴：行业在顶部(x轴)，日期在左侧(y轴)
        // 数据格式: [x, y, value] 其中 x=列索引, y=日期索引（ECharts heatmap格式）

        // 构建行业数据
        const industryData = [];
        for (let j = 0; j < industryCount; j++) {
            for (let i = 0; i < dates.length; i++) {
                const value = data[i][j];
                if (value !== null && value !== undefined) {
                    industryData.push([j, i, value]);
                }
            }
        }

        // 构建 index_all 数据
        const indexAllData = [];
        for (let i = 0; i < dates.length; i++) {
            const value = data[i][industryCount];
            if (value !== null && value !== undefined) {
                indexAllData.push([0, i, value]);
            }
        }

        // 构建 sum 数据
        const sumData = [];
        for (let i = 0; i < dates.length; i++) {
            const value = data[i][industryCount + 1];
            if (value !== null && value !== undefined) {
                sumData.push([0, i, value]);
            }
        }

        // 计算颜色范围
        const minValue = 0;
        const maxValue = 100;

        const option = {
            // 添加滚动和缩放功能
            dataZoom: [
                // 横向滚动（行业）
                {
                    type: 'slider',
                    show: true,
                    xAxisIndex: [0],  // 只控制第一个xAxis（行业数据）
                    start: 0,
                    end: 40,  // 初始显示前40%的行业（约37-38个）
                    bottom: '2%',
                    height: 20,
                    handleSize: '80%',
                    textStyle: {
                        fontSize: 10
                    },
                    zoomLock: false,  // 允许拖动
                    brushSelect: false  // 禁用框选
                },
                // 纵向缩放（日期）- 同时控制所有三个 yAxis
                {
                    type: 'slider',
                    show: true,
                    yAxisIndex: [0, 1, 2],  // 控制所有三个 yAxis（行业、index_all、sum）
                    start: 0,
                    end: 100,  // 初始显示所有日期
                    right: '3%',
                    width: 20,
                    height: '70%',
                    handleSize: '80%',
                    textStyle: {
                        fontSize: 10
                    },
                    zoomLock: false,
                    orient: 'vertical'
                },
                // 框选缩放（支持鼠标交互）- 同时控制所有坐标轴
                {
                    type: 'inside',
                    xAxisIndex: [0],
                    yAxisIndex: [0, 1, 2],  // 控制所有 yAxis
                    zoomOnMouseWheel: true,  // 支持鼠标滚轮缩放
                    moveOnMouseMove: true,    // 支持鼠标拖动平移
                    moveOnMouseWheel: false
                }
            ],
            tooltip: {
                position: 'top',
                formatter: (params) => {
                    // 数据格式: [x, y, value] 其中 x=列索引, y=日期索引
                    const dateIndex = params.value[1];
                    const date = dates[dateIndex];

                    // 判断是哪个系列
                    if (params.seriesName === '行业数据') {
                        const colIndex = params.value[0];
                        const column = industryColumns[colIndex];
                        const value = params.value[2];
                        return `${date}<br/><strong>${column}</strong><br/>BIAS>0比例: <strong>${value}%</strong>`;
                    } else if (params.seriesName === '全市场汇总') {
                        const value = params.value[2];
                        return `${date}<br/><strong>index_all (全市场汇总)</strong><br/>BIAS>0比例: <strong>${value}%</strong>`;
                    } else if (params.seriesName === '行业总和') {
                        const value = params.value[2];
                        return `${date}<br/><strong>sum (各行业总和)</strong><br/>汇总值: <strong>${value}</strong>`;
                    }
                    return '';
                }
            },
            grid: [
                // 行业数据 grid (占主要区域)
                {
                    height: '65%',     // 从 70% 调整到 65%（为底部dataZoom留空间）
                    top: '12%',        // 从 10% 调整到 12%（为顶部标签留空间）
                    left: '7%',        // 从 5% 调整到 7%（为右侧dataZoom留空间）
                    right: '30%',      // 从 25% 调整到 30%（给 index_all 和 sum 更多空间）
                    containLabel: false
                },
                // index_all grid
                {
                    height: '65%',
                    top: '12%',
                    left: '73%',
                    width: '10%',   // 固定宽度
                    containLabel: false
                },
                // sum grid
                {
                    height: '65%',
                    top: '12%',
                    left: '85%',
                    width: '10%',   // 固定宽度
                    containLabel: false
                }
            ],
            xAxis: [
                // 行业数据 x轴（顶部）
                {
                    type: 'category',
                    data: industryColumns,
                    position: 'top',
                    splitArea: {
                        show: true
                    },
                    axisLabel: {
                        rotate: 45,
                        interval: 'auto',  // 自动计算显示间隔，避免重叠
                        fontSize: 10
                    },
                    gridIndex: 0
                },
                // index_all x轴
                {
                    type: 'category',
                    data: ['index_all'],
                    position: 'top',
                    splitArea: {
                        show: true
                    },
                    axisLabel: {
                        fontSize: 10,
                        formatter: () => '📊\n全市场'
                    },
                    gridIndex: 1
                },
                // sum x轴
                {
                    type: 'category',
                    data: ['sum'],
                    position: 'top',
                    splitArea: {
                        show: true
                    },
                    axisLabel: {
                        fontSize: 10,
                        formatter: () => '📈\n总和'
                    },
                    gridIndex: 2
                }
            ],
            yAxis: [
                // 行业数据 y轴
                {
                    type: 'category',
                    data: dates,
                    splitArea: {
                        show: true
                    },
                    axisLabel: {
                        fontSize: 9
                    },
                    gridIndex: 0
                },
                // index_all y轴
                {
                    type: 'category',
                    data: dates,
                    splitArea: {
                        show: true
                    },
                    axisLabel: {
                        show: false
                    },
                    gridIndex: 1
                },
                // sum y轴
                {
                    type: 'category',
                    data: dates,
                    splitArea: {
                        show: true
                    },
                    axisLabel: {
                        show: false
                    },
                    gridIndex: 2
                }
            ],
            visualMap: [
                // 行业数据和全市场汇总的颜色映射（0-100）
                {
                    min: 0,
                    max: 100,
                    calculable: true,
                    orient: 'horizontal',
                    left: 'center',
                    bottom: '6%',
                    inRange: {
                        // 青绿到粉红渐变
                        color: [
                            '#11aac3',  // 0 - 青绿色
                            '#07bdae',  // 20 - 青色
                            '#34ebe0',  // 40 - 亮青色
                            '#d0ffae',  // 60 - 浅黄绿色
                            '#f5465f',  // 80 - 粉红色
                            '#a53354'   // 100 - 深粉红色
                        ]
                    },
                    text: ['高 (100)', '低 (0)'],
                    seriesIndex: [0, 1]  // 控制行业数据和全市场汇总
                },
                // 行业总和的颜色映射（0-5000），使用相同的颜色渐变
                {
                    min: 0,
                    max: 5000,
                    calculable: false,
                    orient: 'horizontal',
                    left: 'center',
                    bottom: '2%',
                    inRange: {
                        // 使用相同的青绿到粉红渐变
                        color: [
                            '#11aac3',  // 0 - 青绿色
                            '#07bdae',  // 1000 - 青色
                            '#34ebe0',  // 2000 - 亮青色
                            '#d0ffae',  // 3000 - 浅黄绿色
                            '#f5465f',  // 4000 - 粉红色
                            '#a53354'   // 5000 - 深粉红色
                        ]
                    },
                    text: ['多 (5000)', '少 (0)'],
                    seriesIndex: [2],  // 控制行业总和
                    show: false  // 隐藏控制器，避免混淆
                }
            ],
            series: [
                {
                    name: '行业数据',
                    type: 'heatmap',
                    data: industryData,
                    xAxisIndex: 0,
                    yAxisIndex: 0,
                    label: {
                        show: false
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                },
                {
                    name: '全市场汇总',
                    type: 'heatmap',
                    data: indexAllData,
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    label: {
                        show: true,
                        fontSize: 10,
                        formatter: (params) => params.value[2] + '%'
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                },
                {
                    name: '行业总和',
                    type: 'heatmap',
                    data: sumData,
                    xAxisIndex: 2,
                    yAxisIndex: 2,
                    label: {
                        show: true,
                        fontSize: 10,
                        formatter: (params) => params.value[2]
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }
            ]
        };

        this.heatmapChart.setOption(option);
    }

    showError(message) {
        const toast = document.getElementById('errorToast');
        const errorEl = document.getElementById('errorMessage');

        if (toast && errorEl) {
            errorEl.textContent = message;
            toast.style.display = 'flex';

            setTimeout(() => {
                toast.style.display = 'none';
            }, 5000);
        }
    }

    resizeChart() {
        if (this.heatmapChart) {
            this.heatmapChart.resize();
        }
        if (this.trendChart) {
            this.trendChart.resize();
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (typeof echarts === 'undefined') {
        console.error('ECharts library not loaded');
    } else {
        window.marketBreadth = new MarketBreadth();
    }
});

window.addEventListener('resize', () => {
    if (window.marketBreadth) {
        window.marketBreadth.resizeChart();
    }
});
