from __future__ import annotations

from collections import Counter
from threading import Lock


def _sanitize_metric_label(value: str) -> str:
    if not value:
        return 'unknown'
    return ''.join(ch if ch.isalnum() or ch == '_' else '_' for ch in value.lower())


class MetricsStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._total_requests = 0
        self._total_errors = 0
        self._total_latency_ms = 0.0
        self._max_latency_ms = 0.0
        self._status_counts: Counter[str] = Counter()
        self._path_counts: Counter[str] = Counter()
        self._rate_limited_count = 0
        self._suspicious_signal_counts: Counter[str] = Counter()

    def record_request(self, path: str, status_code: int, latency_ms: float) -> None:
        safe_path = _sanitize_metric_label(path)
        status_key = str(status_code)
        with self._lock:
            self._total_requests += 1
            self._status_counts[status_key] += 1
            self._path_counts[safe_path] += 1
            self._total_latency_ms += latency_ms
            self._max_latency_ms = max(self._max_latency_ms, latency_ms)
            if status_code >= 500:
                self._total_errors += 1

    def record_rate_limited(self, path: str) -> None:
        with self._lock:
            self._rate_limited_count += 1
            self._path_counts[_sanitize_metric_label(path)] += 1

    def record_suspicious_signal(self, signal_type: str) -> None:
        with self._lock:
            self._suspicious_signal_counts[_sanitize_metric_label(signal_type)] += 1

    def snapshot(self) -> dict[str, object]:
        with self._lock:
            average_latency = self._total_latency_ms / self._total_requests if self._total_requests else 0.0
            return {
                'requests_total': self._total_requests,
                'errors_total': self._total_errors,
                'error_rate': round((self._total_errors / self._total_requests) * 100, 2) if self._total_requests else 0.0,
                'avg_latency_ms': round(average_latency, 2),
                'max_latency_ms': round(self._max_latency_ms, 2),
                'status_counts': dict(self._status_counts),
                'rate_limited_total': self._rate_limited_count,
                'top_paths': self._path_counts.most_common(10),
                'suspicious_signals': dict(self._suspicious_signal_counts),
            }

    def render_prometheus(self) -> str:
        snapshot = self.snapshot()
        lines = [
            '# HELP sqli_requests_total Total HTTP requests seen by backend',
            '# TYPE sqli_requests_total counter',
            f"sqli_requests_total {snapshot['requests_total']}",
            '# HELP sqli_errors_total Total 5xx HTTP responses',
            '# TYPE sqli_errors_total counter',
            f"sqli_errors_total {snapshot['errors_total']}",
            '# HELP sqli_request_latency_ms_avg Average request latency in milliseconds',
            '# TYPE sqli_request_latency_ms_avg gauge',
            f"sqli_request_latency_ms_avg {snapshot['avg_latency_ms']}",
            '# HELP sqli_request_latency_ms_max Maximum observed latency in milliseconds',
            '# TYPE sqli_request_latency_ms_max gauge',
            f"sqli_request_latency_ms_max {snapshot['max_latency_ms']}",
            '# HELP sqli_rate_limited_total Total requests blocked by rate limiting',
            '# TYPE sqli_rate_limited_total counter',
            f"sqli_rate_limited_total {snapshot['rate_limited_total']}",
        ]

        status_counts: dict[str, int] = snapshot['status_counts']  # type: ignore[assignment]
        for status, count in status_counts.items():
            lines.append(f'sqli_status_total{{status="{status}"}} {count}')

        suspicious: dict[str, int] = snapshot['suspicious_signals']  # type: ignore[assignment]
        for signal_type, count in suspicious.items():
            lines.append(f'sqli_suspicious_signal_total{{signal="{signal_type}"}} {count}')

        return '\n'.join(lines) + '\n'


metrics_store = MetricsStore()
