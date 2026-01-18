# JoinQuant (聚宽) API Complete Skill

## Overview

JoinQuant (聚宽) is a leading Chinese quantitative trading platform providing cloud-based backtesting, simulation trading, and live trading capabilities for A-share markets. The platform offers precise backtesting, high-speed real trading interfaces, easy-to-use API documentation, and a strategy library from beginner to advanced levels.

**Official Documentation:** https://www.joinquant.com/help/api/help?name=api
**Alternative Mirror:** https://ycjq.95358.com/help/api/help?name=api

## Platform Features

- **Backtesting**: Daily and minute-level backtesting with real-time results display
- **Simulation Trading**: Most accurate A-share and ETF simulation trading tools
- **Live Trading**: Direct connection to brokers for real trading
- **Data Coverage**: Comprehensive historical data from 2005 onwards
- **API Design**: Simple, powerful Python APIs

## Essential Strategy Structure

### Minimum Required Functions

Every JoinQuant strategy must define at least these two functions:

```python
# 1. Initialization - runs once at startup
def initialize(context):
    g.security = '000001.XSHE'  # Ping An Bank
    set_universe(g.security)

# 2. Main strategy logic - runs every period
def handle_data(context, data):
    order(g.security, 100)  # Buy 100 shares
```

### Optional Functions

```python
# Pre-market daily routine (runs around 9:10 AM)
def before_trading_start(context):
    # Daily preparation, stock screening, data fetching
    g.selected_stocks = screen_stocks()
    set_universe(g.selected_stocks)

# Post-market daily routine (runs after market close)
def after_trading_end(context):
    # Logging, analysis, position review
    log.info(f"Portfolio value: {context.portfolio.total_value}")
```

## Stock Code Format

JoinQuant uses a specific stock code format with exchange suffixes:

| Exchange | Suffix | Example | Description |
|----------|--------|---------|-------------|
| Shanghai (上交所) | `.XSHG` | `600000.XSHG` | 6-digit code + .XSHG |
| Shenzhen (深交所) | `.XSHE` | `000001.XSHE` | 6-digit code + .XSHE |
| Indices | `.XSHG` | `000300.XSHG` | CSI 300 index |

**Common Indices:**
- `000300.XSHG` - CSI 300 (沪深300)
- `000905.XSHG` - CSI 500 (中证500)
- `000016.XSHG` - SSE 50 (上证50)
- `399006.XSHE` - ChiNext Index (创业板指)

## Strategy Event Flow

```
initialize (once)
    ↓
before_trading_start (daily ~9:10 AM)
    ↓
handle_data (recurring)
    - Daily: once at market close
    - Minute: every minute 9:31-15:00
    ↓
after_trading_end (daily after close)
```

### Event Timing Details

- **initialize**: Runs once when strategy starts
- **before_trading_start**:
  - Runs daily before market opens
  - Around 9:10 AM
  - Use for: daily data preparation, stock screening
- **handle_data**:
  - Daily frequency: Runs once per trading day (at close)
  - Minute frequency: Runs every minute during 9:31-15:00
  - Use for: Main trading logic
- **after_trading_end**:
  - Runs daily after market close
  - Use for: Logging, analysis, cleanup

## Core Data APIs

### get_history - Get Historical K-Line Data

```python
# Basic usage
df = get_history(20, '1d', 'close', '000001.XSHE')
# Returns: DataFrame with datetime index

# Multiple fields
df = get_history(20, '1d', ['open', 'close', 'high', 'low', 'volume'], '000001.XSHE')

# Multiple stocks
df = get_history(20, '1d', 'close', ['000001.XSHE', '600000.XSHG'])
# Returns: DataFrame with stock codes as columns

# Slice data
df = get_history(20, '1d', 'close', '000001.XSHE', end_date='2020-12-31')
```

**Parameters:**
- `count`: Number of periods (int)
- `unit`: Frequency ('1d', '1m', '5m', '15m', '30m', '60m', '1w', '1M')
- `field`: Field or list of fields ('open', 'close', 'high', 'low', 'volume', 'money')
- `security`: Stock code or list of codes
- `end_date`: End date (default: current date)
- `fq`: None (no adjustment) or 'pre' (forward adjustment)

