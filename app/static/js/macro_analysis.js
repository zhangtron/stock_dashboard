class MacroAnalysis {
    constructor() {
        this.charts = {};
        this.echartsLoaded = false;
        this.init();
    }

    async init() {
        this.checkECharts();
        try {
            await this.loadData();
            this.renderCards();
            this.renderCharts();
        } catch (error) {
            this.showError('加载宏观数据失败：' + error.message);
            console.error(error);
        }
    }

    checkECharts() {
        if (typeof echarts === 'undefined') {
            console.error('ECharts library not loaded');
            return;
        }
        this.echartsLoaded = true;
    }

    async loadData() {
        const response = await API.fetch('/api/macro-analysis');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('Macro API response:', data);
        
        if (data.error) {
            throw new Error(data.error || data.message);
        }

        // 原有字段
        this.monetaryCycle = data.monetary_cycle;
        this.creditCycle = data.credit_cycle;
        this.marketCapBias = data.market_cap_bias;
        this.calcTime = data.calc_time;
        this.rawData = data.raw_data || {};
        
        // 新增字段
        this.monetaryStatus = data.monetary_status;
        this.creditStatus = data.credit_status;
        this.combination = data.combination;
        this.investmentStrategy = data.investment_strategy;
        this.assetAllocation = data.asset_allocation;
    }

    renderCards() {
        const monetaryCard = document.getElementById('monetaryCycleCard');
        const creditCard = document.getElementById('creditCycleCard');
        const strategyCard = document.getElementById('investmentStrategyCard');
        const allocationCard = document.getElementById('assetAllocationCard');
        const timeEl = document.getElementById('lastUpdateTime');

        if (monetaryCard && this.monetaryCycle) {
            monetaryCard.innerHTML = `
                <h4 class="card-title">${this.monetaryCycle}</h4>
                <p class="card-text small text-muted">当前货币周期状态</p>
            `;
        }

        if (creditCard && this.creditCycle) {
            creditCard.innerHTML = `
                <h4 class="card-title">${this.creditCycle}</h4>
                <p class="card-text small text-muted">当前信用周期状态</p>
            `;
        }

        if (strategyCard && this.investmentStrategy) {
            strategyCard.innerHTML = `
                <h4 class="card-title">${this.investmentStrategy}</h4>
                <p class="card-text small text-muted">${this.combination || ''}</p>
            `;
        }

        if (allocationCard && this.assetAllocation) {
            allocationCard.innerHTML = `
                <h4 class="card-title">${this.assetAllocation}</h4>
                <p class="card-text small text-muted">资产配置建议</p>
            `;
        }

        if (timeEl && this.calcTime) {
            const date = new Date(this.calcTime);
            timeEl.innerHTML = `<i class="bi bi-clock"></i> 更新时间：${date.toLocaleString('zh-CN')}`;
        }

        // 移除骨架屏效果
        document.querySelectorAll('.card-content p.text-muted').forEach(p => {
            if (p.textContent === '加载中...') {
                p.style.display = 'none';
            }
        });
    }

    renderCharts() {
        if (!this.echartsLoaded) {
            console.error('ECharts not loaded, skipping chart rendering');
            return;
        }

        this.renderM1Chart();
        this.renderGDPChart();
        this.renderPPIChart();
        this.renderLoanChart();
        this.renderBond1YChart();
        this.renderBond10YChart();
    }

    renderM1Chart() {
        const el = document.getElementById('m1Chart');
        if (!el) return;
        
        const chart = echarts.init(el);
        const data = this.rawData.m1_data || [];

        chart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: data.map(d => d.date), axisLabel: { rotate: 45 } },
            yAxis: { type: 'value', name: '%' },
            series: [{
                name: 'M1同比',
                type: 'line',
                data: data.map(d => d.value),
                smooth: true,
                lineStyle: { width: 2 },
                itemStyle: { color: '#36A2EB' }
            }]
        });

        this.charts.m1 = chart;
    }

    renderGDPChart() {
        const el = document.getElementById('gdpChart');
        if (!el) return;
        
        const chart = echarts.init(el);
        const data = this.rawData.gdp_data || [];

        chart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: data.map(d => d.date) },
            yAxis: { type: 'value', name: '%' },
            series: [{
                name: 'GDP增速',
                type: 'line',
                data: data.map(d => d.value),
                smooth: true,
                lineStyle: { width: 2 },
                itemStyle: { color: '#FF6384' }
            }]
        });

        this.charts.gdp = chart;
    }

    renderPPIChart() {
        const el = document.getElementById('ppiChart');
        if (!el) return;
        
        const chart = echarts.init(el);
        const data = this.rawData.ppi_data || [];

        chart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: data.map(d => d.date) },
            yAxis: { type: 'value', name: '%' },
            series: [{
                name: 'PPI同比',
                type: 'line',
                data: data.map(d => d.value),
                smooth: true,
                lineStyle: { width: 2 },
                itemStyle: { color: '#FFCE56' }
            }]
        });

        this.charts.ppi = chart;
    }

    renderLoanChart() {
        const el = document.getElementById('loanChart');
        if (!el) return;
        
        const chart = echarts.init(el);
        const data = this.rawData.loan_data || [];

        chart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: data.map(d => d.date), axisLabel: { rotate: 45 } },
            yAxis: { type: 'value', name: '%' },
            series: [{
                name: '新增贷款同比',
                type: 'line',
                data: data.map(d => d.value),
                smooth: true,
                lineStyle: { width: 2 },
                itemStyle: { color: '#4BC0C0' }
            }]
        });

        this.charts.loan = chart;
    }

    renderBond1YChart() {
        const el = document.getElementById('bond1yChart');
        if (!el) return;
        
        const chart = echarts.init(el);
        const data = this.rawData.bond_1y || [];

        const dates = data.map(d => d.date);
        const values = data.map(d => d.value);
        const ma3m = data.map(d => d.ma_3m);
        const ma6m = data.map(d => d.ma_6m);

        chart.setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: ['1年期', '3个月均线', '6个月均线'] },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: dates },
            yAxis: { type: 'value', name: '%' },
            series: [
                {
                    name: '1年期',
                    type: 'line',
                    data: values,
                    smooth: true,
                    lineStyle: { width: 2 },
                    itemStyle: { color: '#9966FF' }
                },
                {
                    name: '3个月均线',
                    type: 'line',
                    data: ma3m,
                    smooth: true,
                    lineStyle: { type: 'dashed', width: 1.5 },
                    itemStyle: { color: '#FF9F40' }
                },
                {
                    name: '6个月均线',
                    type: 'line',
                    data: ma6m,
                    smooth: true,
                    lineStyle: { type: 'dashed', width: 1.5 },
                    itemStyle: { color: '#FF6384' }
                }
            ]
        });

        this.charts.bond1y = chart;
    }

    renderBond10YChart() {
        const el = document.getElementById('bond10yChart');
        if (!el) return;
        
        const chart = echarts.init(el);
        const data = this.rawData.bond_10y || [];

        const dates = data.map(d => d.date);
        const values = data.map(d => d.value);
        const ma3m = data.map(d => d.ma_3m);
        const ma6m = data.map(d => d.ma_6m);

        chart.setOption({
            tooltip: { trigger: 'axis' },
            legend: { data: ['10年期', '3个月均线', '6个月均线'] },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: dates },
            yAxis: { type: 'value', name: '%' },
            series: [
                {
                    name: '10年期',
                    type: 'line',
                    data: values,
                    smooth: true,
                    lineStyle: { width: 2 },
                    itemStyle: { color: '#36A2EB' }
                },
                {
                    name: '3个月均线',
                    type: 'line',
                    data: ma3m,
                    smooth: true,
                    lineStyle: { type: 'dashed', width: 1.5 },
                    itemStyle: { color: '#FF9F40' }
                },
                {
                    name: '6个月均线',
                    type: 'line',
                    data: ma6m,
                    smooth: true,
                    lineStyle: { type: 'dashed', width: 1.5 },
                    itemStyle: { color: '#FF6384' }
                }
            ]
        });

        this.charts.bond10y = chart;
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

    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (typeof echarts === 'undefined') {
        console.error('ECharts library not loaded');
    } else {
        window.macroAnalysis = new MacroAnalysis();
    }
});

window.addEventListener('resize', () => {
    if (window.macroAnalysis) {
        window.macroAnalysis.resizeCharts();
    }
});
