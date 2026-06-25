"""
Read-only SQL query executor with safety guarantees.
"""

from sqlalchemy import create_engine, text
from app.config import settings

def execute_query(sql: str, database_url: str | None = None) -> dict:
    """
    Execute a SELECT query against the target database safely.
    Returns:
        dict: {"columns": [...], "data": [...], "total_rows": int}
    """
    url = database_url or settings.target_database_url
    engine = create_engine(url)
    
    # 1. Basic safety checks
    clean_sql = sql.strip().lstrip(" \t\n\r(;")
    lower_sql = clean_sql.lower()
    
    if not (lower_sql.startswith("select") or lower_sql.startswith("with")):
        raise ValueError("Security Violation: Only SELECT or WITH queries are allowed.")
        
    # Block common mutation keywords to prevent semi-colon chaining injections
    malicious_keywords = ["insert ", "update ", "delete ", "drop ", "truncate ", "alter ", "create ", "replace "]
    for keyword in malicious_keywords:
        if keyword in lower_sql:
            raise ValueError(f"Security Violation: Query contains prohibited keyword '{keyword.strip()}'")
            
    # 2. Connection execution
    with engine.connect() as connection:
        # We explicitly start a transaction and roll it back at the end
        # to ensure that no mutations can ever persist.
        trans = connection.begin()
        try:
            result = connection.execute(text(sql))
            columns = list(result.keys())
            
            # Extract rows as dictionaries mapping column names to values
            data = []
            for row in result:
                data.append(dict(row._mapping))
                
            trans.rollback()
            return {
                "columns": columns,
                "data": data,
                "total_rows": len(data)
            }
        except Exception as e:
            trans.rollback()
            raise RuntimeError(f"Database Query Execution Failed: {str(e)}")