**Returns:** DataFrame or Panel

### get_price - Get Price by Date Range

```python
# By date range
df = get_price('000001.XSHE', start_date='2020-01-01', end_date='2020-12-31')

# Multiple fields
df = get_price('000001.XSHE', start_date='2020-01-01', end_date='2020-12-31',
                fields=['open', 'close', 'high', 'low'])

# Multiple stocks
df = get_price(['000001.XSHE', '600000.XSHG'], start_date='2020-01-01', end_date='2020-12-31')

# With frequency
df = get_price('000001.XSHE', start_date='2020-01-01', end_date='2020-12-31',
                frequency='1d')

# Panel format (multiple stocks and fields)
panel = get_price(['000001.XSHE', '600000.XSHG'], start_date='2020-01-01', end_date='2020-12-31',
                 fields=['open', 'close'], frequency='1d')
```

### Accessing Current Price in handle_data

```python
def handle_data(context, data):
    # Access current bar data
    current_price = data['000001.XSHE']['close']
    open_price = data['000001.XSHE']['open']
    high_price = data['000001.XSHE']['high']
    low_price = data['000001.XSHE']['low']
    volume = data['000001.XSHE']['volume']
    money = data['000001.XSHE']['money']
```

### Data Frequency Options

- `'1d'` or `'daily'` - Daily bars
- `'1m'` - 1-minute bars
- `'5m'` - 5-minute bars
- `'15m'` - 15-minute bars
- `'30m` - 30-minute bars
- `'60m'` - 60-minute bars
- `'1w'` or `'weekly'` - Weekly bars
- `'1M'` or `'monthly'` - Monthly bars

### Data Fields

- `'open'` - Open price
- `'close'` - Close price
- `'high'` - High price
- `'low'` - Low price
- `'volume'` - Volume (shares)
- `'money'` - Turnover amount (yuan)

## Trading APIs

### Order by Amount

```python
# Buy 100 shares
order_id = order('000001.XSHE', 100)

# Sell 100 shares
order_id = order('000001.XSHE', -100)

# Limit order
order_id = order('000001.XSHE', 100, limit_price=15.0)

# Market order
order_id = order('000001.XSHE', 100, market_type='market')
```

### Order by Target Quantity

```python
# Close position (sell all)
order_target('000001.XSHE', 0)

# Target 1000 shares
order_target('000001.XSHE', 1000)

# Limit order with target
order_target('000001.XSHE', 1000, limit_price=15.0)
```

### Order by Value

```python
# Buy 10,000 yuan worth
order_id = order_value('000001.XSHE', 10000)

# Sell 10,000 yuan worth
order_id = order_value('000001.XSHE', -10000)
```

### Order by Target Value

```python
# Target 50,000 yuan position
order_target_value('000001.XSHE', 50000)

# Close position (0 value)
order_target_value('000001.XSHE', 0)
```

### Order Cancellation

```python
# Cancel single order
cancel_order(order_id)

# Cancel all open orders
for order in get_open_orders():
    cancel_order(order.order_id)
```

### Order Management

```python
# Get all orders
all_orders = get_orders()

# Get open orders
open_orders = get_open_orders()

# Get specific order
order_obj = get_order(order_id)

# Get trades
all_trades = get_trades()
```

### Order Status Values

- `'filled'` - Fully filled (完全成交)
- `'pending'` - Pending (待成交)
- `'rejected'` - Rejected (被拒绝)
- `'canceled'` - Canceled (已撤销)
- `'partially_filled'` - Partially filled (部分成交)

## Configuration APIs

### Set Stock Universe

```python
# Single stock
set_universe('000001.XSHE')

# Multiple stocks
set_universe(['000001.XSHE', '600000.XSHG', '300001.XSHE'])

# All A-shares
all_stocks = list(get_all_securities(['stock']).index
set_universe(all_stocks)

# Update universe during strategy
def before_trading_start(context):
    screened = screen_stocks()
    set_universe(screened)
```

### Set Benchmark

