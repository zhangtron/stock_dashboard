# ptrade_code API Skill

## Overview

ptrade is a quantitative trading platform API for Chinese stock markets (A-shares), supporting backtesting and live trading. The platform provides event-driven strategy execution with access to historical data, real-time market data, and order management.

**Documentation URL:** http://180.169.203.209:7766/hub/help/api

## Essential Strategy Structure

Every ptrade strategy must have at minimum:

```python
def initialize(context):
    """Required: Runs once at strategy startup"""
    g.security = '600570.SS'  # Set stock(s) to trade
    set_universe(g.security)

def handle_data(context, data):
    """Required: Runs during trading hours (daily or minutely)"""
    order(g.security, 100)  # Example: Buy 100 shares
```

## Strategy Event Flow

```
initialize (once) → before_trading_start (daily 9:10) → handle_data (recurring) → after_trading_end (daily 15:30)
```

### Event Timing
- **initialize**: Runs once at startup
- **before_trading_start**: Daily at 9:10 (trading), 8:30 (backtesting)
- **handle_data**:
  - Daily frequency: 15:00 (backtesting), broker-configured time (trading)
  - Minute frequency: Every minute 9:31-15:00 (backtesting), 9:30-14:59 (trading)
- **after_trading_end**: Daily at 15:30
- **tick_data**: Every 3 seconds, 9:30-14:59 (trading only)

### Optional Events

```python
def before_trading_start(context, data):
    """Runs before market opens - use for daily prep"""
    pass

def after_trading_end(context, data):
    """Runs after market close - use for daily cleanup"""
    pass

def tick_data(context, data):
    """Tick-level processing (3-second intervals, trading only)"""
    pass

def on_order_response(context, order_list):
    """Order push notification (trading only, faster than get_orders())"""
    pass

def on_trade_response(context, trade_list):
    """Trade push notification (trading only, faster than get_trades())"""
    pass
```

## Stock Code Format

- **Shanghai (上交所)**: `600570.SS`, `000001.SS` (6-digit code + .SS suffix)
- **Shenzhen (深交所)**: `000001.SZ`, `300001.SZ` (6-digit code + .SZ suffix)
- **Indices**: `000300.SS` (CSI 300), `000905.SS` (CSI 500)
- **Industries**: `A01000.XBHS` (format: sector code + .XBHS suffix)

## Core APIs

### Data Access

```python
# Get historical K-line data
df = get_history(5, '1d', 'close', '600570.SS', fq=None, include=False)
# Returns DataFrame with datetime index

# Get historical data by date range
df = get_price('600570.SS', start_date='20150101', end_date='20150131', frequency='1d')
# Returns DataFrame with OHLCV data

# Get real-time snapshot (trading only)
snapshot = get_snapshot('600570.SS')
# Returns dict with: last_px, up_px, down_px, bid_grp, offer_grp, etc.

# Get fundamental data
fundamentals = get_fundamentals('600570.SS', 'balance_statement', 'total_assets')
# Returns DataFrame with fundamental data

# Get index constituents
stocks = get_index_stocks('000300.SS')  # Get CSI 300 stocks
stocks = get_index_stocks('000300.SS', '20160620')  # Historical constituents

# Get industry stocks
stocks = get_industry_stocks('A01000.XBHS')  # Agriculture sector
```

### Trading Functions

```python
# Buy/sell by quantity (positive=buy, negative=sell)
order_id = order('600570.SS', 100)  # Buy 100 shares
order_id = order('600570.SS', -100)  # Sell 100 shares
order_id = order('600570.SS', 100, limit_price=39.5)  # Limit order

# Target position size
order_id = order_target('600570.SS', 0)  # Close position
order_id = order_target('600570.SS', 1000)  # Adjust to 1000 shares

# Trade by value
order_id = order_value('600570.SS', 10000)  # Buy 10000 yuan worth
order_id = order_target_value('600570.SS', 50000)  # Target 50000 yuan position

# Cancel order
cancel_order(order_id)

# Get position info
position = get_position('600570.SS')
# position.amount, position.enable_amount, position.cost_basis, etc.

# Get all positions
positions = get_positions()  # Returns dict of Position objects
```

### Configuration Functions

```python
# Set stock universe (required for get_history default)
set_universe(['600570.SS', '000001.SZ'])

# Set benchmark
set_benchmark('000300.SS')  # CSI 300 as benchmark

# Set commission (backtesting only)
set_commission(commission_ratio=0.0003, min_commission=5.0)

# Set slippage (backtesting only)
set_slippage(slippage=0.002)  # 0.2% slippage
set_fixed_slippage(fixedslippage=0.2)  # Fixed 0.2 yuan slippage

# Scheduled tasks (initialize only)
run_daily(context, my_func, time='9:31')  # Run daily at 9:31
run_interval(context, my_func, seconds=10)  # Run every 10 seconds (trading only)
```

