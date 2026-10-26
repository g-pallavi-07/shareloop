import os

import pymysql
from dotenv import load_dotenv
from flask import current_app, g
from pymysql.cursors import DictCursor

load_dotenv()


def get_db():
    if "db" not in g:
        g.db = pymysql.connect(
            host=current_app.config["DB_HOST"],
            port=current_app.config["DB_PORT"],
            user=current_app.config["DB_USER"],
            password=current_app.config["DB_PASSWORD"],
            database=current_app.config["DB_NAME"],
            charset="utf8mb4",
            cursorclass=DictCursor,
            autocommit=False,
        )
    return g.db


def close_db(_error=None):
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def database_config():
    return {
        "DB_HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "DB_PORT": int(os.getenv("DB_PORT", "3306")),
        "DB_NAME": os.getenv("DB_NAME", "shareloop_db"),
        "DB_USER": os.getenv("DB_USER", "shareloop"),
        "DB_PASSWORD": os.getenv("DB_PASSWORD", ""),
    }
