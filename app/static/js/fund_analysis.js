/**
 * 基金分析模块 - ETF聚类选股
 */
class FundAnalysis {
    constructor() {
        this.currentData = null;
        this.isSyncing = false;
        this.init();
    }

    async init() {
        this.initSyncButton();
        await this.loadClusterData();
        await this.loadSyncStatus();
    }

    /**
     * 初始化同步按钮
     */
    initSyncButton() {
        const syncBtn = document.getElementById('syncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.syncClusterData();
            });
        }
    }

    /**
     * 同步ETF聚类选股数据
     */
    async syncClusterData() {
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
            const response = await API.fetch('/api/fund-analysis/sync', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showSuccessToast(`同步成功！共同步 ${result.record_count || 0} 条记录`);
                // 重新加载数据
                await this.loadClusterData();
                // 更新同步状态
                await this.loadSyncStatus();
            } else {
                this.showErrorToast('同步失败：' + (result.error || '未知错误'));
            }
        } catch (error) {
            this.showErrorToast('同步失败：' + error.message);
            console.error('同步ETF聚类选股数据失败:', error);
        } finally {
            this.isSyncing = false;
            syncBtn.disabled = false;
            syncBtnIcon.classList.remove('spin-icon');
            syncBtnText.textContent = '同步数据';
        }
    }

    /**
     * 加载同步状态
     */
    async loadSyncStatus() {
        try {
            const response = await API.getSyncStatus();
            const syncStatus = response.sync || response;
            this.updateSyncStatusDisplay(syncStatus.etf_cluster);
        } catch (error) {
            console.error('获取同步状态失败:', error);
        }
    }

    /**
     * 更新同步状态显示
     */
    updateSyncStatusDisplay(status) {
        const timeEl = document.getElementById('lastUpdateTime');
        if (!timeEl || !status) return;

        if (status.last_sync_time) {
            const lastSync = new Date(status.last_sync_time);
            const now = new Date();
            const diffMs = now - lastSync;
            const diffMins = Math.floor(diffMs / 60000);

            let timeText;
            if (diffMins < 1) {
                timeText = '刚刚';
            } else if (diffMins < 60) {
                timeText = `${diffMins} 分钟前`;
            } else if (diffMins < 1440) {
                timeText = `${Math.floor(diffMins / 60)} 小时前`;
            } else {
                timeText = lastSync.toLocaleDateString('zh-CN');
            }

            timeEl.innerHTML = `<i class="bi bi-clock"></i> 同步时间：${timeText}`;
        } else {
            timeEl.innerHTML = '<i class="bi bi-clock"></i> 暂无数据';
        }
    }

    /**
     * 显示成功提示
     */
    showSuccessToast(message) {
        this.showToast(message, 'success');
    }

    /**
     * 显示错误提示
     */
    showErrorToast(message) {
        this.showToast(message, 'error');
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'success') {
        // 移除现有的 toast
        const existingToast = document.querySelector('.sync-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // 创建 toast 元素
        const toast = document.createElement('div');
        toast.className = `sync-toast sync-toast-${type}`;
        const icon = type === 'success' ? '✓' : '⚠';
        toast.innerHTML = `
            <div class="sync-toast-content">
                <span class="sync-toast-icon">${icon}</span>
                <div class="sync-toast-text">${message}</div>
                <button class="sync-toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // 显示提示
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // 3秒后自动消失
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    /**
     * 加载ETF聚类选股数据
     */
    async loadClusterData() {
        try {
            const response = await API.fetch('/api/fund-analysis/etf-clusters');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.currentData = data;
            this.renderClusterCards(data);
            this.updateLastUpdateTime(data.update_date);

        } catch (error) {
            console.error('加载ETF聚类选股数据失败:', error);
            this.showError('加载数据失败：' + error.message);
            document.getElementById('loadingMessage').innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-exclamation-circle" style="font-size: 48px;"></i>
                    <p class="mt-3">加载数据失败，请刷新页面重试</p>
                </div>
            `;
        }
    }

    /**
     * 渲染聚类卡片
     */
    renderClusterCards(data) {
        const container = document.getElementById('clusterCards');

        if (!data || !data.clusters || data.clusters.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted">
                    <i class="bi bi-inbox" style="font-size: 48px;"></i>
                    <p class="mt-3">暂无聚类选股数据</p>
                </div>
            `;
            return;
        }

        // 按聚类名称排序
        const sortedClusters = data.clusters.sort((a, b) =>
            a.cluster_name.localeCompare(b.cluster_name, 'zh-CN')
        );

        container.innerHTML = sortedClusters.map(cluster => {
            const rank1Fund = cluster.funds.find(f => f.rank === 1);
            const otherFunds = cluster.funds.filter(f => f.rank > 1);

            return `
                <div class="card cluster-card">
                    <div class="cluster-card-header">
                        <span class="cluster-name">${cluster.cluster_name}</span>
                        <span class="cluster-badge">🎯</span>
                    </div>

                    <!-- Rank 1 基金 - 居中突出显示 -->
                    <div class="rank1-container">
                        ${rank1Fund ? `
                            <div class="rank1-fund">
                                <div class="rank1-icon">🥇</div>
                                <div class="rank1-code">${rank1Fund.fund_code || '-'}</div>
                                <div class="rank1-name">${rank1Fund.fund_name || '-'}</div>
                                ${rank1Fund.score ? `
                                    <div class="rank1-score">${rank1Fund.score.toFixed(2)}</div>
                                ` : ''}
                            </div>
                        ` : '<div class="text-muted text-center">暂无数据</div>'}
                    </div>

                    <!-- 其他基金 - 纵向列表 -->
                    <div class="other-funds-list">
                        ${otherFunds.map(fund => `
                            <div class="other-fund-item">
                                <span class="fund-rank">${fund.rank}</span>
                                <span class="fund-info">
                                    <strong>${fund.fund_code || '-'}</strong>
                                    <span class="fund-name">${fund.fund_name || '-'}</span>
                                </span>
                                ${fund.score ? `<span class="fund-score">${fund.score.toFixed(2)}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 更新最后更新时间显示
     */
    updateLastUpdateTime(updateDate) {
        const timeEl = document.getElementById('lastUpdateTime');
        if (!timeEl) return;

        if (updateDate) {
            const date = new Date(updateDate);
            timeEl.innerHTML = `<i class="bi bi-clock"></i> 更新日期：${date.toLocaleDateString('zh-CN')}`;
        } else {
            timeEl.innerHTML = '<i class="bi bi-clock"></i> 暂无数据';
        }
    }

    /**
     * 显示错误信息
     */
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
}

// 初始化
window.addEventListener('DOMContentLoaded', () => {
    window.fundAnalysis = new FundAnalysis();
});