```python
# Set benchmark (default is CSI 300)
set_benchmark('000300.XSHG')  # CSI 300
set_benchmark('000905.XSHG')  # CSI 500
```

### Set Slippage

```python
# Fixed slippage
set_slippage(0.002)  # 0.2% slippage

# Period-adjusted slippage
set_slippage(PeriodAdjust([
    ('2020-01-01', 0.003),  # 0.3% before 2020-01-01
    ('2020-06-01', 0.002),  # 0.2% from 2020-06-01
]))

# Fixed slippage by stock
set_slippage(FixedSlippage(0.02))  # Fixed 0.02 yuan slippage
```

### Set Commission

```python
# Per-order commission
set_commission(PerOrder(
    buy_cost=0.0003,     # Buy: 0.03% commission
    sell_cost=0.0013,    # Sell: 0.13% commission (includes 0.1% stamp duty)
    min_cost=5            # Minimum 5 yuan per order
))

# By stock type
set_commission(PerOrder(
    buy_cost=0.0003,
    sell_cost=0.0013,
    min_cost=5
), type='stock')
```

### Set Options

```python
# Enable true price retesting (dynamic adjustment)
set_option('use_real_price', True)

# Other options
set_option('avoid_future_data', True)  # Avoid future data leakage
```

## Position & Account APIs

### Context Object Properties

```python
# Portfolio information
context.portfolio.total_value       # Total account value (total_value = positions_value + cash)
context.portfolio.positions_value    # Position market value
context.portfolio.cash              # Available cash
context.portfolio.starting_cash     # Initial cash
context.portfolio.daily_returns     # Daily returns
context.portfolio.returns            # Total returns (from start)

# Positions dictionary
context.portfolio.positions          # Dict: {stock_code: Position object}

# Time information
context.current_dt                    # Current datetime (datetime object)
context.previous_date                 # Previous trading day

# Universe
context.universe                      # List of stock codes in universe
```

### Position Object

```python
position = context.portfolio.positions['000001.XSHE']

# Position details
position.total_amount      # Total shares held (int)
position.closeable_amount  # Sellable shares (int, respects T+1)
position.avg_cost         # Average cost (float)
position.value            # Current position value (float)
position.pnl              # Unrealized P&L (float)
position.daily_pnl        # Daily P&L (float)

# Or use get_position function
position = get_position('000001.XSHE')
```

### Cash Management

```python
def handle_data(context, data):
    # Get available cash
    cash = context.portfolio.cash

    # Use 90% of cash for buying
    if cash > 10000:
        order_value('000001.XSHE', cash * 0.9)
```

## Market Data APIs

### Get Stock List

```python
# Get all securities
all_securities = get_all_securities()

# Get stocks only
stocks = get_all_securities(['stock'])

# Get specific date
stocks = get_all_securities(['stock'], date='2020-01-01')

# Returns DataFrame with columns:
# - display_name: Stock name
# - start_date: Listing date
# - end_date: Delisting date
# - type: Security type
```

### Get Stock Info

```python
# Get security info
info = get_security_info('000001.XSHE')

info.display_name   # Stock name
info.start_date     # Listing date
info.end_date       # Delisting date (if delisted)
info.type           # Security type
info.parent         # Parent company
```

### Get Index Constituents

```python
# Get current constituents
stocks = get_index_stocks('000300.XSHG')  # CSI 300
stocks = get_index_stocks('000905.XSHG')  # CSI 500

# Get historical constituents
stocks = get_index_stocks('000300.XSHG', date='2020-01-01')

# Returns list of stock codes
```

### Get Industry & Concepts

```python
# Get industry classification
industry = get_industry('000001.XSHE')

# Get concept stocks
stocks = get_concept('国企改革')       # SOE reform concept
stocks = get_concept('新能源汽车')  # New energy vehicles
```

### Get Trading Calendar

```python
# Get trading days
trading_days = get_trade_days(start_date='2020-01-01', end_date='2020-12-31')

# Get all trading days from start to now
all_days = get_all_trade_days()

# Returns list of datetime objects
```

## Fundamental Data APIs

### Get Fundamentals

