import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.cache_database import engine, Base

def reset_cache_db():
    """重置缓存数据库，删除所有表并重新创建"""
    try:
        print("正在删除所有缓存表...")
        Base.metadata.drop_all(bind=engine)
        
        print("正在重新创建所有缓存表...")
        Base.metadata.create_all(bind=engine)
        
        print("缓存数据库重置成功！")
    except Exception as e:
        print(f"重置失败: {e}")
        raise

if __name__ == "__main__":
    print("警告：这将删除所有缓存数据！")
    confirm = input("确定要继续吗？(yes/no): ")
    
    if confirm.lower() == 'yes':
        reset_cache_db()
    else:
        print("操作已取消")
