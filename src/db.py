import io
import os
import yaml
from contextlib import contextmanager
from typing import Generator, List, Optional
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
import psycopg2
from src.utils import setup_logger

logger = setup_logger(__name__)

def load_db_config(config_path: str = "config/db_config.yaml") -> dict:
    """Loads database connection configuration from YAML."""
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found at {config_path}")
    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    return config["postgres"]

def get_engine(config_path: str = "config/db_config.yaml") -> Engine:
    """Creates a SQLAlchemy engine using loaded database config."""
    cfg = load_db_config(config_path)
    url = f"postgresql+psycopg2://{cfg['user']}:{cfg['password']}@{cfg['host']}:{cfg['port']}/{cfg['database']}"
    return create_engine(
        url,
        pool_size=cfg.get("pool_size", 5),
        max_overflow=cfg.get("max_overflow", 10),
        future=True
    )

def get_raw_connection(config_path: str = "config/db_config.yaml"):
    """Returns a direct psycopg2 connection for high-speed COPY operations."""
    cfg = load_db_config(config_path)
    return psycopg2.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        dbname=cfg["database"]
    )

@contextmanager
def db_session(config_path: str = "config/db_config.yaml") -> Generator:
    """Context manager for SQLAlchemy transactions."""
    engine = get_engine(config_path)
    with engine.begin() as conn:
        yield conn

def execute_sql_file(file_path: str, config_path: str = "config/db_config.yaml") -> None:
    """Executes a multi-statement SQL script file against PostgreSQL."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"SQL file not found at {file_path}")
    
    with open(file_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    logger.info(f"Executing SQL file: {file_path}")
    with db_session(config_path) as conn:
        conn.execute(text(sql_content))
    logger.info(f"Successfully executed: {file_path}")

def bulk_copy_df(
    df: pd.DataFrame, 
    table_name: str, 
    columns: Optional[List[str]] = None,
    config_path: str = "config/db_config.yaml"
) -> int:
    """
    High-performance bulk insertion using PostgreSQL's COPY ... FROM STDIN.
    Converts DataFrame directly to an in-memory CSV buffer.
    """
    if df.empty:
        logger.warning(f"DataFrame for {table_name} is empty. Skipping copy.")
        return 0

    if columns is None:
        columns = list(df.columns)

    target_df = df[columns]
    buffer = io.StringIO()
    target_df.to_csv(buffer, index=False, header=False, sep="\t", na_rep="\\N")
    buffer.seek(0)

    conn = get_raw_connection(config_path)
    cols_str = ", ".join(f'"{col}"' for col in columns)
    copy_sql = f'COPY {table_name} ({cols_str}) FROM STDIN WITH (FORMAT CSV, DELIMITER E\'\\t\', NULL \'\\N\')'

    try:
        with conn.cursor() as cursor:
            cursor.copy_expert(copy_sql, buffer)
        conn.commit()
        row_count = len(df)
        logger.info(f"Successfully loaded {row_count:,} rows into {table_name} via COPY.")
        return row_count
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to bulk load into {table_name}: {e}")
        raise
    finally:
        conn.close()
