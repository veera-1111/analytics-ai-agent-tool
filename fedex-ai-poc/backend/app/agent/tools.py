TOOLS = [
    {
        "name": "render_chart",
        "description": (
            "Render an interactive chart in the chat. "
            "ONLY call this tool when the user's message explicitly contains a chart/visualization keyword: "
            "'chart', 'graph', 'plot', 'bar', 'line', 'pie', 'trend', 'visualize', 'show as chart'. "
            "DO NOT call this for plain questions about counts, averages, rankings, or summaries — "
            "those get a text answer only. When the user hasn't asked for a chart, suggest one "
            "via suggest_followups instead so the user can choose."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Chart title"},
                "chart_type": {
                    "type": "string",
                    "enum": ["bar", "line", "pie"],
                    "description": "bar for comparisons/rankings, line for trends over time, pie for proportions",
                },
                "labels": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "X-axis labels or pie slice names (max 12 items)",
                },
                "values": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Numeric values corresponding to each label",
                },
                "value_label": {
                    "type": "string",
                    "description": "Y-axis label describing what the values represent",
                },
                "color": {
                    "type": "string",
                    "description": "Hex color for bar/line chart (e.g. #6366f1). Optional.",
                },
            },
            "required": ["title", "chart_type", "labels", "values", "value_label"],
        },
    },
    {
        "name": "suggest_followups",
        "description": (
            "ALWAYS call this after every answer to provide 3-4 smart follow-up suggestions. "
            "At least one suggestion must offer to visualize the data as a chart (category: 'chart') "
            "so the user can request a visualization if they want one. "
            "Other suggestions should drill deeper, compare something, or spot a trend. "
            "Categories: 'drilldown' (go deeper into the data), 'chart' (visualize as a chart), "
            "'compare' (compare two segments), 'export' (get the raw data)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "suggestions": {
                    "type": "array",
                    "description": "3-4 follow-up suggestions",
                    "items": {
                        "type": "object",
                        "properties": {
                            "label": {"type": "string", "description": "Short CTA button text (5-8 words)"},
                            "prompt": {"type": "string", "description": "Full question to send when clicked"},
                            "category": {
                                "type": "string",
                                "enum": ["drilldown", "chart", "compare", "export"],
                            },
                        },
                        "required": ["label", "prompt", "category"],
                    },
                    "minItems": 3,
                    "maxItems": 4,
                },
            },
            "required": ["suggestions"],
        },
    },
    {
        "name": "list_tables",
        "description": (
            "List all available tables in the connected database with their column names. "
            "Use this when you need to explore what data is available."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_table_sample",
        "description": (
            "Get sample rows and column data types from a specific table. "
            "Use this to understand the data format before writing a query."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "table_name": {
                    "type": "string",
                    "description": "Name of the table to sample",
                },
                "limit": {
                    "type": "integer",
                    "description": "Number of sample rows to return (default 5)",
                    "default": 5,
                },
            },
            "required": ["table_name"],
        },
    },
    {
        "name": "run_sql",
        "description": (
            "Execute a read-only SELECT SQL query against the user's database and return the results. "
            "Only SELECT and WITH (CTE) queries are permitted. "
            "Always include a LIMIT clause. If a query fails, you will receive the error — "
            "analyse it and retry with a corrected query."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The SQL SELECT query to execute",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum rows to return (default 1000, max 10000)",
                    "default": 1000,
                },
            },
            "required": ["query"],
        },
    },
]
