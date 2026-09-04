import os

from fastapi import HTTPException
from supabase import Client, create_client


def get_supabase_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def verify_shared_secret(provided: str | None) -> None:
    expected = os.environ["SHARED_SECRET"]
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Invalid shared secret")


def download_from_storage(supabase: Client, bucket: str, path: str) -> bytes:
    return supabase.storage.from_(bucket).download(path)


def upload_to_storage(supabase: Client, bucket: str, path: str, data: bytes, content_type: str) -> None:
    supabase.storage.from_(bucket).upload(
        path, data, {"content-type": content_type, "upsert": "true"}
    )


def update_status(supabase: Client, table: str, row_id: str, status: str, **extra) -> None:
    payload = {"status": status, **extra}
    supabase.table(table).update(payload).eq("id", row_id).execute()
