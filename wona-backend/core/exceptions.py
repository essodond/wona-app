from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    response.data = {
        "erreur": {
            "code": getattr(exc, "default_code", "erreur"),
            "details": response.data,
        }
    }
    return response