```python
# Get fundamental data
df = get_fundamentals('stock', '000001.XSHE', '2020-01-01')

# With specific fields
df = get_fundamentals('stock', '000001.XSHE', '2020-01-01',
                      fields=['market_cap', 'pe_ratio', 'pb_ratio'])

# Query syntax
from jqfactor import get_fundamentals
df = query(get_fundamentals('stock')).filter(
    statDate='2020'
)
```

### Common Fundamental Fields

**Valuation Metrics:**
- `market_cap` - Market cap
- `pe_ratio` - P/E ratio
- `pb_ratio` - P/B ratio
- `ps_ratio` - P/S ratio

**Balance Sheet:**
- `total_assets` - Total assets
- `total_liability` - Total liabilities
- `net_assets` - Net assets
- `current_ratio` - Current ratio

**Income Statement:**
- `revenue` - Revenue
- `net_profit` - Net profit
- `operating_profit` - Operating profit
- `ebitda` - EBITDA

## Scheduled Task APIs

### Scheduled Execution

```python
def initialize(context):
    # Run daily at specific time
    run_daily(my_func, time='9:30')
    run_daily(my_func, time='14:30')

    # Run weekly (weekday: 0=Mon, 1=Tue, ..., 4=Fri)
    run_weekly(my_func, weekday=1, time='9:30')

    # Run monthly
    run_monthly(my_func, monthday=1, time='10:00')

def my_func(context):
    log.info("Scheduled task executed")
```

### One-Time Execution

```python
def initialize(context):
    # Run once at specific date and time
    run_once(my_func, date='2020-01-01', time='9:30')
```

## Technical Indicators

### Moving Averages

```python
# Simple moving average (using pandas)
hist = get_history(20, '1d', 'close', '000001.XSHE')
ma5 = hist['close'].rolling(5).mean()
ma20 = hist['close'].rolling(20).mean()

# Exponential moving average
ema12 = hist['close'].ewm(span=12).mean()
ema26 = hist['close'].ewm(span=26).mean()
```

### Custom Indicators

```python
def handle_data(context, data):
    hist = get_history(20, '1d', ['close', 'high', 'low'], g.security)

    # RSI calculation
    delta = hist['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
```

## Utility Functions

### Logging

```python
# Different log levels
log.info("Information message")
log.warn("Warning message")
log.error("Error message")

# Format strings
log.info(f"Current price: {data['000001.XSHE']['close']}")
log.info("Trading {} shares of {}", 100, '000001.XSHE')
```

### Time Functions

```python
# Current datetime (in strategy)
current = context.current_dt

# Current datetime (in research mode)
from jqdata import *
current = get_datetime()

# Format date
date_str = context.current_dt.strftime('%Y-%m-%d')
```

### File Operations

```python
# Write file
write_file(content, 'filename.txt')
```

## Common Strategy Patterns

### 1. Simple Moving Average Crossover

```python
def initialize(context):
    g.security = '000001.XSHE'
    set_universe(g.security)
    g.ma_short = 5
    g.ma_long = 20

def handle_data(context, data):
    hist = get_history(g.ma_long, '1d', 'close', g.security)
    ma_short = hist['close'][-g.ma_short:].mean()
    ma_long = hist['close'][-g.ma_long:].mean()

    position = context.portfolio.positions.get(g.security, None)

    # Golden cross - buy
    if ma_short > ma_long and (position is None or position.total_amount == 0):
        order(g.security, 100)
        log.info("Golden cross - buy")

    # Death cross - sell
    elif ma_short < ma_long and (position is not None and position.total_amount > 0):
        order_target(g.security, 0)
        log.info("Death cross - sell")
```

### 2. Multi-Stock Rotation

```python
def initialize(context):
    # Get CSI 300 stocks
    g.stock_pool = get_index_stocks('000300.XSHG')
    set_universe(g.stock_pool)
    g.max_stocks = 10

def handle_data(context, data):
    # Calculate MA for each stock
    signals = []
    for stock in g.stock_pool:
        hist = get_history(20, '1d', 'close', stock)
        ma5 = hist['close'][-5:].mean()
        ma20 = hist['close'][-20:].mean()

        if ma5 > ma20:
            signals.append((stock, ma5 / ma20))

    # Sort by signal strength and select top N
    signals.sort(key=lambda x: x[1], reverse=True)
    selected = signals[:g.max_stocks]

    # Rebalance portfolio
    for stock, ratio in selected:
        target_value = context.portfolio.total_value / g.max_stocks
        order_target_value(stock, target_value)
```

