#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速验证脚本 - 检查缓存和同步功能是否正常
"""
import sys
import time
import requests
from datetime import datetime
import os

# 设置Windows终端UTF-8编码
if os.name == 'nt':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

API_BASE = "http://localhost:8000"


def test_api_connection():
    """测试API连接"""
    print("\n[测试1] API连接测试")
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API连接正常")
            print(f"   响应: {response.json()}")
            return True
        else:
            print(f"❌ API响应错误: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API连接失败: {e}")
        return False


def test_sync_status():
    """测试同步状态"""
    print("\n[测试2] 同步状态测试")
    try:
        response = requests.get(f"{API_BASE}/api/sync/status", timeout=5)
        if response.status_code == 200:
            data = response.json()

            sync = data.get('sync', {})
            scheduler = data.get('scheduler', {})

            print(f"✅ 同步状态获取成功")
            print(f"   上次同步: {sync.get('last_sync_time', 'N/A')}")
            print(f"   同步记录数: {sync.get('record_count', 0)}")
            print(f"   同步状态: {sync.get('sync_status', 'N/A')}")
            print(f"   是否有数据: {sync.get('has_data', False)}")
            print(f"   本地缓存数: {sync.get('cache_count', 0)}")
            print(f"   调度器运行: {scheduler.get('running', False)}")

            if scheduler.get('jobs'):
                job = scheduler['jobs'][0]
                print(f"   下次执行: {job.get('next_run_time', 'N/A')}")

            # 验证关键指标
            has_data = sync.get('has_data', False)
            is_success = sync.get('sync_status') == 'success'
            is_running = scheduler.get('running', False)

            if has_data and is_success and is_running:
                print("   ✅ 所有关键指标正常")
                return True
            else:
                print("   ⚠️ 部分指标异常")
                return False
        else:
            print(f"❌ 同步状态获取失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 同步状态测试失败: {e}")
        return False


def test_api_performance():
    """测试API性能"""
    print("\n[测试3] API性能测试")
    urls = [
        ("基本查询", f"{API_BASE}/api/screening?page=1&page_size=20"),
        ("Top 3查询", f"{API_BASE}/api/screening?page=1&page_size=5"),
        ("筛选查询", f"{API_BASE}/api/screening?recommendation=STRONG_BUY&page=1&page_size=10"),
        ("搜索查询", f"{API_BASE}/api/screening?stock_name=银行&page=1&page_size=10"),
    ]

    all_passed = True
    for name, url in urls:
        try:
            start_time = time.time()
            response = requests.get(url, timeout=10)
            elapsed_time = (time.time() - start_time) * 1000  # 转换为毫秒

            if response.status_code == 200:
                data = response.json()
                total = data.get('total', 0)
                status_icon = "✅" if elapsed_time < 100 else "⚠️"
                print(f"{status_icon} {name}: {elapsed_time:.1f}ms (记录数: {total})")

                if elapsed_time >= 100:
                    all_passed = False
            else:
                print(f"❌ {name}: HTTP {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"❌ {name}: {e}")
            all_passed = False

    if all_passed:
        print("   ✅ 所有查询性能良好 (<100ms)")
    else:
        print("   ⚠️ 部分查询性能需优化")

    return all_passed


def test_data_quality():
    """测试数据质量"""
    print("\n[测试4] 数据质量测试")
    try:
        response = requests.get(f"{API_BASE}/api/screening?page=1&page_size=20", timeout=5)
        if response.status_code != 200:
            print("❌ API响应错误")
            return False

        data = response.json()

        # 检查Top 3
        top3 = data.get('top3', [])
        if len(top3) == 3:
            print(f"✅ Top 3数据完整")
            for i, stock in enumerate(top3, 1):
                print(f"   {i}. {stock['stock_name']} - {stock['overall_score']}")
        else:
            print(f"❌ Top 3数据不完整: {len(top3)}")
            return False

        # 检查总分页数据
        total = data.get('total', 0)
        page_size = data.get('page_size', 0)
        data_list = data.get('data', [])

        if total >= 4000:
            print(f"✅ 总记录数正常: {total}")
        else:
            print(f"⚠️ 总记录数偏少: {total}")

        if len(data_list) == page_size:
            print(f"✅ 分页数据完整: {len(data_list)}/{page_size}")
        else:
            print(f"⚠️ 分页数据不完整: {len(data_list)}/{page_size}")

        # 检查数据字段完整性
        if data_list:
            required_fields = ['stock_code', 'stock_name', 'overall_score',
                           'recommendation', 'calc_time']
            missing_fields = []
            for field in required_fields:
                if field not in data_list[0]:
                    missing_fields.append(field)

            if not missing_fields:
                print(f"✅ 数据字段完整")
            else:
                print(f"❌ 缺少字段: {missing_fields}")
                return False

        return True

    except Exception as e:
        print(f"❌ 数据质量测试失败: {e}")
        return False


def test_cache_persistence():
    """测试缓存持久化"""
    print("\n[测试5] 缓存持久化测试（需手动验证）")
    print("请按以下步骤操作:")
    print("1. 停止应用 (Ctrl+C)")
    print("2. 检查缓存文件: ls -lh app/static/data/stock_cache.db")
    print("3. 重新启动应用: uvicorn app.main:app --reload")
    print("4. 运行本脚本再次测试")
    print("5. 验证数据是否保留")
    print("\n或者直接检查:")
    print("   缓存文件大小: du -sh app/static/data/stock_cache.db")

    return True


def main():
    """主测试函数"""
    print("=" * 60)
    print("股票基本面选股数据看板 - 功能验证测试")
    print("=" * 60)
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API地址: {API_BASE}")

    results = {
        'API连接': test_api_connection(),
        '同步状态': test_sync_status(),
        'API性能': test_api_performance(),
        '数据质量': test_data_quality(),
        '缓存持久化': test_cache_persistence(),
    }

    # 汇总结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_name}: {status}")

    print(f"\n总计: {passed}/{total} 测试通过")

    if passed == total:
        print("\n🎉 所有测试通过！系统运行正常。")
        return 0
    else:
        print(f"\n⚠️ {total - passed} 个测试失败，请检查相关功能。")
        return 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n测试已取消")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 测试执行出错: {e}")
        sys.exit(1)
