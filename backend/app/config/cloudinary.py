import cloudinary
import cloudinary.uploader

from config.settings import settings


class _KeywordRequestHTTPConnector:
    """Adapter that forces Cloudinary HTTP requests to use keyword arguments.

    Cloudinary's older upload helpers pass the multipart payload positionally.
    urllib3 2.x changed the request signature enough that those positional
    arguments can be misinterpreted as both `fields` and `body`.
    """

    def __init__(self, connector):
        self._connector = connector

    def request(self, method, url, fields=None, headers=None, **kwargs):
        return self._connector.request(
            method,
            url,
            fields=fields,
            headers=headers,
            **kwargs,
        )

    def __getattr__(self, item):
        return getattr(self._connector, item)

def init_cloudinary():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET
    )

    if not isinstance(cloudinary.uploader._http, _KeywordRequestHTTPConnector):
        cloudinary.uploader._http = _KeywordRequestHTTPConnector(cloudinary.uploader._http)

    try:
        from cloudinary.api_client import execute_request

        if not isinstance(execute_request._http, _KeywordRequestHTTPConnector):
            execute_request._http = _KeywordRequestHTTPConnector(execute_request._http)
    except Exception:
        pass