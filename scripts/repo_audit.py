#!/usr/bin/env python3
"""
MOD SQUAD Repository Audit Script
Validates configuration consistency, port usage, and security

NO EMOJIS - Windows cp1252 encoding safe
"""

import json
import sys
import re
import os
from datetime import datetime, timezone
from typing import Dict, List, Any
from pathlib import Path


def load_config() -> Dict[str, Any]:
    """Load MOD SQUAD configuration"""
    try:
        with open("mod_squad.config.json", 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as e:
        print(f"[WARN] Invalid JSON in config: {e}")
        return {}


def find_port_references(root_dir: str = ".") -> Dict[str, List[str]]:
    """Find all port references in config files"""
    port_refs = {}
    patterns = [
        r'localhost:(\d+)',
        r'"port":\s*(\d+)',
        r'PORT=(\d+)',
        r':(\d+)/'
    ]

    # Files to check
    config_extensions = ['.json', '.js', '.ts', '.tsx', '.yml', '.yaml', '.env', '.md']

    for root, dirs, files in os.walk(root_dir):
        # Skip node_modules, .git, etc.
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.next', 'dist', 'build']]

        for file in files:
            if any(file.endswith(ext) for ext in config_extensions):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        for pattern in patterns:
                            matches = re.findall(pattern, content)
                            for port in matches:
                                if port not in port_refs:
                                    port_refs[port] = []
                                port_refs[port].append(file_path)
                except Exception:
                    continue

    return port_refs


def check_port_consistency() -> Dict[str, Any]:
    """Check for port consistency issues"""
    print("[INFO] Checking port consistency...")

    config = load_config()
    recommended_ports = config.get("validation", {}).get("port_consistency", {}).get("recommended_ports", {})
    dangerous_ports = config.get("validation", {}).get("port_consistency", {}).get("dangerous_ports", [])

    port_refs = find_port_references()

    errors = []
    warnings = []
    info = []

    # Check for dangerous ports
    for port in dangerous_ports:
        if str(port) in port_refs:
            errors.append(f"Dangerous port {port} found in: {', '.join(port_refs[str(port)])}")

    # Report port usage
    for port, files in port_refs.items():
        if len(files) > 1:
            info.append(f"Port {port} referenced in {len(files)} files")

    return {
        "check": "port_consistency",
        "status": "fail" if errors else "pass",
        "errors": errors,
        "warnings": warnings,
        "info": info
    }


def check_required_files() -> Dict[str, Any]:
    """Check if required MOD SQUAD files exist"""
    print("[INFO] Checking required files...")

    required_files = [
        "MOD_SQUAD_LIVE_FEED.md",
        "mod_squad.config.json",
        ".cursorrules-modsquad"
    ]

    errors = []
    warnings = []
    info = []

    for file in required_files:
        if not os.path.exists(file):
            errors.append(f"Required file missing: {file}")
        else:
            info.append(f"[OK] {file} exists")

    return {
        "check": "required_files",
        "status": "fail" if errors else "pass",
        "errors": errors,
        "warnings": warnings,
        "info": info
    }


def check_gitignore() -> Dict[str, Any]:
    """Check .gitignore for important patterns"""
    print("[INFO] Checking .gitignore...")

    required_patterns = [
        "node_modules",
        ".env",
        ".env.local"
    ]

    errors = []
    warnings = []
    info = []

    if not os.path.exists(".gitignore"):
        warnings.append("No .gitignore file found")
        return {
            "check": "gitignore",
            "status": "pass",
            "errors": errors,
            "warnings": warnings,
            "info": info
        }

    try:
        with open(".gitignore", 'r', encoding='utf-8') as f:
            content = f.read()

        for pattern in required_patterns:
            if pattern not in content:
                warnings.append(f"Pattern '{pattern}' not found in .gitignore")
            else:
                info.append(f"[OK] Pattern '{pattern}' found")

    except Exception as e:
        warnings.append(f"Could not read .gitignore: {e}")

    return {
        "check": "gitignore",
        "status": "pass",
        "errors": errors,
        "warnings": warnings,
        "info": info
    }


def main():
    """Run repository audit"""
    print("[INFO] Starting MOD SQUAD repository audit...\n")

    checks = [
        check_required_files(),
        check_port_consistency(),
        check_gitignore()
    ]

    # Aggregate results
    all_pass = all(check["status"] == "pass" for check in checks)
    total_errors = sum(len(check["errors"]) for check in checks)
    total_warnings = sum(len(check["warnings"]) for check in checks)

    # Print detailed results
    for check in checks:
        print(f"\n[INFO] Check: {check['check']}")
        print(f"[INFO] Status: {check['status']}")

        for error in check["errors"]:
            print(f"[FAIL] {error}")

        for warning in check["warnings"]:
            print(f"[WARN] {warning}")

        if not check["errors"] and not check["warnings"]:
            print("[OK] No issues found")

    # Generate report
    report = {
        "status": "pass" if all_pass and total_errors == 0 else "fail",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_checks": len(checks),
        "passed": sum(1 for c in checks if c["status"] == "pass"),
        "failed": sum(1 for c in checks if c["status"] == "fail"),
        "total_errors": total_errors,
        "total_warnings": total_warnings,
        "checks": checks
    }

    # Save report
    try:
        os.makedirs("reports", exist_ok=True)
        report_file = "reports/repo-audit.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
        print(f"\n[INFO] Report saved to {report_file}")
    except Exception as e:
        print(f"\n[WARN] Could not save report: {e}")

    # Summary
    print(f"\n[INFO] Summary:")
    print(f"[INFO] - Total errors: {total_errors}")
    print(f"[INFO] - Total warnings: {total_warnings}")
    print(f"[INFO] - Checks passed: {report['passed']}/{report['total_checks']}")

    if all_pass and total_errors == 0:
        print("\n[OK] Repository audit passed")
        sys.exit(0)
    else:
        print("\n[FAIL] Repository audit failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
