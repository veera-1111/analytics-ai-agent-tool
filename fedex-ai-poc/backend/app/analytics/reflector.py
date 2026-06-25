"""
Database schema reflector for dynamic DDL extraction.
"""

from sqlalchemy import create_engine, inspect
from app.config import settings

def get_schema_ddl(database_url: str | None = None) -> str:
    """
    Reflect the target database schema and build a clean DDL description for prompt injection.
    """
    url = database_url or settings.target_database_url
    
    # Adjust SQLite paths if relative
    if url.startswith("sqlite:///"):
        # Ensure we don't have relative path resolution issues
        pass
        
    engine = create_engine(url)
    try:
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
    except Exception as e:
        # Fallback or error return
        return f"-- Failed to connect to database or reflect schema: {str(e)}"
    
    table_ddls = []
    
    # Tables to ignore (application metadata tables)
    ignore_tables = {
        "savedreport", "conversationlog", "conversation_log", 
        "peewee_migrations", "sqlite_sequence", "migratehistory"
    }
    
    for table_name in table_names:
        if table_name.lower() in ignore_tables:
            continue
            
        columns_info = []
        try:
            # Retrieve columns metadata
            columns = inspector.get_columns(table_name)
            for col in columns:
                col_name = col["name"]
                col_type = str(col["type"])
                nullable = "NULL" if col.get("nullable", True) else "NOT NULL"
                columns_info.append(f"  {col_name} {col_type} {nullable}")
                
            # Retrieve primary key metadata
            pk_constraint = inspector.get_pk_constraint(table_name)
            if pk_constraint and pk_constraint.get("constrained_columns"):
                pks = ", ".join(pk_constraint["constrained_columns"])
                columns_info.append(f"  PRIMARY KEY ({pks})")
                
            # Retrieve foreign key metadata
            fks = inspector.get_foreign_keys(table_name)
            for fk in fks:
                constrained = ", ".join(fk["constrained_columns"])
                referred_table = fk["referred_table"]
                referred_cols = ", ".join(fk["referred_columns"])
                columns_info.append(f"  FOREIGN KEY ({constrained}) REFERENCES {referred_table}({referred_cols})")
                
        except Exception as col_err:
            columns_info.append(f"  -- Error reflecting columns: {str(col_err)}")
            
        ddl = f"CREATE TABLE {table_name} (\n" + ",\n".join(columns_info) + "\n);"
        table_ddls.append(ddl)
        
    return "\n\n".join(table_ddls)