### Market Info

```python
# Stock info
name = get_stock_name('600570.SS')  # Returns '恒生电子'
info = get_stock_info('600570.SS', ['stock_name', 'listed_date'])

# Stock status
is_st = get_stock_status('600570.SS', 'ST')  # Check if ST stock
is_halted = get_stock_status('600570.SS', 'HALT')  # Check if halted
is_delisted = get_stock_status('600570.SS', 'DELISTING')  # Check if delisted

# Check limit up/down
limit_status = check_limit('600570.SS')
# Returns: 2=touching limit up, 1=limit up, 0=normal, -1=limit down, -2=touching limit down

# Stock blocks
blocks = get_stock_blocks('600570.SS')
# Returns dict with: 'HY' (industry), 'GN' (concept), 'DY' (region), etc.

# All A-shares
all_stocks = get_Ashares()  # Get all A-share codes
all_stocks = get_Ashares('20130512')  # Get A-shares as of date
```

### Technical Indicators

```python
# MACD
macd_dif, macd_dea, macd_bar = get_MACD(close_prices, short=12, long=26, m=9)

# KDJ
k, d, j = get_KDJ(high_prices, low_prices, close_prices, n=9, m1=3, m2=3)

# RSI
rsi = get_RSI(close_prices, n=6)

# CCI
cci = get_CCI(high_prices, low_prices, close_prices, n=14)
```

## Context Objects

### g - Global Object

```python
# Store global variables
g.security = '600570.SS'
g.counter = 0
g.flag = False
```

### context - Context Object

```python
# Account info
cash = context.portfolio.cash  # Available cash
total_value = context.portfolio.portfolio_value  # Total account value
positions = context.portfolio.positions  # Dict of positions

# Current time
current_time = context.blotter.current_dt  # datetime object
current_date = context.current_dt  # Alternative access

# Simulation params
start_date = context.sim_params.start_date
capital_base = context.sim_params.capital_base
```

### data - Security Data (handle_data)

```python
# In handle_data only
price = data['600570.SS']['close']  # Current close price
open_price = data['600570.SS']['open']
high_price = data['600570.SS']['high']
low_price = data['600570.SS']['low']
volume = data['600570.SS']['volume']
money = data['600570.SS']['money']  # Turnover amount
```

## Data Frequencies

### Supported Frequencies

- `'1d'` or `'daily'` - Daily
- `'1w'` or `'weekly'` - Weekly
- `'1m'` - 1-minute
- `'5m'`, `'15m'`, `'30m'`, `'60m'`, `'120m'` - Minute intervals
- `'1mo'` or `'monthly'` - Monthly
- `'1q'` or `'quarter'` - Quarterly
- `'1y'` or `'yearly'` - Yearly

### Fields for get_history/get_price

- `'open'` - Open price
- `'close'` - Close price
- `'high'` - High price
- `'low'` - Low price
- `'volume'` - Volume
- `'money'` - Turnover amount
- `'price'` - Latest price
- `'preclose'` - Previous close (daily only)
- `'high_limit'` - Limit up price (daily only)
- `'low_limit'` - Limit down price (daily only)

### Adjustment Types (fq parameter)

- `None` - No adjustment
- `'pre'` - Forward adjustment (前复权)
- `'post'` - Backward adjustment (后复权)
- `'dypre'` - Dynamic forward adjustment

## Order Object

```python
order_obj = get_orders()[0]
order_obj.id  # Order ID
order_obj.symbol  # Stock code
order_obj.amount  # Order amount (positive=buy, negative=sell)
order_obj.filled  # Filled amount
order_obj.status  # Order status
order_obj.price  # Limit price
order_obj.entrust_no  # Entrust number
```

### Order Status Values

- `'0'` - 未报 (Not submitted)
- `'1'` - 待报 (Pending submission)
- `'2'` - 已报 (Submitted)
- `'3'` - 已报待撤 (Submitted pending cancel)
- `'4'` - 部成待撤 (Partial pending cancel)
- `'5'` - 部撤 (Partially canceled)
- `'6'` - 已撤 (Canceled)
- `'7'` - 部成 (Partially filled)
- `'8'` - 已成 (Filled)
- `'9'` - 废单 (Rejected)

## Margin Trading (融资融券)