### 3. RSI Overbought/Oversold

```python
def initialize(context):
    g.security = '000001.XSHE'
    set_universe(g.security)
    g.rsi_oversold = 30
    g.rsi_overbought = 70

def handle_data(context, data):
    hist = get_history(14, '1d', 'close', g.security)

    # Calculate RSI
    delta = hist['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    current_rsi = rsi.iloc[-1]

    position = context.portfolio.positions.get(g.security, None)

    # Oversold - buy
    if current_rsi < g.rsi_oversold and (position is None or position.total_amount == 0):
        order(g.security, 100)
        log.info(f"RSI {current_rsi:.2f} - oversold, buying")

    # Overbought - sell
    elif current_rsi > g.rsi_overbought and (position is not None and position.total_amount > 0):
        order_target(g.security, 0)
        log.info(f"RSI {current_rsi:.2f} - overbought, selling")
```

### 4. Breakout Strategy

```python
def initialize(context):
    g.security = '000001.XSHE'
    set_universe(g.security)
    g.lookback = 20

def handle_data(context, data):
    hist = get_history(g.lookback, '1d', ['close', 'high', 'low'], g.security)

    # Calculate support and resistance
    resistance = hist['high'].max()
    support = hist['low'].min()
    current_price = hist['close'][-1]

    position = context.portfolio.positions.get(g.security, None)

    # Breakout above resistance - buy
    if current_price > resistance and (position is None or position.total_amount == 0):
        order(g.security, 100)
        log.info(f"Breakout! Price {current_price:.2f} > resistance {resistance:.2f}")

    # Drop below support - sell
    elif current_price < support and (position is not None and position.total_amount > 0):
        order_target(g.security, 0)
        log.info(f"Breakdown! Price {current_price:.2f} < support {support:.2f}")
```

### 5. Stock Screening

```python
def before_trading_start(context):
    # Get all A-shares
    all_stocks = list(get_all_securities(['stock']).index)

    # Get fundamental data
    from jqfactor import get_fundamentals
    q = query(get_fundamentals('stock')).filter(
        statDate=context.current_dt.date.strftime('%Y-%m-%d')
    )

    df = get_fundamentals(q)

    # Screen stocks
    df = df[
        (df['market_cap'] > 10000000000) &  # Market cap > 10B
        (df['pe_ratio'] < 30) &               # PE < 30
        (df['pb_ratio'] < 5)                   # PB < 5
    ]

    # Select top stocks by market cap
    df = df.sort_values('market_cap', ascending=False)
    g.stock_pool = df.index[:10].tolist()

    set_universe(g.stock_pool)
    log.info(f"Selected {len(g.stock_pool)} stocks")

def handle_data(context, data):
    for stock in g.stock_pool:
        hist = get_history(5, '1d', 'close', stock)

        # Simple momentum: buy if price increased yesterday
        if hist['close'][-1] > hist['close'][-2]:
            position = context.portfolio.positions.get(stock, None)
            if position is None or position.total_amount == 0:
                order(stock, 100)
```

### 6. Position Sizing with Risk Control

```python
def initialize(context):
    g.security = '000001.XSHE'
    set_universe(g.security)
    g.max_position_ratio = 0.3  # Max 30% per stock
    g.stop_loss_ratio = 0.05   # 5% stop loss

def handle_data(context, data):
    hist = get_history(20, '1d', 'close', g.security)
    ma_short = hist['close'][-5:].mean()
    ma_long = hist['close'][-20:].mean()

    position = context.portfolio.positions.get(g.security, None)

    # Buy signal
    if ma_short > ma_long:
        if position is None or position.total_amount == 0:
            # Calculate position size based on risk
            target_value = context.portfolio.total_value * g.max_position_ratio
            order_target_value(g.security, target_value)

    # Stop loss
    elif position is not None and position.total_amount > 0:
        cost_basis = position.avg_cost
        current_price = hist['close'][-1]

        if current_price < cost_basis * (1 - g.stop_loss_ratio):
            order_target(g.security, 0)
            log.info(f"Stop loss triggered at {current_price:.2f}")
```

