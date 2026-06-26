TOOLS = [
    {
        "name": "render_chart",
        "description": (
            "Render a chart directly in the chat interface. Call this ONLY when the user explicitly "
            "asks for a chart, graph, visualization, or uses words like 'show me', 'plot', 'bar chart', "
            "'trend', 'compare visually', 'pie chart', 'line chart'. "
            "Do NOT call this for plain text questions, single-value answers, or when the user "
            "just wants a number or a summary table. "
            "Use this instead of suggesting external tools — you CAN create charts here."
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
            "After answering the user's question, ALWAYS call this to suggest 3-4 intelligent "
            "follow-up questions based on what was just found in the data. "
            "Each suggestion should be a natural next step: drill deeper, compare something, "
            "spot a trend, or explore an anomaly revealed by the answer. "
            "Categorize each as: 'drilldown' (go deeper), 'chart' (visualize this), "
            "'compare' (compare two things), or 'export' (get the data)."
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