```python
# Get margin trading stocks
margin_cash_stocks = get_margincash_stocks()  # Financing targets
margin_sec_stocks = get_marginsec_stocks()  # Short selling targets

# Get margin assets
assets = get_margin_assert()
# Returns dict with: fin_enable_quota, slo_enable_quota, total_debit, etc.

# Financing buy (融资买入)
margincash_open('600570.SS', 100, limit_price=46.0)

# Sell to repay (卖券还款)
margincash_close('600570.SS', 100)

# Short sell (融券卖出)
marginsec_open('600030.SS', 100)

# Buy to cover (买券还券)
marginsec_close('600030.SS', 100)

# Get max amounts
max_buy = get_margincash_open_amount('600570.SS')  # Max financing amount
max_sell = get_marginsec_open_amount('600030.SS')  # Max short sell amount
```

## Futures Trading

```python
# Buy to open (多开)
buy_open('IF2312.CCFX', 1, limit_price=4000.0)

# Sell to close (多平)
sell_close('IF2312.CCFX', 1, close_today=False)  # close_today: False=prior yesterday, True=today only

# Sell to open (空开)
sell_open('IF2312.CCFX', 1, limit_price=4000.0)

# Buy to close (空平)
buy_close('IF2312.CCFX', 1)

# Set margin rate
set_margin_rate('IF', 0.08)  # 8% margin for CSI 300

# Set commission
set_future_commission('IF', 0.00004)  # 0.4/10000 or 2 yuan per lot

# Get contract info
info = get_instruments('IF2312.CCFX')
```

## Options Trading

```python
# Get option objects
objects = get_opt_objects()  # All option underlyings
objects = get_opt_objects('20220703')  # As of date

# Get expiry dates
dates = get_opt_last_dates('510050.SS')

# Get contracts
contracts = get_opt_contracts('510050.SS')

# Get contract info
info = get_contract_info('10003975.XSHO')

# Buy to open (权利仓开仓)
buy_open('10004335.XSHO', 1, limit_price=0.0501)

# Sell to close (权利仓平仓)
sell_close('10004335.XSHO', 1)

# Sell to open (义务仓开仓)
sell_open('10004335.XSHO', 1)

# Buy to close (义务仓平仓)
buy_close('10004335.XSHO', 1)

# Covered write (备兑开仓)
open_prepared('10004335.XSHO', 1)

# Covered close (备兑平仓)
close_prepared('10004335.XSHO', 1)

# Exercise
option_exercise('10004335.XSHO', 1)
```

## Utility Functions

```python
# Logging
log.info("info message")
log.warning("warning message")
log.error("error message")
log.debug("debug message")

# Check if in trading mode
if is_trade():
    # Trading environment code
else:
    # Backtesting environment code

# Send email (trading only)
send_email('sender@qq.com', 'receiver@qq.com', 'smtp_code',
          info='content', subject='subject')

# Send WeChat Work message (trading only)
send_qywx('corp_id', 'secret', 'agent_id', info='message')

# Permission check
if not permission_test(account='account', end_date='20250101'):
    raise RuntimeError('Permission denied')

# Create directory
create_dir('my_folder')  # Creates /home/fly/notebook/my_folder
```

## Trading Schedule

### Pre-Market (盘前)
- Before 9:30
- `run_daily` can execute with time like '09:15'
- `before_trading_start` executes

### In-Market (盘中)
- 9:31-15:00 (backtesting) / 9:30-14:59 (trading)
- `handle_data` executes
- `run_daily` can execute with time like '14:30'
- `run_interval` executes (trading only)
- `tick_data` executes (trading only)

### Post-Market (盘后)
- After 15:00
- `after_trading_end` executes at 15:30
- `run_daily` can execute with time like '15:10'

## Best Practices

### 1. Stock Universe Management
```python
def initialize(context):
    # Always set universe for get_history to work properly
    g.stocks = ['600570.SS', '000001.SZ']
    set_universe(g.stocks)
```

### 2. Context-Aware Code
```python
def handle_data(context, data):
    # Check if trading or backtesting
    if is_trade():
        # Use trading-specific APIs
        snapshot = get_snapshot(g.security)
    else:
        # Use backtest-compatible code
        hist = get_history(1, '1d', 'close', g.security)
```

### 3. Order Management
```python
def handle_data(context, data):
    # Always check order status
    order_id = order(g.security, 100)
    order_obj = get_order(order_id)
    if order_obj and order_obj.status == '8':
        log.info("Order filled")
```

### 4. Position Management
```python
def handle_data(context, data):
    position = get_position(g.security)

    # Check if we have position
    if position.amount > 0:
        # Close position
        order_target(g.security, 0)

    # Or check available amount
    if position.enable_amount >= 100:
        # Sell 100 shares
        order(g.security, -100)
```

