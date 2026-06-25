TOOLS = [
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
