#!/usr/bin/env python3
"""
MOD SQUAD Health Check Script
Validates all services are running and healthy

NO EMOJIS - Windows cp1252 encoding safe
"""

import json
import sys
import requests
from datetime import datetime, timezone
from typing import Dict, List, Any

# Load config
CONFIG_FILE = "mod_squad.config.json"


def load_config() -> Dict[str, Any]:
    """Load MOD SQUAD configuration"""
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"[FAIL] Config file not found: {CONFIG_FILE}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"[FAIL] Invalid JSON in config: {e}")
        sys.exit(1)


def check_service(name: str, health_url: str, timeout: int = 5) -> Dict[str, Any]:
    """Check if a service is healthy"""
    result = {
        "service": name,
        "url": health_url,
        "status": "unknown",
        "response_time_ms": 0,
        "error": None
    }

    try:
        start = datetime.now(timezone.utc)
        response = requests.get(health_url, timeout=timeout)
        end = datetime.now(timezone.utc)

        result["response_time_ms"] = int((end - start).total_seconds() * 1000)

        if response.status_code == 200:
            result["status"] = "pass"
        else:
            result["status"] = "fail"
            result["error"] = f"HTTP {response.status_code}"

    except requests.exceptions.ConnectionError:
        result["status"] = "fail"
        result["error"] = "Connection refused - service not running"
    except requests.exceptions.Timeout:
        result["status"] = "fail"
        result["error"] = f"Timeout after {timeout}s"
    except Exception as e:
        result["status"] = "fail"
        result["error"] = str(e)

    return result


def main():
    """Run health checks on all services"""
    print("[INFO] Starting MOD SQUAD health checks...")

    config = load_config()
    services = config.get("services", {})

    if not services:
        print("[WARN] No services configured")
        sys.exit(0)

    results = []
    all_pass = True

    for service_key, service_config in services.items():
        health_url = service_config.get("health_check")

        if not health_url:
            print(f"[SKIP] {service_config.get('name', service_key)} - no health check URL")
            continue

        print(f"[INFO] Checking {service_config.get('name', service_key)}...")
        result = check_service(service_config.get('name', service_key), health_url)
        results.append(result)

        if result["status"] == "pass":
            print(f"[OK] {result['service']} - {result['response_time_ms']}ms")
        else:
            print(f"[FAIL] {result['service']} - {result['error']}")
            all_pass = False

    # Generate report
    report = {
        "status": "pass" if all_pass else "fail",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_services": len(results),
        "passed": sum(1 for r in results if r["status"] == "pass"),
        "failed": sum(1 for r in results if r["status"] == "fail"),
        "results": results
    }

    # Output JSON report
    report_file = "reports/health-check.json"
    try:
        import os
        os.makedirs("reports", exist_ok=True)
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
        print(f"[INFO] Report saved to {report_file}")
    except Exception as e:
        print(f"[WARN] Could not save report: {e}")

    # Summary
    print(f"\n[INFO] Summary: {report['passed']}/{report['total_services']} services healthy")

    if all_pass:
        print("[OK] All services are healthy")
        sys.exit(0)
    else:
        print("[FAIL] Some services are unhealthy")
        sys.exit(1)


if __name__ == "__main__":
    main()