### 5. Data Persistence
```python
import pickle

def initialize(context):
    # Load persisted data
    try:
        with open('/home/fly/notebook/data.pkl', 'rb') as f:
            g.my_data = pickle.load(f)
    except:
        g.my_data = {}

def after_trading_end(context, data):
    # Persist data
    with open('/home/fly/notebook/data.pkl', 'wb') as f:
        pickle.dump(g.my_data, f)
```

## Common Patterns

### Moving Average Strategy
```python
def initialize(context):
    g.security = '600570.SS'
    set_universe(g.security)
    g.ma_short = 5
    g.ma_long = 10

def handle_data(context, data):
    hist = get_history(g.ma_long, '1d', 'close', g.security)
    ma_short = hist['close'][-g.ma_short:].mean()
    ma_long = hist['close'][-g.ma_long:].mean()

    position = get_position(g.security)

    if ma_short > ma_long and position.amount == 0:
        # Buy signal
        order_value(g.security, context.portfolio.cash)
    elif ma_short < ma_long and position.amount > 0:
        # Sell signal
        order_target(g.security, 0)
```

### RSI Reversal
```python
def handle_data(context, data):
    hist = get_history(20, '1d', 'close', g.security)
    rsi_values = get_RSI(hist['close'].values, n=14)
    rsi = rsi_values[-1]

    position = get_position(g.security)

    if rsi < 30 and position.amount == 0:
        # Oversold - buy
        order(g.security, 100)
    elif rsi > 70 and position.amount > 0:
        # Overbought - sell
        order_target(g.security, 0)
```

### Market Selection
```python
def before_trading_start(context, data):
    # Get CSI 300 stocks
    g.stocks = get_index_stocks('000300.SS')
    set_universe(g.stocks)

    # Filter out ST and halted stocks
    g.stocks = [s for s in g.stocks
                if not get_stock_status(s, 'ST') and
                   not get_stock_status(s, 'HALT')]

def handle_data(context, data):
    # Iterate through stock universe
    for stock in g.stocks:
        position = get_position(stock)
        # Your logic here
        pass
```

## Data Return Types

### get_history Return Types

1. **Single stock, single field**: DataFrame with datetime index, field as column
2. **Multiple stocks, single field**: DataFrame with datetime index, stock codes as columns
3. **Multiple stocks, multiple fields**: Panel (deprecated) or swap axes to get desired format

### get_snapshot Return Dict

```python
{
    'last_px': 44.47,  # Latest price
    'open_px': 44.91,  # Open price
    'high_px': 45.05,  # High price
    'low_px': 44.31,  # Low price
    'preclose_px': 45.2,  # Previous close
    'up_px': 49.72,  # Limit up
    'down_px': 40.68,  # Limit down
    'volume': 6161800,  # Volume
    'business_amount': 6161800,  # Turnover quantity
    'business_balance': 274847503.0,  # Turnover amount
    'bid_grp': {1: [44.45, 600, 0], 2: [44.44, 600, 0], ...},  # Buy levels
    'offer_grp': {1: [44.47, 3300, 0], 2: [44.48, 2800, 0], ...},  # Sell levels
    'turnover_ratio': 0.0042,  # Turnover rate
    'pe_rate': 4294573.83,  # P/E ratio
    'pb_rate': 11.42,  # P/B ratio
    'trade_status': 'TRADE',  # Trade status
    # ... more fields
}
```

## Important Notes

1. **Stock code format**: Always use `.SS` for Shanghai, `.SZ` for Shenzhen
2. **Universe required**: Always call `set_universe()` before using `get_history()` without security_list
3. **Order validation**: Minimum 100 shares for stocks, 10 for convertible bonds
4. **Time zone**: All times are Beijing time (UTC+8)
5. **Data availability**: Historical data available from 2005 onwards
6. **Backtesting vs Trading**: Some APIs only work in one mode (check docs)
7. **Persistence**: Use pickle for global variable persistence across restarts
8. **Private variables**: Variables starting with `__` in `g` won't be persisted
9. **Tick data**: Requires Level 2行情 for order/transaction data
10. **Third-party libraries**: numpy, pandas, scipy, scikit-learn, TA-Lib available

## Error Handling

```python
def handle_data(context, data):
    try:
        position = get_position(g.security)
        if position is None:
            log.warning("No position data available")
            return
    except Exception as e:
        log.error(f"Error getting position: {e}")
        return
```

## Performance Tips

1. Use `is_dict=True` in `get_history()` for faster data access
2. Use `get_snapshot()` instead of tick_data when possible
3. Batch queries when getting data for multiple stocks
4. Avoid repeated database calls - cache data in `g` object
5. Use `get_positions()` to get all positions at once instead of multiple `get_position()` calls

## Version Information

Current platform version should be checked via broker documentation for latest API changes and supported features.
