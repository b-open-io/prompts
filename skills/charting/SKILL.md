---
name: charting
version: 1.0.0
description: |-
  Full-stack data visualization and charting intelligence. This skill should be used when the user asks to "create a chart", "visualize this data", "build a dashboard", "plot this", "graph these metrics", "show me a chart of", "make a bar chart", "create a line graph", "build a heatmap", or needs help choosing the right chart type, selecting a charting library, or engineering the data pipeline from raw database state to rendered visualization. Covers chart selection, data transformation, library choice by scale, performance optimization, and accessibility.
---

# Charting Intelligence & Data-to-Viz Pipeline Engineering

Enable any agent to (1) instantly identify the exact chart needed from raw data, (2) generate the precise path of queries/transforms to materialize that chart, and (3) evaluate and choose the optimal charting library/stack based on performance, scale, and interactivity requirements.

This is not "just call a library" — it is full-stack visualization strategy.

## 1. Core Decision Framework — Choosing the Chart That Fits the Data AND the Story

Before any code runs, answer these questions in order:

### What is the goal of the viewer?

| Goal | Chart Type |
|------|-----------|
| Compare values | Bar/Column (grouped or stacked) |
| Show trend over time | Line or Area |
| Show distribution / spread | Histogram, Box Plot, Violin |
| Show relationship / correlation | Scatter, Bubble, Heatmap |
| Show composition / parts-of-whole | Stacked Bar or Area (never pie if >5 slices) |
| Show hierarchy / flow | Treemap, Sunburst, Sankey |
| Show geographic pattern | Choropleth or Symbol Map |

### How many variables and what types?

| Variables | Chart |
|-----------|-------|
| 1 numeric, unordered | Histogram / Density |
| 1 numeric + time | Line |
| 1 categorical + 1 numeric | Bar |
| 2 numeric | Scatter |
| 1 categorical + time series | Grouped or Stacked Line/Area |
| Many-to-many relationships | Heatmap or Parallel Coordinates |

### Audience & Context Check

| Audience | Approach |
|----------|----------|
| Executive dashboard | Big numbers + simple bars/lines, zero clutter |
| Analyst/explorer | Interactive tooltips, zoom, hover details, multiple linked views |
| Mobile | Horizontal bars, large text, minimal colors |
| Accessibility | High contrast, patterns instead of color-only, alt-text descriptions |

### Rule of Thumb Table

| Data Situation | Best Chart (first choice) | Avoid |
|---------------|--------------------------|-------|
| >5 categories | Bar (horizontal) | Pie |
| Time series >20 points | Line | Column |
| Correlation between 2 measures | Scatter | Line (unless ordered) |
| Parts of whole >5 slices | Stacked Bar or Treemap | Pie/Donut |
| Outliers or distribution shape | Box + Violin | Bar |
| Flow between stages | Sankey | Anything else |

## 2. The Data Pipeline Engine

Most databases do NOT have the exact aggregation ready. Auto-generate the full pipeline:

### Step A — Inventory

- Scan schema or sample 100 rows — detect column types, null rates, cardinality
- Flag missing aggregations (e.g., "no daily_sales_by_region view exists")

### Step B — Required Transformations

Auto-generate SQL or pandas code for:
- Joins needed?
- GROUP BY + SUM/AVG/COUNT?
- Window functions for running totals or YoY?
- Binning (e.g., age into decades)?
- Pivot/unpivot?
- Outlier flagging or imputation?

### Step C — Materialization Strategy

| Scale | Strategy |
|-------|----------|
| One-off (<10k rows) | Run query on-the-fly |
| Medium | Create materialized view or cached table |
| Large/Real-time | Pre-aggregate in Spark/DuckDB, incremental refresh |
| Extreme | Stream + windowed aggregates (Flink/Kafka) |

### Step D — Validation

- Run a tiny sample query first — confirm the shape matches the chosen chart type
- If not, loop back and adjust aggregation

### Example

User says "show monthly revenue by product category":

> "I need: LEFT JOIN orders -> products -> categories; GROUP BY month, category; SUM(revenue). No view exists -> I will create temp table or run inline. Chart type: Stacked Area. Library recommendation below."

## 3. Library Selection Matrix

Always output the performance trade-off and recommended stack.

| Scale / Requirement | Recommended Library | Why | Fallback |
|--------------------|-------------------|-----|----------|
| <10k points, simple web dashboard | Chart.js or Recharts | <10 ms render, ~60 KB bundle | N/A |
| 10k-500k points, interactive | Apache ECharts or Plotly.js | Canvas + WebGL, 60 fps on 100k points | D3 (slower) |
| 500k-10M+ points, real-time | LightningChart or Highcharts Stock + WebGL | GPU accelerated, <50 ms at 5M points | Anything SVG-based fails |
| Python backend + web | Plotly Dash or Bokeh | Server-side render + client streaming | Matplotlib (static only) |
| Python notebook exploration | Seaborn + Plotly | Instant, beautiful defaults | -- |
| Extremely large / streaming | DuckDB + Observable Plot or Perspective | In-memory columnar, sub-second on billions | -- |
| No JavaScript (PDF reports) | Matplotlib + WeasyPrint or ReportLab | Pure Python, vector output | -- |

### Optimization Rules (apply automatically)

- **Downsample** for overview, show full detail on zoom (ECharts built-in)
- **Use Canvas instead of SVG** above ~5k elements
- **Pre-aggregate at DB level** whenever possible (biggest single win)
- **Lazy load** charts below the fold
- **Bundle size**: tree-shake everything except the one chart type you need
- **GPU vs CPU**: if >100k points and user needs pan/zoom, force WebGL path

## 4. Full Workflow

1. **Parse intent** — identify required chart type from user request
2. **Schema scan** — detect column types, cardinality, row estimates
3. **Decision framework** — output chart recommendation + rationale
4. **Generate transforms** — exact SQL/pandas/transform code needed
5. **Choose library** — select by performance tier based on row estimate
6. **Emit deliverables**:
   - Chart spec (JSON for the library or React component)
   - SQL/transform script
   - Performance warning or confirmation
   - Accessibility note + alt-text template

## 5. Advanced Capabilities

- **"Show me what I should be charting but aren't"** — auto-correlation scan + suggested visuals
- **"Optimize this dashboard for 10x speed"** — rewrite query + switch library
- **"Make this mobile-first"** — auto-switch to horizontal bars + simplify
- **Color-blind & accessibility mode** — toggle patterns, high contrast
- **Export** — SVG/PNG/PDF with embedded data table