## Advanced Features

### True Price Retesting

```python
def initialize(context):
    set_option('use_real_price', True)
    # This enables dynamic price adjustment for more accurate backtesting
```

### Avoid Future Data

```python
def initialize(context):
    set_option('avoid_future_data', True)
    # Prevents accessing future data inadvertently
```

### Split Dividend Reinvestment

```python
def initialize(context):
    # Configure dividend reinvestment and fees
    set_order_cost(OrderCost(
        open_tax=0,        # No tax on buying
        close_tax=0.001,   # 0.1% stamp duty on selling
        min_cost=5         # Minimum 5 yuan
    ))
```

## Context Object Reference

### context.portfolio Properties

```python
context.portfolio.total_value      # Total account value (float)
context.portfolio.positions_value   # Position market value (float)
context.portfolio.cash              # Available cash (float)
context.portfolio.starting_cash     # Initial cash (float)
context.portfolio.daily_returns     # Series of daily returns (pandas.Series)
context.portfolio.returns            # Total returns from start (float)
context.portfolio.positions          # Dict of Position objects
```

### Position Object Properties

```python
position = context.portfolio.positions['000001.XSHE']

position.total_amount      # Total shares (int)
position.closeable_amount  # Sellable shares (int, T+1 rule)
position.avg_cost         # Average cost (float)
position.value            # Market value (float)
position.pnl              # Unrealized P&L (float)
position.daily_pnl        # Daily P&L (float)
```

### context.current_dt

```python
# Access current time
current = context.current_dt

# Format as string
date_str = current.strftime('%Y-%m-%d %H:%M:%S')
# Output: '2020-01-01 09:30:00'

# Extract components
year = current.year
month = current.month
day = current.day
hour = current.hour
minute = current.minute
```

## Order Object Reference

```python
order = get_orders()[0]

order.order_id      # Unique order ID (str)
order.security      # Stock code (str)
order.action        # 'buy' or 'sell' (str)
order.amount        # Order amount (int, + for buy, - for sell)
order.price         # Order price (float)
order.filled        # Filled amount (int)
order.status        # Order status (str)
order.time          # Order time (datetime)
order.side          # Order side (str)
order.type          # Order type (str)
```

## Best Practices

### 1. Always Initialize Universe

```python
def initialize(context):
    g.stock_pool = ['000001.XSHE', '600000.XSHG']
    set_universe(g.stock_pool)  # Required for most data APIs
```

### 2. Check Position Before Trading

```python
def handle_data(context, data):
    stock = g.stock_pool[0]
    position = context.portfolio.positions.get(stock)

    if position is None or position.total_amount == 0:
        # No position, can buy
        order(stock, 100)
    else:
        # Has position, can sell
        order(stock, -100)
```

### 3. Handle T+1 Settlement

```python
def handle_data(context, data):
    position = context.portfolio.positions['000001.XSHE']

    # Can only sell shares that were bought yesterday (T+1)
    sellable = position.closeable_amount

    if sellable_amount >= 100:
        order('000001.XSHE', -100)
```

### 4. Use Proper Logging

```python
def handle_data(context, data):
    # Use log.info for normal messages
    log.info(f"Processing {g.security}")

    # Use log.warn for warnings
    if context.portfolio.cash < 1000:
        log.warn("Low cash balance")

    # Use log.error for errors
    try:
        order(g.security, 100)
    except Exception as e:
        log.error(f"Order failed: {e}")
```

### 5. Manage Cash Effectively

```python
def handle_data(context, data):
    cash = context.portfolio.cash
    total_value = context.portfolio.total_value

    # Only use 90% of cash for any single trade
    if cash > total_value * 0.1:
        order_value(g.security, cash * 0.9)
```

### 6. Error Handling

