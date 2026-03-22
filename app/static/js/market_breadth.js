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

    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'dark';
    }

    getChartThemeConfig() {
        const theme = this.getCurrentTheme();
        const rootStyle = getComputedStyle(document.documentElement);
        const primaryColor = rootStyle.getPropertyValue('--primary-color').trim() || '#00BFA5';
        const primaryColorRgb = rootStyle.getPropertyValue('--primary-color-rgb').trim() || '0, 191, 165';
        const textPrimary = rootStyle.getPropertyValue('--text-primary').trim() || '#0f172a';
        const textSecondary = rootStyle.getPropertyValue('--text-secondary').trim() || 'rgba(15, 23, 42, 0.68)';
        const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'rgba(148, 163, 184, 0.18)';
        const isDarkTheme = ['dark', 'dark-elegant', 'neon'].includes(theme);

        const paletteMap = {
            teal: {
                heatmap: ['#effcf8', '#cbf4ea', '#95e6d4', '#5cd4c1', '#1fb9aa', '#0d9488', '#0f766e'],
                trendMain: '#14b8a6',
                trendAccent: '#0f766e'
            },
            red: {
                heatmap: ['#fff1f2', '#ffd9de', '#ffb1be', '#ff8099', '#ef476f', '#d62857', '#9d174d'],
                trendMain: '#ef476f',
                trendAccent: '#d62857'
            },
            dark: {
                heatmap: ['#0f172a', '#123b43', '#0f766e', '#14b8a6', '#2dd4bf', '#67e8f9', '#ccfbf1'],
                trendMain: '#2dd4bf',
                trendAccent: '#67e8f9'
            },
            'purple-dream': {
                heatmap: ['#faf5ff', '#eedcff', '#d8b4fe', '#b794f4', '#9f67ff', '#7c3aed', '#5b21b6'],
                trendMain: '#9f67ff',
                trendAccent: '#7c3aed'
            },
            'ocean-blue': {
                heatmap: ['#f3f8ff', '#dbeafe', '#93c5fd', '#60a5fa', '#38bdf8', '#2563eb', '#1d4ed8'],
                trendMain: '#38bdf8',
                trendAccent: '#2563eb'
            },
            'sunset-orange': {
                heatmap: ['#fff7ed', '#ffedd5', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c'],
                trendMain: '#f97316',
                trendAccent: '#c2410c'
            },
            neon: {
                heatmap: ['#020617', '#082f49', '#0e7490', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc'],
                trendMain: '#22d3ee',
                trendAccent: '#67e8f9'
            },
            'dark-elegant': {
                heatmap: ['#111827', '#1f2937', '#312e81', '#4f46e5', '#6366f1', '#818cf8', '#c7d2fe'],
                trendMain: '#818cf8',
                trendAccent: '#6366f1'
            },
            'fresh-green': {
                heatmap: ['#f7fee7', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#15803d'],
                trendMain: '#4ade80',
                trendAccent: '#15803d'
            },
            'passion-red': {
                heatmap: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#be123c'],
                trendMain: '#fb7185',
                trendAccent: '#be123c'
            }
        };

        const palette = paletteMap[theme] || paletteMap.teal;

        return {
            primaryColor,
            primaryColorRgb,
            textPrimary,
            textSecondary,
            borderColor,
            isDarkTheme,
            heatmapColors: palette.heatmap,
            trendMain: palette.trendMain,
            trendAccent: palette.trendAccent,
            tooltipBackground: isDarkTheme ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)',
            tooltipBorder: isDarkTheme ? 'rgba(148, 163, 184, 0.24)' : 'rgba(15, 23, 42, 0.08)',
            splitLineColor: isDarkTheme ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.12)',
            splitAreaColors: isDarkTheme
                ? ['rgba(255, 255, 255, 0.015)', 'rgba(255, 255, 255, 0.04)']
                : ['rgba(15, 23, 42, 0.015)', 'rgba(15, 23, 42, 0.035)'],
            zoomBackground: isDarkTheme ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
            zoomDataBackground: isDarkTheme ? 'rgba(148, 163, 184, 0.22)' : 'rgba(148, 163, 184, 0.14)',
            zoomFiller: `rgba(${primaryColorRgb}, 0.18)`,
            zoomHandle: `rgba(${primaryColorRgb}, 0.92)`,
            trendAreaStart: `rgba(${primaryColorRgb}, ${isDarkTheme ? '0.34' : '0.24'})`,
            trendAreaEnd: `rgba(${primaryColorRgb}, ${isDarkTheme ? '0.05' : '0.03'})`,
            emphasisShadow: isDarkTheme ? 'rgba(15, 23, 42, 0.60)' : 'rgba(15, 23, 42, 0.18)'
        };
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

        // 不设置默认日期范围，让后端返回所有数据
        // 用户可以通过筛选器选择特定日期范围

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

            // 填充行业选择器（如果存在）
            const industrySelect = document.getElementById('industrySelect');
            if (industrySelect) {
                industrySelect.innerHTML = '<option value="">全部行业</option>';
                this.industries.forEach(industry => {
                    const option = document.createElement('option');
                    option.value = industry;
                    option.textContent = industry;
                    industrySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('加载行业列表失败:', error);
        }
    }

    async applyFilters() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const industrySelect = document.getElementById('industrySelect');

        let selectedIndustries = [];
        if (industrySelect) {
            selectedIndustries = Array.from(industrySelect.selectedOptions)
                .map(opt => opt.value)
                .filter(v => v !== '');
        }

        await this.loadData(startDate, endDate, selectedIndustries);
        this.renderStatistics();
        this.renderHeatmap();
    }

    resetFilters() {
        // 清空日期筛选，显示所有数据
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
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

        const { dates, total_breadth_data } = this.currentData;
        const chartTheme = this.getChartThemeConfig();

        // 提取 total_breadth 数据（全市场上涨家数总和）
        const totalBreadthValues = total_breadth_data || [];

        // 计算移动平均线（5日）
        const ma5 = [];
        for (let i = 0; i < totalBreadthValues.length; i++) {
            if (i < 4) {
                ma5.push(null);
            } else {
                const sum = totalBreadthValues.slice(i - 4, i + 1).reduce((a, b) => a + b, 0);
                ma5.push(Math.round(sum / 5));
            }
        }

        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                backgroundColor: chartTheme.tooltipBackground,
                borderColor: chartTheme.tooltipBorder,
                borderWidth: 1,
                textStyle: {
                    color: chartTheme.textPrimary
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
                axisLine: {
                    lineStyle: {
                        color: chartTheme.borderColor
                    }
                },
                axisLabel: {
                    rotate: 45,
                    fontSize: 10,
                    color: chartTheme.textSecondary
                }
            },
            yAxis: {
                type: 'value',
                nameTextStyle: {
                    color: chartTheme.textSecondary
                },
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: chartTheme.borderColor
                    }
                },
                axisLabel: {
                    color: chartTheme.textSecondary
                },
                splitLine: {
                    lineStyle: {
                        color: chartTheme.splitLineColor
                    }
                },
                name: '全市场上涨家数总和'
            },
            dataZoom: [
                {
                    type: 'slider',
                    show: true,
                    start: 0,
                    end: 100,
                    bottom: '10%',
                    backgroundColor: chartTheme.zoomBackground,
                    fillerColor: chartTheme.zoomFiller,
                    borderColor: chartTheme.borderColor,
                    dataBackground: {
                        lineStyle: {
                            color: chartTheme.zoomDataBackground
                        },
                        areaStyle: {
                            color: chartTheme.zoomBackground
                        }
                    },
                    selectedDataBackground: {
                        lineStyle: {
                            color: chartTheme.primaryColor
                        },
                        areaStyle: {
                            color: chartTheme.zoomFiller
                        }
                    },
                    handleStyle: {
                        color: chartTheme.zoomHandle
                    },
                    textStyle: {
                        color: chartTheme.textSecondary
                    }
                },
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                }
            ],
            series: [
                {
                    name: '全市场上涨家数总和',
                    type: 'line',
                    data: totalBreadthValues,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        width: 2,
                        color: chartTheme.trendMain
                    },
                    itemStyle: {
                        color: chartTheme.trendMain
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: chartTheme.trendAreaStart },
                                { offset: 1, color: chartTheme.trendAreaEnd }
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
                        color: chartTheme.trendAccent
                    },
                    itemStyle: {
                        color: chartTheme.trendAccent
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
        const chartTheme = this.getChartThemeConfig();
        // 只使用行业数据，排除 index_all 和 sum 列
        const industryColumns = columns.slice(0, -2);

        // 交换x轴和y轴：行业在顶部(x轴)，日期在左侧(y轴)
        // 数据格式: [x, y, value] 其中 x=列索引, y=日期索引（ECharts heatmap格式）

        // 构建行业数据
        const industryData = [];
        for (let j = 0; j < industryColumns.length; j++) {
            for (let i = 0; i < dates.length; i++) {
                const value = data[i][j];
                if (value !== null && value !== undefined) {
                    industryData.push([j, i, value]);
                }
            }
        }

        // 计算颜色范围
        const minValue = 0;
        const maxValue = 100;

        // 计算显示百分比
        const totalIndustries = industryColumns.length;
        const totalDates = dates.length;

        // 计算行业显示百分比：显示所有行业
        const industryDisplayPercent = 100;

        // 计算日期显示百分比：最近30天
        const targetDates = 30;
        const dateDisplayPercent = totalDates > 0
            ? Math.min(100, Math.round((targetDates / totalDates) * 100))
            : 100;

        // 在控制台输出数据统计信息，方便调试
        console.log(`市场宽度热力图数据统计: 共 ${totalDates} 个交易日, ${totalIndustries} 个行业`);
        console.log(`默认显示: 最近 ${targetDates} 个交易日 (${dateDisplayPercent}%)`);

        // 更新页面上的数据信息提示
        const heatmapInfo = document.getElementById('heatmapInfo');
        if (heatmapInfo) {
            heatmapInfo.innerHTML = `
                <i class="bi bi-info-circle"></i>
                数据范围：共 ${totalDates} 个交易日（${dates[0]} 至 ${dates[dates.length - 1]}），
                当前显示最近 ${targetDates} 天。使用右侧滑块或鼠标滚轮查看历史数据。
            `;
        }

        const option = {
            // 添加滚动和缩放功能
            dataZoom: [
                // 横向滚动（行业）
                {
                    type: 'slider',
                    show: true,
                    xAxisIndex: 0,
                    start: 0,
                    end: industryDisplayPercent,
                    bottom: '2%',
                    height: 20,
                    handleSize: '80%',
                    textStyle: {
                        fontSize: 10,
                        color: chartTheme.textSecondary
                    },
                    backgroundColor: chartTheme.zoomBackground,
                    fillerColor: chartTheme.zoomFiller,
                    borderColor: chartTheme.borderColor,
                    dataBackground: {
                        lineStyle: {
                            color: chartTheme.zoomDataBackground
                        },
                        areaStyle: {
                            color: chartTheme.zoomBackground
                        }
                    },
                    selectedDataBackground: {
                        lineStyle: {
                            color: chartTheme.primaryColor
                        },
                        areaStyle: {
                            color: chartTheme.zoomFiller
                        }
                    },
                    handleStyle: {
                        color: chartTheme.zoomHandle
                    },
                    zoomLock: false,
                    brushSelect: false
                },
                // 纵向滑块（日期）
                {
                    type: 'slider',
                    show: true,
                    yAxisIndex: 0,
                    start: Math.max(0, 100 - dateDisplayPercent),
                    end: 100,
                    right: '2%',
                    width: 18,
                    height: '75%',
                    handleSize: '100%',
                    textStyle: {
                        fontSize: 9,
                        color: chartTheme.textSecondary
                    },
                    backgroundColor: chartTheme.zoomBackground,
                    fillerColor: chartTheme.zoomFiller,
                    borderColor: chartTheme.borderColor,
                    dataBackground: {
                        lineStyle: {
                            color: chartTheme.zoomDataBackground
                        },
                        areaStyle: {
                            color: chartTheme.zoomBackground
                        }
                    },
                    selectedDataBackground: {
                        lineStyle: {
                            color: chartTheme.primaryColor
                        },
                        areaStyle: {
                            color: chartTheme.zoomFiller
                        }
                    },
                    handleStyle: {
                        color: chartTheme.zoomHandle
                    },
                    zoomLock: false,
                    orient: 'vertical',
                    showDetail: false,
                    filterMode: 'filter'
                },
                // 鼠标交互（日期）
                {
                    type: 'inside',
                    yAxisIndex: 0,
                    start: Math.max(0, 100 - dateDisplayPercent),
                    end: 100,
                    zoomOnMouseWheel: true,
                    moveOnMouseMove: true,
                    moveOnMouseWheel: false
                }
            ],
            tooltip: {
                position: 'top',
                backgroundColor: chartTheme.tooltipBackground,
                borderColor: chartTheme.tooltipBorder,
                borderWidth: 1,
                textStyle: {
                    color: chartTheme.textPrimary
                },
                formatter: (params) => {
                    const dateIndex = params.value[1];
                    const date = dates[dateIndex];
                    const colIndex = params.value[0];
                    const column = industryColumns[colIndex];
                    const value = params.value[2];
                    return `${date}<br/><strong>${column}</strong><br/>BIAS>0比例: <strong>${value}%</strong>`;
                }
            },
            grid: {
                height: '75%',
                top: '10%',
                left: '5%',
                right: '5%',
                containLabel: false
            },
            xAxis: {
                type: 'category',
                data: industryColumns,
                position: 'top',
                axisLine: {
                    lineStyle: {
                        color: chartTheme.borderColor
                    }
                },
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: chartTheme.splitAreaColors
                    }
                },
                axisLabel: {
                    rotate: 45,
                    interval: 'auto',
                    fontSize: 10,
                    color: chartTheme.textSecondary
                }
            },
            yAxis: {
                type: 'category',
                data: dates,
                axisLine: {
                    lineStyle: {
                        color: chartTheme.borderColor
                    }
                },
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: chartTheme.splitAreaColors
                    }
                },
                axisLabel: {
                    fontSize: 9,
                    color: chartTheme.textSecondary
                }
            },
            visualMap: {
                min: 0,
                max: 100,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '6%',
                inRange: {
                    color: [
                        '#11aac3',  // 0 - 青绿色
                        '#07bdae',  // 20 - 青色
                        '#34ebe0',  // 40 - 亮青色
                        '#d0ffae',  // 60 - 浅黄绿色
                        '#f5465f',  // 80 - 粉红色
                        '#a53354'   // 100 - 深粉红色
                    ]
                },
                text: ['高 (100)', '低 (0)']
            },
            series: [
                {
                    name: '行业数据',
                    type: 'heatmap',
                    data: industryData,
                    label: {
                        show: false
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

        option.visualMap.textStyle = {
            color: chartTheme.textSecondary
        };
        option.visualMap.inRange.color = chartTheme.heatmapColors;
        option.series[0].itemStyle = {
            borderColor: chartTheme.isDarkTheme ? 'rgba(15, 23, 42, 0.24)' : 'rgba(255, 255, 255, 0.72)',
            borderWidth: 1
        };
        option.series[0].emphasis.itemStyle = {
            shadowBlur: 18,
            shadowColor: chartTheme.emphasisShadow,
            borderColor: chartTheme.primaryColor,
            borderWidth: 1.2
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
    } else if (!window.marketBreadth) {
        window.marketBreadth = new MarketBreadth();
    }
});

window.addEventListener('resize', () => {
    if (window.marketBreadth) {
        window.marketBreadth.resizeChart();
    }
});

window.addEventListener('themechange', () => {
    if (window.marketBreadth) {
        window.marketBreadth.renderTrendChart();
        window.marketBreadth.renderHeatmap();
    }
});
