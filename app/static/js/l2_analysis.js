/**
 * L2分析模块 - 资金流量分析
 */
class L2Analysis {
    constructor() {
        this.vwapChart = null;
        this.amountChart = null;
        this.scoreChart = null;
        this.currentStockCode = null;
        this.isSyncing = false;
        this.sectors = [];
        this.availableDates = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.sortBy = 'score';
        this.sortOrder = 'desc';
        this.topStocksMatrixData = [];
        this.matrixLayoutMode = 'full';
        this.init();
    }

    async init() {
        this.checkECharts();
        this.decorateMarketFilters();
        this.initSyncButton();
        this.initCloseStockCharts();
        this.decorateMarketListTable();
        await this.loadAvailableDates();
        await this.loadAvailableSectors();
        await this.loadTopStocksMatrix();
        await this.loadMarketList();
        this.updateLastUpdateTime();
    }

    checkECharts() {
        if (typeof echarts === 'undefined') {
            console.error('ECharts library not loaded');
            return;
        }
        this.echartsLoaded = true;
    }

    initSyncButton() {
        const syncBtn = document.getElementById('syncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.syncL2Data();
            });
        }
    }

    initCloseStockCharts() {
        const section = document.getElementById('stockChartsSection');
        const closeBtn = document.getElementById('closeStockCharts');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideStockCharts();
            });
        }

        if (section) {
            section.addEventListener('click', (event) => {
                if (event.target === section) {
                    this.hideStockCharts();
                }
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.hideStockCharts();
            }
        });

        // 筛选器事件
        const sectorFilter = document.getElementById('sectorFilter');
        if (sectorFilter) {
            sectorFilter.addEventListener('change', () => {
                this.loadTopStocksMatrix();
            });
        }

        // 市场列表筛选器
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.currentPage = 1;
                this.loadMarketList();
            });
        }

        const marketDateSelect = document.getElementById('marketDateSelect');
        if (marketDateSelect) {
            marketDateSelect.addEventListener('change', () => {
                this.currentPage = 1;
                this.loadMarketList();
            });
        }

        const resetMarketFiltersBtn = document.getElementById('resetMarketFiltersBtn');
        if (resetMarketFiltersBtn) {
            resetMarketFiltersBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.resetMarketFilters();
            }, true);
        }

        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.currentPage = 1;
                this.loadMarketList();
            }, true);
        }

        ['marketStockCodeInput', 'marketStockNameInput', 'minScoreInput', 'maxScoreInput'].forEach((id) => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        this.currentPage = 1;
                        this.loadMarketList();
                    }
                });
            }
        });
    }

    showStockCharts(stockCode, stockName) {
        const section = document.getElementById('stockChartsSection');
        if (!section) {
            return;
        }

        this.currentStockCode = stockCode;
        document.getElementById('stockChartTitle').textContent = `${stockCode} - ${stockName || ''}`;
        section.style.display = 'flex';
        section.classList.add('is-open');
        document.body.classList.add('stock-charts-open');
    }

    hideStockCharts() {
        const section = document.getElementById('stockChartsSection');
        if (!section) {
            return;
        }

        section.classList.remove('is-open');
        section.style.display = 'none';
        document.body.classList.remove('stock-charts-open');
        this.currentStockCode = null;
    }

    decorateMarketFilters() {
        const dateSelect = document.getElementById('marketDateSelect');
        const sectorSelect = document.getElementById('marketSectorSelect');
        const minScoreInput = document.getElementById('minScoreInput');
        const maxScoreInput = document.getElementById('maxScoreInput');
        const applyBtn = document.getElementById('applyFiltersBtn');

        const dateCol = dateSelect ? dateSelect.closest('div[class*="col-"]') : null;
        const sectorCol = sectorSelect ? sectorSelect.closest('div[class*="col-"]') : null;
        const minScoreCol = minScoreInput ? minScoreInput.closest('div[class*="col-"]') : null;
        const maxScoreCol = maxScoreInput ? maxScoreInput.closest('div[class*="col-"]') : null;
        const buttonCol = applyBtn ? applyBtn.closest('div[class*="col-"]') : null;

        [dateCol, sectorCol, minScoreCol, maxScoreCol].forEach((col) => {
            if (col) {
                col.className = 'col-md-2';
            }
        });

        if (sectorCol && !document.getElementById('marketStockCodeInput')) {
            const stockCodeCol = document.createElement('div');
            stockCodeCol.className = 'col-md-2';
            stockCodeCol.innerHTML = `
                <label for="marketStockCodeInput" class="form-label small">Stock Code</label>
                <input type="text" id="marketStockCodeInput" class="form-control form-control-sm" placeholder="如 600604">
            `;

            const stockNameCol = document.createElement('div');
            stockNameCol.className = 'col-md-2';
            stockNameCol.innerHTML = `
                <label for="marketStockNameInput" class="form-label small">Stock Name</label>
                <input type="text" id="marketStockNameInput" class="form-control form-control-sm" placeholder="如 市北高新">
            `;

            sectorCol.insertAdjacentElement('afterend', stockCodeCol);
            stockCodeCol.insertAdjacentElement('afterend', stockNameCol);
        }

        if (buttonCol && applyBtn) {
            buttonCol.className = 'col-12 d-flex justify-content-end gap-2 mt-2';
            applyBtn.classList.remove('w-100');
            applyBtn.type = 'button';

            if (!document.getElementById('resetMarketFiltersBtn')) {
                const resetBtn = document.createElement('button');
                resetBtn.id = 'resetMarketFiltersBtn';
                resetBtn.type = 'button';
                resetBtn.className = 'btn btn-sm btn-outline-secondary';
                resetBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> 重置';
                buttonCol.insertBefore(resetBtn, applyBtn);
            }
        }
    }

    decorateMarketListTable() {
        const tableBody = document.getElementById('marketListTable');
        const table = tableBody ? tableBody.closest('table') : null;
        const wrapper = table ? table.parentElement : null;
        const paginationNav = document.getElementById('paginationNav');

        if (wrapper) {
            wrapper.classList.remove('table-responsive');
            wrapper.classList.add('table-container', 'glass', 'l2-market-table-container');
        }

        if (table) {
            table.classList.remove('table', 'table-hover', 'table-sm');
            table.classList.add('stock-table', 'l2-market-table');

            const thead = table.querySelector('thead');
            if (thead) {
                thead.innerHTML = `
                    <tr>
                        <th class="sort-icon" data-sort="stock_code">Stock Code <i class="bi bi-arrow-down-up" style="opacity: 0.5;"></i></th>
                        <th class="sort-icon" data-sort="stock_name">Stock Name <i class="bi bi-arrow-down-up" style="opacity: 0.5;"></i></th>
                        <th class="sort-icon" data-sort="sector_name">Sector <i class="bi bi-arrow-down-up" style="opacity: 0.5;"></i></th>
                        <th class="sort-icon" data-sort="price_close_vwap_ratio">VWAP Ratio <i class="bi bi-arrow-down-up" style="opacity: 0.5;"></i></th>
                        <th class="sort-icon" data-sort="large_total_amount_ratio">Amount Ratio <i class="bi bi-arrow-down-up" style="opacity: 0.5;"></i></th>
                        <th class="sort-icon" data-sort="score">Score <i class="bi bi-arrow-down-up" style="opacity: 0.5;"></i></th>
                        <th>Advice</th>
                        <th>Action</th>
                    </tr>
                `;
            }
        }

        if (tableBody) {
            tableBody.querySelectorAll('td[colspan]').forEach((cell) => {
                cell.colSpan = 8;
            });
        }

        if (paginationNav) {
            paginationNav.classList.add('pagination-container');
        }

        this.bindMarketSortEvents();
        this.updateMarketSortIcons();
    }

    bindMarketSortEvents() {
        document.querySelectorAll('.l2-market-table th.sort-icon').forEach((th) => {
            if (th.dataset.boundSort === 'true') {
                return;
            }

            th.dataset.boundSort = 'true';
            th.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                const sortBy = th.dataset.sort;
                if (!sortBy) {
                    return;
                }

                if (this.sortBy === sortBy) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortBy = sortBy;
                    this.sortOrder = sortBy === 'stock_code' || sortBy === 'stock_name' || sortBy === 'sector_name' ? 'asc' : 'desc';
                }

                this.currentPage = 1;
                this.updateMarketSortIcons();
                this.loadMarketList();
            });
        });
    }

    updateMarketSortIcons() {
        document.querySelectorAll('.l2-market-table th.sort-icon').forEach((th) => {
            th.classList.remove('sort-asc', 'sort-desc');
            const icon = th.querySelector('i');

            if (!icon) {
                return;
            }

            icon.className = 'bi bi-arrow-down-up';
            icon.style.opacity = '0.5';

            if (th.dataset.sort === this.sortBy) {
                if (this.sortOrder === 'asc') {
                    th.classList.add('sort-asc');
                    icon.className = 'bi bi-arrow-up';
                } else {
                    th.classList.add('sort-desc');
                    icon.className = 'bi bi-arrow-down';
                }
                icon.style.opacity = '1';
            }
        });
    }

    applySectorFilter(sectorName) {
        const marketSectorSelect = document.getElementById('marketSectorSelect');
        if (marketSectorSelect) {
            marketSectorSelect.value = sectorName;
        }

        this.currentPage = 1;
        this.loadMarketList();

        if (window.Events && typeof window.Events.showSectorFilterToast === 'function') {
            window.Events.showSectorFilterToast(sectorName);
        } else {
            this.showSuccess(`已筛选板块：${sectorName}`);
        }
    }

    resetMarketFilters() {
        const marketSectorSelect = document.getElementById('marketSectorSelect');
        const marketStockCodeInput = document.getElementById('marketStockCodeInput');
        const marketStockNameInput = document.getElementById('marketStockNameInput');
        const minScoreInput = document.getElementById('minScoreInput');
        const maxScoreInput = document.getElementById('maxScoreInput');

        if (marketSectorSelect) {
            marketSectorSelect.value = '';
        }
        if (marketStockCodeInput) {
            marketStockCodeInput.value = '';
        }
        if (marketStockNameInput) {
            marketStockNameInput.value = '';
        }
        if (minScoreInput) {
            minScoreInput.value = '';
        }
        if (maxScoreInput) {
            maxScoreInput.value = '';
        }

        const sectorToast = document.querySelector('.sector-filter-toast');
        if (sectorToast) {
            sectorToast.remove();
        }

        document.querySelectorAll('.l2-market-table td.sector-highlight').forEach((cell) => {
            cell.classList.remove('sector-highlight');
        });

        this.currentPage = 1;
        this.loadMarketList();
    }

    async syncL2Data() {
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
            const response = await API.fetch('/api/l2-analysis/sync', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showSuccess(`同步成功！共同步 ${result.record_count} 条记录`);
                // 重新加载数据
                await this.loadAvailableDates();
                await this.loadTopStocksMatrix();
                await this.loadMarketList();
                this.updateLastUpdateTime();
            } else {
                this.showError('同步失败：' + (result.error || '未知错误'));
            }
        } catch (error) {
            this.showError('同步失败：' + error.message);
            console.error('同步L2分析数据失败:', error);
        } finally {
            this.isSyncing = false;
            syncBtn.disabled = false;
            syncBtnIcon.classList.remove('spin-icon');
            syncBtnText.textContent = '同步数据';
        }
    }

    async loadAvailableDates() {
        try {
            const response = await API.fetch('/api/l2-analysis/available-dates');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.availableDates = data.dates || [];

            // 填充日期选择器
            const dateSelect = document.getElementById('marketDateSelect');
            if (dateSelect) {
                dateSelect.innerHTML = '';
                this.availableDates.forEach(date => {
                    const option = document.createElement('option');
                    option.value = date;
                    option.textContent = date;
                    dateSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('加载可用日期失败:', error);
        }
    }

    async loadAvailableSectors() {
        try {
            const response = await API.fetch('/api/l2-analysis/available-sectors');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.sectors = data.sectors || [];

            // 填充板块选择器
            const sectorFilter = document.getElementById('sectorFilter');
            const marketSectorSelect = document.getElementById('marketSectorSelect');

            [sectorFilter, marketSectorSelect].forEach(select => {
                if (select) {
                    select.innerHTML = '<option value="">全部板块</option>';
                    this.sectors.forEach(sector => {
                        const option = document.createElement('option');
                        option.value = sector;
                        option.textContent = sector;
                        select.appendChild(option);
                    });
                }
            });
        } catch (error) {
            console.error('加载板块列表失败:', error);
        }
    }

    async loadTopStocksMatrix() {
        try {
            const sectorFilter = document.getElementById('sectorFilter');
            const sector = sectorFilter ? sectorFilter.value : '';

            const params = new URLSearchParams();
            params.append('days', 10);
            if (sector) params.append('sector', sector);

            const response = await API.fetch(`/api/l2-analysis/top-stocks-matrix?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error || data.message);
            }

            this.renderTopStocksMatrix(data.data);
        } catch (error) {
            this.showError('加载Top股票矩阵失败：' + error.message);
            console.error(error);
        }
    }

    getMatrixLayoutMode() {
        if (window.innerWidth <= 820) {
            return 'compact';
        }
        if (window.innerWidth <= 1280) {
            return 'medium';
        }
        return 'full';
    }

    formatMatrixDateLabel(date, layoutMode) {
        if (!date) {
            return '';
        }
        if (layoutMode === 'full') {
            return date;
        }
        return date.slice(5);
    }

    renderTopStocksMatrix(data) {
        const container = document.getElementById('topStocksMatrix');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">暂无数据</p>';
            return;
        }

        // 反转数据数组，让最新日期在左边
        this.topStocksMatrixData = Array.isArray(data) ? data : [];
        const matrixLayoutMode = this.getMatrixLayoutMode();
        this.matrixLayoutMode = matrixLayoutMode;

        const reversedData = [...data].reverse();

        // 统计每个股票代码的出现次数
        const stockCount = {};
        reversedData.forEach(dayData => {
            dayData.stocks.forEach(stock => {
                if (stock && stock.stock_code) {
                    stockCount[stock.stock_code] = (stockCount[stock.stock_code] || 0) + 1;
                }
            });
        });

        // 找出出现次数>=2的股票，并为每个分配唯一颜色
        const duplicateStocks = Object.keys(stockCount).filter(code => stockCount[code] >= 2);

        // 颜色调色板（参考主题颜色）
        const colorPalette = [
            'rgba(0, 191, 165, 0.15)',   // Teal
            'rgba(229, 57, 53, 0.15)',   // Red
            'rgba(63, 81, 181, 0.15)',   // Indigo
            'rgba(255, 152, 0, 0.15)',   // Orange
            'rgba(156, 39, 176, 0.15)',  // Purple
            'rgba(76, 175, 80, 0.15)',   // Green
            'rgba(255, 235, 59, 0.15)',  // Yellow
            'rgba(0, 188, 212, 0.15)',   // Cyan
            'rgba(255, 87, 34, 0.15)',   // Deep Orange
            'rgba(96, 125, 139, 0.15)',  // Blue Grey
            'rgba(103, 58, 183, 0.15)',  // Deep Purple
            'rgba(0, 150, 136, 0.15)',   // Light Teal
            'rgba(233, 30, 99, 0.15)',   // Pink
            'rgba(121, 85, 72, 0.15)',   // Brown
            'rgba(33, 150, 243, 0.15)'   // Blue
        ];

        const borderColorPalette = [
            '#00BFA5',  // Teal
            '#E53935',  // Red
            '#3F51B5',  // Indigo
            '#FF9800',  // Orange
            '#9C27B0',  // Purple
            '#4CAF50',  // Green
            '#FFEB3B',  // Yellow
            '#00BCD4',  // Cyan
            '#FF5722',  // Deep Orange
            '#607D8B',  // Blue Grey
            '#6753A3',  // Deep Purple
            '#009688',  // Light Teal
            '#E91E63',  // Pink
            '#795548',  // Brown
            '#2196F3'   // Blue
        ];

        // 为每个重复出现的股票分配颜色索引
        const stockColorMap = {};
        duplicateStocks.forEach((stockCode, index) => {
            stockColorMap[stockCode] = {
                bg: colorPalette[index % colorPalette.length],
                border: borderColorPalette[index % borderColorPalette.length]
            };
        });

        // 转置矩阵：Top 8 作为行，日期作为列
        const topN = 8;
        const daysCount = reversedData.length;

        let html = `<div class="table-responsive matrix-table-scroll"><table class="table table-sm table-hover matrix-table matrix-table--${matrixLayoutMode}">`;
        html += '<thead><tr><th class="rank-column">排名</th>';

        // 添加日期列标题（最新日期在前）
        reversedData.forEach((dayData) => {
            const dateLabel = this.formatMatrixDateLabel(dayData.date, matrixLayoutMode);
            html += `<th class="date-header" title="${dayData.date}"><span class="matrix-date-label">${dateLabel}</span></th>`;
        });

        html += '</tr></thead><tbody>';

        // 遍历每个排名（1-8）
        for (let rank = 0; rank < topN; rank++) {
            html += `<tr><td class="rank-column"><strong>Top ${rank + 1}</strong></td>`;

            // 遍历每一天（已反转，最新在前）
            reversedData.forEach(dayData => {
                const stock = dayData.stocks[rank];
                if (stock) {
                    const duplicateStyle = this.getDuplicateStyle(stock.stock_code, stockColorMap);
                    const fullStyle = duplicateStyle ? duplicateStyle + ' cursor: pointer;' : 'cursor: pointer;';
                    html += `
                        <td class="stock-cell"
                            data-stock-code="${stock.stock_code}" data-stock-name="${stock.stock_name}"
                            style="${fullStyle}">
                            <div class="stock-code">${stock.stock_code}</div>
                            <div class="stock-name">${stock.stock_name || ''}</div>
                            <div class="stock-sector">${stock.sector_name || ''}</div>
                            <div class="stock-score">${stock.score ? stock.score.toFixed(2) : '-'}</div>
                        </td>
                    `;
                } else {
                    html += '<td class="empty-cell">-</td>';
                }
            });

            html += '</tr>';
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;

        // 绑定点击事件
        container.querySelectorAll('.stock-cell[data-stock-code]').forEach(cell => {
            cell.addEventListener('click', () => {
                const stockCode = cell.getAttribute('data-stock-code');
                const stockName = cell.getAttribute('data-stock-name');
                this.loadStockHistory(stockCode, stockName);
            });
        });
    }

    getDuplicateStyle(stockCode, stockColorMap) {
        if (stockColorMap[stockCode]) {
            return `background-color: ${stockColorMap[stockCode].bg} !important; border-left: 4px solid ${stockColorMap[stockCode].border};`;
        }
        return '';
    }

    getAdviceClass(advice) {
        if (!advice) return '';
        switch (advice.toUpperCase()) {
            case '买入':
            case '强烈买入':
                return 'advice-buy';
            case '卖出':
            case '强烈卖出':
                return 'advice-sell';
            case '持有':
                return 'advice-hold';
            default:
                return '';
        }
    }

    async loadStockHistory(stockCode, stockName) {
        try {
            const response = await API.fetch(`/api/l2-analysis/stock-history?stock_code=${encodeURIComponent(stockCode)}&days=10`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // 显示图表区域
            this.showStockCharts(stockCode, stockName);

            // 延迟渲染，确保容器已经可见并且有正确的尺寸
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.renderStockChartsPopup(data);
                });
            });
        } catch (error) {
            this.showError('加载股票历史数据失败：' + error.message);
            console.error(error);
        }
    }

    renderStockCharts(data) {
        if (!this.echartsLoaded) {
            console.error('ECharts not loaded');
            return;
        }

        const el = document.getElementById('vwapChart');
        if (!el) {
            console.error('Chart container not found');
            return;
        }

        // 确保先销毁旧图表
        if (this.vwapChart) {
            try {
                this.vwapChart.dispose();
            } catch (e) {
                console.warn('Failed to dispose old chart:', e);
            }
            this.vwapChart = null;
        }

        // 检测数据格式：新格式(6字段) 或 旧格式(level1/2/3)
        const isNewVwapFormat = data.vwap && (data.vwap.vwap !== undefined || data.vwap.super_large_vwap !== undefined);
        const isNewAmountFormat = data.amount && (data.amount.total_amount !== undefined || data.amount.super_large_amount !== undefined);

        const vwapSeries = isNewVwapFormat ? [
            {
                name: '收盘价',
                type: 'line',
                data: data.vwap.close_price,
                smooth: true,
                symbol: 'circle',
                symbolSize: 4,
                lineStyle: { width: 2, color: '#000000', type: 'dashed' },
                itemStyle: { color: '#000000' },
                xAxisIndex: 0,
                yAxisIndex: 0
            },
            {
                name: '综合VWAP',
                type: 'line',
                data: data.vwap.vwap,
                smooth: true,
                symbol: 'circle',
                symbolSize: 5,
                lineStyle: { width: 3, color: '#E53935' },
                itemStyle: { color: '#E53935' },
                xAxisIndex: 0,
                yAxisIndex: 0
            },
            {
                name: '超大单VWAP',
                type: 'line',
                data: data.vwap.super_large_vwap,
                smooth: true,
                symbol: 'diamond',
                symbolSize: 4,
                lineStyle: { width: 2, color: '#9C27B0' },
                itemStyle: { color: '#9C27B0' },
                xAxisIndex: 0,
                yAxisIndex: 0
            },
            {
                name: '大单VWAP',
                type: 'line',
                data: data.vwap.large_vwap,
                smooth: true,
                symbol: 'triangle',
                symbolSize: 4,
                lineStyle: { width: 2, color: '#FF9800' },
                itemStyle: { color: '#FF9800' },
                xAxisIndex: 0,
                yAxisIndex: 0
            },
            {
                name: '中单VWAP',
                type: 'line',
                data: data.vwap.medium_vwap,
                smooth: true,
                symbol: 'circle',
                symbolSize: 4,
                lineStyle: { width: 2, color: '#00BFA5' },
                itemStyle: { color: '#00BFA5' },
                xAxisIndex: 0,
                yAxisIndex: 0
            },
            {
                name: '小单VWAP',
                type: 'line',
                data: data.vwap.others_vwap,
                smooth: true,
                symbol: 'rect',
                symbolSize: 4,
                lineStyle: { width: 2, color: '#607D8B' },
                itemStyle: { color: '#607D8B' },
                xAxisIndex: 0,
                yAxisIndex: 0
            }
        ] : [
            {
                name: 'Level 1',
                type: 'line',
                data: data.vwap.level1,
                smooth: true,
                symbol: 'circle',
                symbolSize: 4,
                lineStyle: { width: 2, color: '#f5465f' },
                itemStyle: { color: '#f5465f' },
                xAxisIndex: 0,
                yAxisIndex: 0
            },
            {
                name: 'Level 2',
                type: 'line',
                data: data.vwap.level2,
                smooth: true,
                symbol: 'circle',
                symbolSize: 4,
                lineStyle: { width: 2, color: '#11aac3' },
                itemStyle: { color: '#11aac3' },
                xAxisIndex: 0,
                yAxisIndex: 0
            },
            {
                name: 'Level 3',
                type: 'line',
                data: data.vwap.level3,
                smooth: true,
                symbol: 'circle',
                symbolSize: 4,
                lineStyle: { width: 2, color: '#ffc107' },
                itemStyle: { color: '#ffc107' },
                xAxisIndex: 0,
                yAxisIndex: 0
            }
        ];

        const amountSeries = isNewAmountFormat ? [
            {
                name: '超大单',
                type: 'bar',
                stack: 'amount',
                data: data.amount.super_large_amount,
                itemStyle: { color: '#9C27B0' },
                xAxisIndex: 1,
                yAxisIndex: 1
            },
            {
                name: '大单',
                type: 'bar',
                stack: 'amount',
                data: data.amount.large_amount,
                itemStyle: { color: '#FF9800' },
                xAxisIndex: 1,
                yAxisIndex: 1
            },
            {
                name: '中单',
                type: 'bar',
                stack: 'amount',
                data: data.amount.medium_amount,
                itemStyle: { color: '#00BFA5' },
                xAxisIndex: 1,
                yAxisIndex: 1
            },
            {
                name: '小单',
                type: 'bar',
                stack: 'amount',
                data: data.amount.others_amount,
                itemStyle: { color: '#607D8B' },
                xAxisIndex: 1,
                yAxisIndex: 1
            },
            {
                name: '总成交额',
                type: 'line',
                data: data.amount.total_amount,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: 3, color: '#E53935' },
                itemStyle: { color: '#E53935' },
                xAxisIndex: 1,
                yAxisIndex: 1
            }
        ] : [
            {
                name: 'Level 1',
                type: 'bar',
                stack: 'amount',
                data: data.amount.level1,
                itemStyle: { color: '#f5465f' },
                xAxisIndex: 1,
                yAxisIndex: 1
            },
            {
                name: 'Level 2',
                type: 'bar',
                stack: 'amount',
                data: data.amount.level2,
                itemStyle: { color: '#11aac3' },
                xAxisIndex: 1,
                yAxisIndex: 1
            },
            {
                name: 'Level 3',
                type: 'bar',
                stack: 'amount',
                data: data.amount.level3,
                itemStyle: { color: '#ffc107' },
                xAxisIndex: 1,
                yAxisIndex: 1
            }
        ];

        const scoreSeries = [
            {
                name: '综合评分',
                type: 'line',
                data: data.scores,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: 2, color: '#07bdae' },
                itemStyle: { color: '#07bdae' },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(7, 189, 174, 0.3)' },
                            { offset: 1, color: 'rgba(7, 189, 174, 0.05)' }
                        ]
                    }
                },
                xAxisIndex: 2,
                yAxisIndex: 2
            }
        ];

        // 合并所有图例
        const vwapLegend = isNewVwapFormat ? ['收盘价', '综合VWAP', '超大单VWAP', '大单VWAP', '中单VWAP', '小单VWAP'] : ['Level 1', 'Level 2', 'Level 3'];
        const amountLegend = isNewAmountFormat ? ['超大单', '大单', '中单', '小单'] : ['Level 1', 'Level 2', 'Level 3'];
        const allLegend = [...vwapLegend, ...amountLegend, '综合评分'];

        // 注意：el 变量已经在函数开头定义过了，这里不需要重复定义
        if (this.vwapChart) {
            this.vwapChart.dispose();
        }

        this.vwapChart = echarts.init(el);

        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            legend: {
                data: allLegend,
                top: 5,
                textStyle: { fontSize: 11 }
            },
            grid: [
                { // VWAP图表
                    left: '3%',
                    right: '4%',
                    top: 50,
                    height: '22%'
                },
                { // 成交额图表
                    left: '3%',
                    right: '4%',
                    top: '44%',
                    height: '22%'
                },
                { // 评分图表
                    left: '3%',
                    right: '4%',
                    top: '73%',
                    height: '18%'
                }
            ],
            xAxis: [
                {
                    type: 'category',
                    data: data.dates,
                    boundaryGap: false,
                    axisLabel: {
                        show: false
                    },
                    axisTick: {
                        show: false
                    },
                    axisLine: {
                        show: false
                    },
                    gridIndex: 0
                },
                {
                    type: 'category',
                    data: data.dates,
                    boundaryGap: true,
                    axisLabel: {
                        show: false
                    },
                    axisTick: {
                        show: false
                    },
                    axisLine: {
                        show: false
                    },
                    gridIndex: 1
                },
                {
                    type: 'category',
                    data: data.dates,
                    boundaryGap: false,
                    axisLabel: {
                        rotate: 45,
                        fontSize: 10
                    },
                    gridIndex: 2
                }
            ],
            yAxis: [
                { // VWAP Y轴
                    type: 'value',
                    name: '价格(元)',
                    nameTextStyle: { fontSize: 11 },
                    gridIndex: 0
                },
                { // 成交额 Y轴
                    type: 'value',
                    name: '成交额(万元)',
                    nameTextStyle: { fontSize: 11 },
                    gridIndex: 1
                },
                { // 评分 Y轴
                    type: 'value',
                    name: '评分',
                    nameTextStyle: { fontSize: 11 },
                    gridIndex: 2
                }
            ],
            dataZoom: [
                {
                    type: 'slider',
                    show: true,
                    start: 0,
                    end: 100,
                    bottom: '2%',
                    xAxisIndex: [0, 1, 2]
                },
                {
                    type: 'inside',
                    start: 0,
                    end: 100,
                    xAxisIndex: [0, 1, 2]
                }
            ],
            series: [...vwapSeries, ...amountSeries, ...scoreSeries]
        };

        this.vwapChart.setOption(option);
        this.vwapChart.resize();

        // 清理旧的图表实例
        if (this.amountChart) {
            this.amountChart.dispose();
            this.amountChart = null;
        }
        if (this.scoreChart) {
            this.scoreChart.dispose();
            this.scoreChart = null;
        }
    }

    renderStockChartsPopupLegacy(data) {
        if (!this.echartsLoaded) {
            console.error('ECharts not loaded');
            return;
        }

        const el = document.getElementById('vwapChart');
        if (!el) {
            console.error('Chart container not found');
            return;
        }

        const dates = Array.isArray(data?.dates) ? data.dates : [];
        if (!dates.length) {
            this.showError('暂无可显示的图表数据');
            return;
        }

        const existingChart = echarts.getInstanceByDom(el);
        if (existingChart) {
            existingChart.dispose();
        }

        if (this.vwapChart) {
            try {
                this.vwapChart.dispose();
            } catch (error) {
                console.warn('Failed to dispose old chart:', error);
            }
            this.vwapChart = null;
        }

        const formatFixed = (value, decimals = 2) => {
            const number = Number(value);
            if (!Number.isFinite(number)) {
                return '--';
            }
            return number.toFixed(decimals);
        };

        const formatWan = (value, decimals = 0) => {
            const number = Number(value);
            if (!Number.isFinite(number)) {
                return '--';
            }

            return (number / 10000).toLocaleString('zh-CN', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        };

        const formatAxisInteger = (value) => {
            const number = Number(value);
            if (!Number.isFinite(number)) {
                return '';
            }
            return Math.round(number).toLocaleString('zh-CN');
        };

        const normalizeValues = (values, transformer = (value) => value) => {
            if (!Array.isArray(values)) {
                return dates.map(() => null);
            }

            return dates.map((_, index) => {
                const number = Number(values[index]);
                if (!Number.isFinite(number)) {
                    return null;
                }
                return transformer(number);
            });
        };

        const getLastFiniteValue = (values) => {
            if (!Array.isArray(values)) {
                return null;
            }

            for (let index = values.length - 1; index >= 0; index -= 1) {
                const number = Number(values[index]);
                if (Number.isFinite(number)) {
                    return number;
                }
            }

            return null;
        };

        const legendValueMap = {};
        const amountSeriesNames = new Set();
        const addLegendValue = (name, values, formatter) => {
            const latestValue = getLastFiniteValue(values);
            if (latestValue === null) {
                return;
            }
            legendValueMap[name] = formatter(latestValue);
        };

        const createLineSeries = (name, values, color, xAxisIndex, yAxisIndex, extra = {}) => ({
            name,
            type: 'line',
            data: normalizeValues(values, extra.transformer || ((value) => value)),
            smooth: true,
            connectNulls: false,
            showSymbol: extra.showSymbol ?? false,
            symbol: extra.symbol || 'circle',
            symbolSize: extra.symbolSize || 5,
            lineStyle: extra.lineStyle || { width: 2, color },
            itemStyle: extra.itemStyle || { color },
            areaStyle: extra.areaStyle,
            xAxisIndex,
            yAxisIndex
        });

        const createBarSeries = (name, values, color, xAxisIndex, yAxisIndex) => {
            amountSeriesNames.add(name);
            return {
                name,
                type: 'bar',
                stack: 'amount',
                data: normalizeValues(values, (value) => value / 10000),
                itemStyle: { color },
                xAxisIndex,
                yAxisIndex
            };
        };

        const isNewVwapFormat = Boolean(data.vwap && (data.vwap.vwap !== undefined || data.vwap.super_large_vwap !== undefined));
        const isNewAmountFormat = Boolean(data.amount && (data.amount.total_amount !== undefined || data.amount.super_large_amount !== undefined));

        const vwapSeries = isNewVwapFormat ? [
            createLineSeries('收盘价', data.vwap.close_price, '#111111', 0, 0, {
                showSymbol: true,
                symbolSize: 4,
                lineStyle: { width: 2, color: '#111111', type: 'dashed' }
            }),
            createLineSeries('综合VWAP', data.vwap.vwap, '#E53935', 0, 0, {
                showSymbol: true,
                symbolSize: 5,
                lineStyle: { width: 3, color: '#E53935' }
            }),
            createLineSeries('超大单VWAP', data.vwap.super_large_vwap, '#9C27B0', 0, 0, {
                showSymbol: true,
                symbol: 'diamond',
                symbolSize: 4
            }),
            createLineSeries('大单VWAP', data.vwap.large_vwap, '#FF9800', 0, 0, {
                showSymbol: true,
                symbol: 'triangle',
                symbolSize: 4
            }),
            createLineSeries('中单VWAP', data.vwap.medium_vwap, '#00BFA5', 0, 0, {
                showSymbol: true,
                symbolSize: 4
            }),
            createLineSeries('小单VWAP', data.vwap.others_vwap, '#607D8B', 0, 0, {
                showSymbol: true,
                symbol: 'rect',
                symbolSize: 4
            })
        ] : [
            createLineSeries('Level 1', data.vwap.level1, '#f5465f', 0, 0, {
                showSymbol: true,
                symbolSize: 4
            }),
            createLineSeries('Level 2', data.vwap.level2, '#11aac3', 0, 0, {
                showSymbol: true,
                symbolSize: 4
            }),
            createLineSeries('Level 3', data.vwap.level3, '#ffc107', 0, 0, {
                showSymbol: true,
                symbolSize: 4
            })
        ];

        const amountSeries = isNewAmountFormat ? [
            createBarSeries('超大单', data.amount.super_large_amount, '#9C27B0', 1, 1),
            createBarSeries('大单', data.amount.large_amount, '#FF9800', 1, 1),
            createBarSeries('中单', data.amount.medium_amount, '#00BFA5', 1, 1),
            createBarSeries('小单', data.amount.others_amount, '#607D8B', 1, 1),
            createLineSeries('总成交额', data.amount.total_amount, '#E53935', 1, 1, {
                showSymbol: true,
                symbolSize: 5,
                lineStyle: { width: 2, color: '#E53935' },
                transformer: (value) => value / 10000
            })
        ] : [
            createBarSeries('Level 1', data.amount.level1, '#f5465f', 1, 1),
            createBarSeries('Level 2', data.amount.level2, '#11aac3', 1, 1),
            createBarSeries('Level 3', data.amount.level3, '#ffc107', 1, 1)
        ];

        const scoreSeries = [
            createLineSeries('综合评分', data.scores, '#07bdae', 2, 2, {
                showSymbol: true,
                symbolSize: 5,
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(7, 189, 174, 0.25)' },
                            { offset: 1, color: 'rgba(7, 189, 174, 0.05)' }
                        ]
                    }
                }
            })
        ];

        if (isNewVwapFormat) {
            addLegendValue('收盘价', data.vwap.close_price, (value) => formatFixed(value, 2));
            addLegendValue('综合VWAP', data.vwap.vwap, (value) => formatFixed(value, 2));
            addLegendValue('超大单VWAP', data.vwap.super_large_vwap, (value) => formatFixed(value, 2));
            addLegendValue('大单VWAP', data.vwap.large_vwap, (value) => formatFixed(value, 2));
            addLegendValue('中单VWAP', data.vwap.medium_vwap, (value) => formatFixed(value, 2));
            addLegendValue('小单VWAP', data.vwap.others_vwap, (value) => formatFixed(value, 2));
        } else {
            addLegendValue('Level 1', data.vwap.level1, (value) => formatFixed(value, 2));
            addLegendValue('Level 2', data.vwap.level2, (value) => formatFixed(value, 2));
            addLegendValue('Level 3', data.vwap.level3, (value) => formatFixed(value, 2));
        }

        if (isNewAmountFormat) {
            addLegendValue('超大单', data.amount.super_large_amount, (value) => `${formatWan(value, 0)}万`);
            addLegendValue('大单', data.amount.large_amount, (value) => `${formatWan(value, 0)}万`);
            addLegendValue('中单', data.amount.medium_amount, (value) => `${formatWan(value, 0)}万`);
            addLegendValue('小单', data.amount.others_amount, (value) => `${formatWan(value, 0)}万`);
            addLegendValue('总成交额', data.amount.total_amount, (value) => `${formatWan(value, 0)}万`);
        } else {
            addLegendValue('Level 1', data.amount.level1, (value) => `${formatWan(value, 0)}万`);
            addLegendValue('Level 2', data.amount.level2, (value) => `${formatWan(value, 0)}万`);
            addLegendValue('Level 3', data.amount.level3, (value) => `${formatWan(value, 0)}万`);
        }

        addLegendValue('综合评分', data.scores, (value) => formatFixed(value, 2));

        const allSeries = [...vwapSeries, ...amountSeries, ...scoreSeries];

        const option = {
            animationDuration: 220,
            tooltip: {
                trigger: 'axis',
                confine: true,
                axisPointer: {
                    type: 'cross'
                },
                formatter: (params) => {
                    const rows = Array.isArray(params) ? params.filter(Boolean) : [params];
                    if (!rows.length) {
                        return '';
                    }

                    const lines = [`<div>${rows[0].axisValueLabel || ''}</div>`];
                    rows.forEach((item) => {
                        const value = Array.isArray(item.value) ? item.value[1] : item.value;
                        const text = amountSeriesNames.has(item.seriesName) || item.seriesName === '总成交额'
                            ? `${formatAxisInteger(value)} 万元`
                            : formatFixed(value, 2);
                        lines.push(`${item.marker}${item.seriesName}: ${text}`);
                    });
                    return lines.join('<br>');
                }
            },
            axisPointer: {
                link: [
                    {
                        xAxisIndex: [0, 1, 2]
                    }
                ]
            },
            legend: {
                data: allSeries.map((item) => item.name),
                top: 8,
                itemWidth: 14,
                itemHeight: 8,
                textStyle: { fontSize: 10 },
                formatter: (name) => legendValueMap[name] ? `${name} ${legendValueMap[name]}` : name
            },
            grid: [
                {
                    left: 82,
                    right: 28,
                    top: 72,
                    height: '18%',
                    containLabel: true
                },
                {
                    left: 82,
                    right: 28,
                    top: '39%',
                    height: '18%',
                    containLabel: true
                },
                {
                    left: 82,
                    right: 28,
                    top: '64%',
                    height: '12%',
                    containLabel: true
                }
            ],
            xAxis: [
                {
                    type: 'category',
                    data: dates,
                    boundaryGap: false,
                    axisLabel: { show: false },
                    axisTick: { show: false },
                    axisLine: { show: false },
                    gridIndex: 0
                },
                {
                    type: 'category',
                    data: dates,
                    boundaryGap: true,
                    axisLabel: { show: false },
                    axisTick: { show: false },
                    axisLine: { show: false },
                    gridIndex: 1
                },
                {
                    type: 'category',
                    data: dates,
                    boundaryGap: false,
                    axisLabel: {
                        rotate: 35,
                        fontSize: 9
                    },
                    gridIndex: 2
                }
            ],
            yAxis: [
                {
                    type: 'value',
                    name: '价格(元)',
                    scale: true,
                    nameGap: 14,
                    nameTextStyle: { fontSize: 10 },
                    axisLabel: {
                        fontSize: 10,
                        formatter: (value) => formatFixed(value, 2)
                    },
                    gridIndex: 0
                },
                {
                    type: 'value',
                    name: '成交额(万元)',
                    nameGap: 18,
                    nameTextStyle: { fontSize: 10 },
                    axisLabel: {
                        fontSize: 10,
                        formatter: formatAxisInteger
                    },
                    splitNumber: 4,
                    gridIndex: 1
                },
                {
                    type: 'value',
                    name: '评分',
                    min: 0,
                    nameGap: 14,
                    nameTextStyle: { fontSize: 10 },
                    axisLabel: {
                        fontSize: 10,
                        formatter: (value) => formatFixed(value, 2)
                    },
                    splitNumber: 3,
                    gridIndex: 2
                }
            ],
            dataZoom: [
                {
                    type: 'slider',
                    show: true,
                    height: 16,
                    bottom: 10,
                    start: 0,
                    end: 100,
                    xAxisIndex: [0, 1, 2]
                },
                {
                    type: 'inside',
                    start: 0,
                    end: 100,
                    xAxisIndex: [0, 1, 2]
                }
            ],
            series: allSeries
        };

        this.vwapChart = echarts.init(el);
        this.vwapChart.setOption(option, true);
        this.vwapChart.resize();
    }

    async loadMarketList() {
        try {
            const marketDateSelect = document.getElementById('marketDateSelect');
            const marketSectorSelect = document.getElementById('marketSectorSelect');
            const marketStockCodeInput = document.getElementById('marketStockCodeInput');
            const marketStockNameInput = document.getElementById('marketStockNameInput');
            const minScoreInput = document.getElementById('minScoreInput');
            const maxScoreInput = document.getElementById('maxScoreInput');

            const params = new URLSearchParams();
            params.append('page', this.currentPage);
            params.append('page_size', this.pageSize);
            params.append('sort_by', this.sortBy);
            params.append('sort_order', this.sortOrder);

            if (marketDateSelect && marketDateSelect.value) {
                params.append('date', marketDateSelect.value);
            }
            if (marketSectorSelect && marketSectorSelect.value) {
                params.append('sector', marketSectorSelect.value);
            }
            if (marketStockCodeInput && marketStockCodeInput.value.trim()) {
                params.append('stock_code', marketStockCodeInput.value.trim());
            }
            if (marketStockNameInput && marketStockNameInput.value.trim()) {
                params.append('stock_name', marketStockNameInput.value.trim());
            }
            if (minScoreInput && minScoreInput.value) {
                params.append('min_score', minScoreInput.value);
            }
            if (maxScoreInput && maxScoreInput.value) {
                params.append('max_score', maxScoreInput.value);
            }

            const response = await API.fetch(`/api/l2-analysis/market-list?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.renderMarketList(data);
        } catch (error) {
            this.showError('加载市场列表失败：' + error.message);
            console.error(error);
        }
    }

    renderMarketList(data) {
        const tableBody = document.getElementById('marketListTable');
        if (!tableBody) return;

        const formatDecimal = (value) => {
            if (value === null || value === undefined || value === '') {
                return '-';
            }
            const number = Number(value);
            return Number.isFinite(number) ? number.toFixed(2) : '-';
        };

        if (!data.data || data.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">暂无数据</td></tr>';
            return;
        }

        let html = '';
        data.data.forEach(item => {
            const adviceClass = this.getAdviceClass(item.operation_advice);
            html += `
                <tr>
                    <td><strong class="stock-code">${item.stock_code}</strong></td>
                    <td>${item.stock_name || '-'}</td>
                    <td>${item.sector_name || '-'}</td>
                    <td class="market-ratio-cell">${formatDecimal(item.price_close_vwap_ratio)}</td>
                    <td class="market-ratio-cell">${formatDecimal(item.large_total_amount_ratio)}</td>
                    <td><span class="badge ${this.getScoreBadgeClass(item.score)}">${formatDecimal(item.score)}</span></td>
                    <td><span class="badge ${adviceClass}">${item.operation_advice || '-'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-link p-0 view-chart-btn" data-stock-code="${item.stock_code}" data-stock-name="${item.stock_name}">
                            <i class="bi bi-graph-up"></i> 详情
                        </button>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;

        // 绑定详情按钮点击事件
        tableBody.querySelectorAll('.view-chart-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const stockCode = btn.getAttribute('data-stock-code');
                const stockName = btn.getAttribute('data-stock-name');
                this.loadStockHistory(stockCode, stockName);
            });
        });

        tableBody.querySelectorAll('tr').forEach((row) => {
            row.addEventListener('dblclick', (event) => {
                if (event.target.closest('.view-chart-btn')) {
                    return;
                }

                const sectorCell = row.children[2];
                const sectorName = sectorCell ? sectorCell.textContent.trim() : '';
                if (!sectorName || sectorName === '-') {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                this.applySectorFilter(sectorName);

                if (window.Events && typeof window.Events.highlightSectorCell === 'function') {
                    window.Events.highlightSectorCell(sectorCell);
                } else {
                    sectorCell.classList.add('sector-highlight');
                    setTimeout(() => sectorCell.classList.remove('sector-highlight'), 3000);
                }
            });
        });

        this.renderPagination(data);
    }

    getScoreBadgeClass(score) {
        if (score === null || score === undefined) return 'bg-secondary';
        if (score >= 80) return 'bg-success';
        if (score >= 60) return 'bg-primary';
        if (score >= 40) return 'bg-warning';
        return 'bg-danger';
    }

    renderPagination(data) {
        const nav = document.getElementById('paginationNav');
        if (!nav) return;

        const totalPages = data.total_pages || 1;
        const currentPage = data.page || 1;

        let html = '<ul class="pagination justify-content-center pagination-sm">';

        // 上一页
        html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">上一页</a>
        </li>`;

        // 页码
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            html += '<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>';
            if (startPage > 2) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        // 下一页
        html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>
        </li>`;

        html += '</ul>';
        nav.innerHTML = html;

        // 绑定分页点击事件
        nav.querySelectorAll('.page-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const page = parseInt(link.getAttribute('data-page'));
                if (page >= 1 && page <= totalPages) {
                    this.currentPage = page;
                    this.loadMarketList();
                }
            });
        });
    }

    renderStockChartsPopup(data) {
        if (!this.echartsLoaded) {
            console.error('ECharts not loaded');
            return;
        }

        const el = document.getElementById('vwapChart');
        if (!el) {
            console.error('Chart container not found');
            return;
        }

        const dates = Array.isArray(data?.dates) ? data.dates : [];
        if (!dates.length) {
            this.showError('\u6682\u65e0\u53ef\u5c55\u793a\u7684\u5386\u53f2\u6570\u636e');
            return;
        }

        const existingChart = echarts.getInstanceByDom(el);
        if (existingChart) {
            existingChart.dispose();
        }

        if (this.vwapChart) {
            try {
                this.vwapChart.dispose();
            } catch (error) {
                console.warn('Failed to dispose old chart:', error);
            }
            this.vwapChart = null;
        }

        const useSideLegends = window.innerWidth >= 992;
        const textMap = {
            closePrice: '\u6536\u76d8\u4ef7',
            vwap: 'VWAP',
            superLargeVwap: '\u8d85\u5927\u5355VWAP',
            largeVwap: '\u5927\u5355VWAP',
            mediumVwap: '\u4e2d\u5355VWAP',
            othersVwap: '\u5c0f\u5355VWAP',
            superLargeAmount: '\u8d85\u5927\u5355',
            largeAmount: '\u5927\u5355',
            mediumAmount: '\u4e2d\u5355',
            othersAmount: '\u5c0f\u5355',
            totalAmount: '\u603b\u6210\u4ea4\u989d',
            score: '\u7efc\u5408\u8bc4\u5206',
            level1Vwap: 'Level 1 VWAP',
            level2Vwap: 'Level 2 VWAP',
            level3Vwap: 'Level 3 VWAP',
            level1Amount: 'Level 1 \u6210\u4ea4\u989d',
            level2Amount: 'Level 2 \u6210\u4ea4\u989d',
            level3Amount: 'Level 3 \u6210\u4ea4\u989d',
            priceAxis: '\u4ef7\u683c',
            amountAxis: '\u6210\u4ea4\u989d(\u4e07\u5143)',
            scoreAxis: '\u8bc4\u5206',
            amountUnit: '\u4e07\u5143',
            tooltipAmount: '\u6210\u4ea4\u989d',
            tooltipScore: '\u8bc4\u5206'
        };

        const formatFixed = (value, decimals = 2) => {
            const number = Number(value);
            if (!Number.isFinite(number)) {
                return '--';
            }
            return number.toFixed(decimals);
        };

        const formatWan = (value, decimals = 0) => {
            const number = Number(value);
            if (!Number.isFinite(number)) {
                return '--';
            }

            return (number / 10000).toLocaleString('zh-CN', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        };

        const formatAxisInteger = (value) => {
            const number = Number(value);
            if (!Number.isFinite(number)) {
                return '';
            }
            return Math.round(number).toLocaleString('zh-CN');
        };

        const normalizeValues = (values, transformer = (value) => value) => {
            if (!Array.isArray(values)) {
                return dates.map(() => null);
            }

            return dates.map((_, index) => {
                const number = Number(values[index]);
                if (!Number.isFinite(number)) {
                    return null;
                }
                return transformer(number);
            });
        };

        const getLastFiniteValue = (values) => {
            if (!Array.isArray(values)) {
                return null;
            }

            for (let index = values.length - 1; index >= 0; index -= 1) {
                const number = Number(values[index]);
                if (Number.isFinite(number)) {
                    return number;
                }
            }

            return null;
        };

        const legendValueMap = {};
        const addLegendValue = (name, values, formatter) => {
            const latestValue = getLastFiniteValue(values);
            if (latestValue === null) {
                return;
            }
            legendValueMap[name] = formatter(latestValue);
        };

        const createLineSeries = (name, values, color, xAxisIndex, yAxisIndex, extra = {}) => ({
            name,
            type: 'line',
            data: normalizeValues(values, extra.transformer || ((value) => value)),
            smooth: true,
            connectNulls: false,
            showSymbol: extra.showSymbol ?? false,
            symbol: extra.symbol || 'circle',
            symbolSize: extra.symbolSize || 5,
            lineStyle: extra.lineStyle || { width: 2, color },
            itemStyle: extra.itemStyle || { color },
            areaStyle: extra.areaStyle,
            z: extra.z,
            xAxisIndex,
            yAxisIndex
        });

        const createBarSeries = (name, values, color, xAxisIndex, yAxisIndex) => ({
            name,
            type: 'bar',
            stack: 'amount',
            barMaxWidth: 18,
            data: normalizeValues(values, (value) => value / 10000),
            itemStyle: { color },
            xAxisIndex,
            yAxisIndex
        });

        const isNewVwapFormat = Boolean(data.vwap && (data.vwap.vwap !== undefined || data.vwap.super_large_vwap !== undefined));
        const isNewAmountFormat = Boolean(data.amount && (data.amount.total_amount !== undefined || data.amount.super_large_amount !== undefined));

        const vwapSeries = isNewVwapFormat ? [
            createLineSeries(textMap.closePrice, data.vwap.close_price, '#111111', 0, 0, {
                showSymbol: true,
                symbolSize: 4,
                lineStyle: { width: 2, color: '#111111', type: 'dashed' }
            }),
            createLineSeries(textMap.vwap, data.vwap.vwap, '#E53935', 0, 0, {
                showSymbol: true,
                symbolSize: 5,
                lineStyle: { width: 3, color: '#E53935' }
            }),
            createLineSeries(textMap.superLargeVwap, data.vwap.super_large_vwap, '#9C27B0', 0, 0, {
                showSymbol: true,
                symbol: 'diamond',
                symbolSize: 4
            }),
            createLineSeries(textMap.largeVwap, data.vwap.large_vwap, '#FF9800', 0, 0, {
                showSymbol: true,
                symbol: 'triangle',
                symbolSize: 4
            }),
            createLineSeries(textMap.mediumVwap, data.vwap.medium_vwap, '#00BFA5', 0, 0, {
                showSymbol: true,
                symbolSize: 4
            }),
            createLineSeries(textMap.othersVwap, data.vwap.others_vwap, '#607D8B', 0, 0, {
                showSymbol: true,
                symbol: 'rect',
                symbolSize: 4
            })
        ] : [
            createLineSeries(textMap.level1Vwap, data.vwap.level1, '#f5465f', 0, 0, {
                showSymbol: true,
                symbolSize: 4
            }),
            createLineSeries(textMap.level2Vwap, data.vwap.level2, '#11aac3', 0, 0, {
                showSymbol: true,
                symbolSize: 4
            }),
            createLineSeries(textMap.level3Vwap, data.vwap.level3, '#ffc107', 0, 0, {
                showSymbol: true,
                symbolSize: 4
            })
        ];

        const amountSeries = isNewAmountFormat ? [
            createBarSeries(textMap.superLargeAmount, data.amount.super_large_amount, '#9C27B0', 1, 1),
            createBarSeries(textMap.largeAmount, data.amount.large_amount, '#FF9800', 1, 1),
            createBarSeries(textMap.mediumAmount, data.amount.medium_amount, '#00BFA5', 1, 1),
            createBarSeries(textMap.othersAmount, data.amount.others_amount, '#607D8B', 1, 1),
            createLineSeries(textMap.totalAmount, data.amount.total_amount, '#E53935', 1, 1, {
                showSymbol: true,
                symbolSize: 5,
                lineStyle: { width: 2, color: '#E53935' },
                transformer: (value) => value / 10000,
                z: 3
            })
        ] : [
            createBarSeries(textMap.level1Amount, data.amount.level1, '#f5465f', 1, 1),
            createBarSeries(textMap.level2Amount, data.amount.level2, '#11aac3', 1, 1),
            createBarSeries(textMap.level3Amount, data.amount.level3, '#ffc107', 1, 1)
        ];

        const scoreSeries = [
            createLineSeries(textMap.score, data.scores, '#07bdae', 2, 2, {
                showSymbol: true,
                symbolSize: 5,
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(7, 189, 174, 0.25)' },
                            { offset: 1, color: 'rgba(7, 189, 174, 0.05)' }
                        ]
                    }
                }
            })
        ];

        vwapSeries.forEach((series) => addLegendValue(series.name, series.data, (value) => formatFixed(value, 2)));

        if (isNewAmountFormat) {
            addLegendValue(textMap.superLargeAmount, data.amount.super_large_amount, (value) => `${formatWan(value, 0)}${textMap.amountUnit}`);
            addLegendValue(textMap.largeAmount, data.amount.large_amount, (value) => `${formatWan(value, 0)}${textMap.amountUnit}`);
            addLegendValue(textMap.mediumAmount, data.amount.medium_amount, (value) => `${formatWan(value, 0)}${textMap.amountUnit}`);
            addLegendValue(textMap.othersAmount, data.amount.others_amount, (value) => `${formatWan(value, 0)}${textMap.amountUnit}`);
            addLegendValue(textMap.totalAmount, data.amount.total_amount, (value) => `${formatWan(value, 0)}${textMap.amountUnit}`);
        } else {
            addLegendValue(textMap.level1Amount, data.amount.level1, (value) => `${formatWan(value, 0)}${textMap.amountUnit}`);
            addLegendValue(textMap.level2Amount, data.amount.level2, (value) => `${formatWan(value, 0)}${textMap.amountUnit}`);
            addLegendValue(textMap.level3Amount, data.amount.level3, (value) => `${formatWan(value, 0)}${textMap.amountUnit}`);
        }

        const allSeries = [...vwapSeries, ...amountSeries, ...scoreSeries];
        const vwapLegendData = vwapSeries.map((series) => series.name);
        const amountLegendData = amountSeries.map((series) => series.name);
        const seriesGroupByIndex = new Map();

        vwapSeries.forEach((_, index) => {
            seriesGroupByIndex.set(index, 'vwap');
        });
        amountSeries.forEach((_, index) => {
            seriesGroupByIndex.set(vwapSeries.length + index, 'amount');
        });
        scoreSeries.forEach((_, index) => {
            seriesGroupByIndex.set(vwapSeries.length + amountSeries.length + index, 'score');
        });

        const getTooltipValue = (item) => {
            if (!item) {
                return null;
            }
            return Array.isArray(item.value) ? item.value[1] : item.value;
        };

        const renderTooltipSection = (title, items, formatter, bordered = false) => {
            if (!items.length) {
                return '';
            }

            const rows = items.map((item) => {
                const value = formatter(getTooltipValue(item));
                return `
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px;">
                        <span style="display:inline-flex;align-items:center;gap:6px;min-width:0;">
                            ${item.marker}
                            <span>${item.seriesName}</span>
                        </span>
                        <span style="font-weight:600;white-space:nowrap;">${value}</span>
                    </div>
                `;
            }).join('');

            return `
                <div style="${bordered ? 'margin-top:8px;padding-top:8px;border-top:1px solid rgba(15, 23, 42, 0.12);' : 'margin-top:6px;'}">
                    <div style="font-size:11px;font-weight:700;color:#475569;letter-spacing:0.02em;">${title}</div>
                    ${rows}
                </div>
            `;
        };

        const legendFormatter = (name) => legendValueMap[name] ? `${name} ${legendValueMap[name]}` : name;

        const option = {
            animationDuration: 220,
            tooltip: {
                trigger: 'axis',
                confine: true,
                extraCssText: 'max-width: 340px; white-space: normal;',
                axisPointer: {
                    type: 'cross'
                },
                formatter: (params) => {
                    const rows = Array.isArray(params) ? params.filter(Boolean) : [params];
                    if (!rows.length) {
                        return '';
                    }

                    const vwapRows = rows.filter((item) => seriesGroupByIndex.get(item.seriesIndex) === 'vwap');
                    const amountRows = rows.filter((item) => seriesGroupByIndex.get(item.seriesIndex) === 'amount');
                    const scoreRows = rows.filter((item) => seriesGroupByIndex.get(item.seriesIndex) === 'score');

                    const sections = [
                        `<div style="font-size:12px;font-weight:700;margin-bottom:4px;">${rows[0].axisValueLabel || ''}</div>`,
                        renderTooltipSection('VWAP', vwapRows, (value) => formatFixed(value, 2)),
                        renderTooltipSection(textMap.tooltipAmount, amountRows, (value) => `${formatAxisInteger(value)} ${textMap.amountUnit}`, true),
                        renderTooltipSection(textMap.tooltipScore, scoreRows, (value) => formatFixed(value, 2), true)
                    ].filter(Boolean);

                    return sections.join('');
                }
            },
            axisPointer: {
                link: [
                    {
                        xAxisIndex: [0, 1, 2]
                    }
                ]
            },
            legend: useSideLegends ? [
                {
                    data: vwapLegendData,
                    orient: 'vertical',
                    left: 12,
                    top: 52,
                    width: 185,
                    itemWidth: 14,
                    itemHeight: 8,
                    itemGap: 10,
                    textStyle: {
                        fontSize: 10,
                        lineHeight: 16
                    },
                    formatter: legendFormatter
                },
                {
                    data: amountLegendData,
                    orient: 'vertical',
                    right: 12,
                    top: 52,
                    width: 185,
                    itemWidth: 14,
                    itemHeight: 8,
                    itemGap: 10,
                    textStyle: {
                        fontSize: 10,
                        lineHeight: 16
                    },
                    formatter: legendFormatter
                }
            ] : [
                {
                    data: vwapLegendData,
                    orient: 'horizontal',
                    top: 8,
                    left: 8,
                    right: '50%',
                    itemWidth: 14,
                    itemHeight: 8,
                    itemGap: 8,
                    textStyle: {
                        fontSize: 10
                    },
                    formatter: legendFormatter
                },
                {
                    data: amountLegendData,
                    orient: 'horizontal',
                    top: 32,
                    left: 8,
                    right: 8,
                    itemWidth: 14,
                    itemHeight: 8,
                    itemGap: 8,
                    textStyle: {
                        fontSize: 10
                    },
                    formatter: legendFormatter
                }
            ],
            grid: useSideLegends ? [
                {
                    left: 218,
                    right: 218,
                    top: 24,
                    height: '26%',
                    containLabel: true
                },
                {
                    left: 218,
                    right: 218,
                    top: '38%',
                    height: '22%',
                    containLabel: true
                },
                {
                    left: 218,
                    right: 218,
                    top: '67%',
                    height: '15%',
                    containLabel: true
                }
            ] : [
                {
                    left: 74,
                    right: 38,
                    top: 78,
                    height: '22%',
                    containLabel: true
                },
                {
                    left: 74,
                    right: 38,
                    top: '41%',
                    height: '20%',
                    containLabel: true
                },
                {
                    left: 74,
                    right: 38,
                    top: '68%',
                    height: '14%',
                    containLabel: true
                }
            ],
            xAxis: [
                {
                    type: 'category',
                    data: dates,
                    boundaryGap: false,
                    axisLabel: { show: false },
                    axisTick: { show: false },
                    axisLine: { show: false },
                    gridIndex: 0
                },
                {
                    type: 'category',
                    data: dates,
                    boundaryGap: true,
                    axisLabel: { show: false },
                    axisTick: { show: false },
                    axisLine: { show: false },
                    gridIndex: 1
                },
                {
                    type: 'category',
                    data: dates,
                    boundaryGap: false,
                    axisLabel: {
                        interval: 0,
                        rotate: useSideLegends ? 0 : 30,
                        fontSize: 9
                    },
                    gridIndex: 2
                }
            ],
            yAxis: [
                {
                    type: 'value',
                    name: textMap.priceAxis,
                    scale: true,
                    nameGap: 14,
                    nameTextStyle: { fontSize: 10 },
                    axisLabel: {
                        fontSize: 10,
                        formatter: (value) => formatFixed(value, 2)
                    },
                    splitNumber: 4,
                    gridIndex: 0
                },
                {
                    type: 'value',
                    name: textMap.amountAxis,
                    nameGap: 18,
                    nameTextStyle: { fontSize: 10 },
                    axisLabel: {
                        fontSize: 9,
                        margin: 10,
                        formatter: formatAxisInteger
                    },
                    splitNumber: 4,
                    gridIndex: 1
                },
                {
                    type: 'value',
                    name: textMap.scoreAxis,
                    min: 0,
                    nameGap: 14,
                    nameTextStyle: { fontSize: 10 },
                    axisLabel: {
                        fontSize: 10,
                        formatter: (value) => formatFixed(value, 2)
                    },
                    splitNumber: 3,
                    gridIndex: 2
                }
            ],
            series: allSeries
        };

        this.vwapChart = echarts.init(el);
        this.vwapChart.setOption(option, true);
        this.vwapChart.resize();
    }

    async updateLastUpdateTime() {
        try {
            const response = await API.fetch('/api/l2-analysis/sync-status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const status = await response.json();
            const timeEl = document.getElementById('lastUpdateTime');
            if (timeEl && status.last_sync_time) {
                const date = new Date(status.last_sync_time);
                timeEl.innerHTML = `<i class="bi bi-clock"></i> 更新时间：${date.toLocaleString('zh-CN')}`;
            }
        } catch (error) {
            console.error('获取更新时间失败:', error);
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
        if (this.vwapChart) {
            this.vwapChart.resize();
        }
        if (this.amountChart) {
            this.amountChart.resize();
        }
        if (this.scoreChart) {
            this.scoreChart.resize();
        }
    }

    handleResize() {
        this.resizeChart();

        const nextMatrixLayoutMode = this.getMatrixLayoutMode();
        if (this.topStocksMatrixData.length && nextMatrixLayoutMode !== this.matrixLayoutMode) {
            this.renderTopStocksMatrix(this.topStocksMatrixData);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (typeof echarts === 'undefined') {
        console.error('ECharts library not loaded');
    } else if (!window.l2Analysis) {
        window.l2Analysis = new L2Analysis();
    }
});

window.addEventListener('resize', () => {
    if (window.l2Analysis) {
        window.l2Analysis.handleResize();
    }
});
