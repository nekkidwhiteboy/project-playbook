from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPagination(PageNumberPagination):
    page_size_query_param = "page_size"

    def get_paginated_response(self, data):
        return Response(data, headers={
            "Pagination-Page-Size": self.page.paginator.per_page,
            "Pagination-Page-Current": self.page.number,
            "Pagination-Page-Limit": self.page.paginator.num_pages,
            "Total-Count": self.page.paginator.count
        })