```python
def handle_data(context, data):
    for stock in g.stock_pool:
        try:
            hist = get_history(20, '1d', 'close', stock)
            # Process data
        except Exception as e:
            log.error(f"Error getting history for {stock}: {e}")
            continue
```

## JoinQuant vs ptrade API Differences

| Feature | JoinQuant | ptrade |
|---------|-----------|--------|
| Stock suffix | `.XSHG`/`.XSHE` | `.SS`/`.SZ` |
| Data access | `data[stock]['close']` | Same |
| Universe | `set_universe(list)` | Same |
| Commission | `set_commission(PerOrder(...))` | `set_commission(ratio, min_cost)` |
| Slippage | `set_slippage()` or `PeriodAdjust()` | `set_slippage(slippage)` |
| Position access | `context.portfolio.positions[code]` | `get_position(code)` |
| Init signature | `initialize(context)` | Same |
| Main function | `handle_data(context, data)` | Same |
| Pre-market | `before_trading_start(context)` | `before_trading_start(context, data)` |
| Post-market | `after_trading_end(context)` | `after_trading_end(context, data)` |

## API Categories Reference

### Strategy APIs (策略API)
- `initialize(context)` - Initialization
- `handle_data(context, data)` - Main strategy
- `before_trading_start(context)` - Pre-market (optional)
- `after_trading_end(context)` - Post-market (optional)

### Data APIs (数据API)
- `get_history()` - Historical K-line data
- `get_price()` - Price by date range
- `get_all_securities()` - Get all securities
- `get_security_info()` - Security information
- `get_fundamentals()` - Fundamental data
- `get_trade_days()` - Trading calendar
- `get_index_stocks()` - Index constituents
- `get_industry()` - Industry classification
- `get_concept()` - Concept stocks

### Trading APIs (交易API)
- `order()` - Place order
- `order_target()` - Target quantity
- `order_value()` - Order by value
- `order_target_value()` - Target value
- `cancel_order()` - Cancel order
- `get_orders()` - Get orders
- `get_open_orders()` - Get open orders
- `get_trades()` - Get trades
- `get_order()` - Get order by ID

### Setting APIs (设置API)
- `set_universe()` - Set stock universe
- `set_benchmark()` - Set benchmark
- `set_slippage()` - Set slippage
- `set_commission()` - Set commission
- `set_option()` - Set options
- `set_order_cost()` - Set order costs

### Utility APIs (工具API)
- `log.info/warn/error()` - Logging
- `run_daily/weekly/monthly()` - Scheduled tasks
- `run_once()` - One-time execution

## Important Notes

1. **Stock code format**: Always use `.XSHG` for Shanghai, `.XSHE` for Shenzhen
2. **Universe required**: Always call `set_universe()` before using `get_history()`
3. **T+1 settlement**: Use `closeable_amount` to get sellable shares
4. **Order amounts**: Minimum 100 shares, automatically handled by platform
5. **Data availability**: Historical data from 2005 onwards
6. **True price testing**: Use `set_option('use_real_price', True)` for dynamic adjustment
7. **Global variable g**: Store strategy-wide variables in `g.variable_name`
8. **Context vs g**: `context` is provided by system, `g` is user-defined global

## Common Issues & Solutions

### Issue: No data returned from get_history

**Solution**: Make sure to call `set_universe()` first:
```python
def initialize(context):
    set_universe('000001.XSHE')
```

### Issue: Order rejected due to insufficient funds

**Solution**: Check available cash:
```python
def handle_data(context, data):
    cash = context.portfolio.cash
    if cash > 10000:
        order_value('000001.XSHE', cash * 0.9)
```

### Issue: Cannot sell all shares

**Solution**: Use `closeable_amount` for T+1:
```python
position = context.portfolio.positions['000001.XSHE']
sellable = position.closeable_amount
order('000001.XSHE', -sellable)
```

### Issue: Future data leakage in backtest

**Solution**: Use `set_option('avoid_future_data', True)`:
```python
def initialize(context):
    set_option('avoid_future_data', True)
```

For the most up-to-date API documentation, visit: https://www.joinquant.com/help/api/help?name:api
