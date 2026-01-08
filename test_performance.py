#!/usr/bin/env python3
"""
性能对比测试 - 测量API响应时间
"""
import time
import statistics
import requests

API_BASE = "http://localhost:8000"


def measure_response_time(url, name, iterations=10):
    """测量API响应时间"""
    print(f"\n{name}")
    print("-" * 50)

    times = []

    for i in range(iterations):
        try:
            start = time.time()
            response = requests.get(url, timeout=10)
            elapsed = (time.time() - start) * 1000  # 毫秒

            if response.status_code == 200:
                data = response.json()
                total = data.get('total', 0)
                print(f"  第{i+1:2d}次: {elapsed:6.1f}ms  (记录数: {total:5d})")
                times.append(elapsed)
            else:
                print(f"  第{i+1:2d}次: HTTP {response.status_code}")
        except Exception as e:
            print(f"  第{i+1:2d}次: 错误 - {e}")

    if times:
        avg = statistics.mean(times)
        median = statistics.median(times)
        min_time = min(times)
        max_time = max(times)
        p95 = statistics.quantiles(times, n=20)[18]  # 95th percentile

        print("-" * 50)
        print(f"  平均响应时间: {avg:6.1f}ms")
        print(f"  中位数:        {median:6.1f}ms")
        print(f"  最快:          {min_time:6.1f}ms")
        print(f"  最慢:          {max_time:6.1f}ms")
        print(f"  P95:           {p95:6.1f}ms")

        # 性能评级
        if avg < 50:
            grade = "优秀 ⭐⭐⭐"
        elif avg < 100:
            grade = "良好 ⭐⭐"
        elif avg < 200:
            grade = "一般 ⭐"
        else:
            grade = "需优化"

        print(f"  性能评级:      {grade}")

        return avg
    else:
        print("  无有效数据")
        return None


def main():
    """主测试函数"""
    print("=" * 60)
    print("性能对比测试 - 本地缓存优化效果")
    print("=" * 60)

    test_cases = [
        (
            "基本查询",
            f"{API_BASE}/api/screening?page=1&page_size=20",
            10
        ),
        (
            "Top 3查询",
            f"{API_BASE}/api/screening?page=1&page_size=5",
            10
        ),
        (
            "筛选查询 (STRONG_BUY)",
            f"{API_BASE}/api/screening?recommendation=STRONG_BUY&page=1&page_size=10",
            10
        ),
        (
            "得分筛选 (≥80)",
            f"{API_BASE}/api/screening?min_overall_score=80&page=1&page_size=10",
            10
        ),
        (
            "模糊搜索 (银行)",
            f"{API_BASE}/api/screening?stock_name=银行&page=1&page_size=10",
            10
        ),
        (
            "排序查询 (按综合得分)",
            f"{API_BASE}/api/screening?page=1&page_size=20&sort_by=overall_score&sort_order=desc",
            10
        ),
        (
            "大分页查询 (100条)",
            f"{API_BASE}/api/screening?page=1&page_size=100",
            10
        ),
    ]

    results = []

    for name, url, iterations in test_cases:
        avg_time = measure_response_time(url, name, iterations)
        if avg_time:
            results.append((name, avg_time))

    # 汇总
    print("\n" + "=" * 60)
    print("性能汇总")
    print("=" * 60)

    if results:
        print(f"\n{'测试类型':<20} {'平均时间':<15} {'评级':<10}")
        print("-" * 45)

        total_avg = 0
        for name, avg_time in results:
            if avg_time < 50:
                grade = "优秀 ⭐⭐⭐"
            elif avg_time < 100:
                grade = "良好 ⭐⭐"
            else:
                grade = "一般 ⭐"

            print(f"{name:<20} {avg_time:8.1f}ms    {grade:<10}")
            total_avg += avg_time

        overall_avg = total_avg / len(results)
        print("-" * 45)
        print(f"{'总体平均':<20} {overall_avg:8.1f}ms")

        # 性能结论
        print("\n" + "=" * 60)
        print("性能结论")
        print("=" * 60)

        if overall_avg < 50:
            print("\n🎉 性能优秀！")
            print("   本地缓存效果显著，响应速度非常快。")
            print("   用户体验极佳，无需进一步优化。")
        elif overall_avg < 100:
            print("\n✅ 性能良好！")
            print("   本地缓存工作正常，响应速度符合预期。")
            print("   用户体验流畅。")
        elif overall_avg < 200:
            print("\n⚠️ 性能一般")
            print("   响应速度可以接受，但仍有优化空间。")
            print("   建议检查是否有缓存未命中的情况。")
        else:
            print("\n❌ 性能需优化")
            print("   响应速度偏慢，建议：")
            print("   1. 检查缓存是否正常工作")
            print("   2. 检查是否有远程数据库查询")
            print("   3. 检查SQLite数据库索引")

        print("\n与优化前对比（远程MySQL查询）:")
        print(f"  优化前: ~300ms")
        print(f"  优化后: {overall_avg:.1f}ms")
        improvement = 300 / overall_avg
        print(f"  性能提升: {improvement:.1f}倍 ⚡")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n测试已取消")
    except Exception as e:
        print(f"\n❌ 测试执行出错: {e}")
