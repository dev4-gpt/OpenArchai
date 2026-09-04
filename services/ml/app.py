"""Deploy entrypoint only — run as `modal deploy app.py`. Never imported by
reconstruct.py or render.py (they import shared infra from modal_common.py
instead), so these imports only ever fire at local deploy time, not inside
each function's own remote container."""

from modal_common import app  # noqa: F401

import reconstruct  # noqa: E402,F401
import render  # noqa: E402,F401
