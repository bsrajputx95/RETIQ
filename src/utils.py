import logging
import os
import sys
import time
from functools import wraps
from typing import Any, Callable

def setup_logger(name: str = "retailIQ", log_file: str = "pipeline.log", level: int = logging.INFO) -> logging.Logger:
    """Configures structured console and file logging."""
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if not logger.handlers:
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )

        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        # File handler
        os.makedirs("logs", exist_ok=True)
        file_handler = logging.FileHandler(os.path.join("logs", log_file), encoding="utf-8")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger

def timed_step(step_name: str) -> Callable:
    """Decorator to log execution time of critical pipeline steps."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            logger = logging.getLogger("retailIQ")
            logger.info(f"==> Starting: {step_name}")
            start_time = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                elapsed = time.perf_counter() - start_time
                logger.info(f"==> Completed: {step_name} in {elapsed:.2f}s")
                return result
            except Exception as e:
                elapsed = time.perf_counter() - start_time
                logger.error(f"==> FAILED: {step_name} after {elapsed:.2f}s with error: {e}")
                raise
        return wrapper
    return decorator
