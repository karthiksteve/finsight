"""
FinSight AI - Cross-Platform Application Launcher
Runs backend and frontend processes concurrently.
"""

import subprocess
import sys
import time
import webbrowser
from pathlib import Path

def main():
    root_dir = Path(__file__).parent
    backend_dir = root_dir / "backend"
    frontend_dir = root_dir / "frontend"

    print("=" * 65)
    print("                 FinSight AI Platform Launcher")
    print("=" * 65)

    # 1. Run quick verification
    print("\n[*] Verifying local models and dependencies...")
    subprocess.run([sys.executable, "verify_system.py"], cwd=root_dir)

    # 2. Start Backend
    print("\n[*] Starting FastAPI backend on http://localhost:8001...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001", "--reload"],
        cwd=backend_dir
    )

    # 3. Start Frontend
    print("[*] Starting React Vite frontend on http://localhost:5173...")
    frontend_proc = subprocess.Popen(
        ["npm.cmd" if sys.platform == "win32" else "npm", "run", "dev"],
        cwd=frontend_dir
    )

    # 4. Open browser
    time.sleep(3)
    print("\n[*] Opening application in browser: http://localhost:5173")
    webbrowser.open("http://localhost:5173")

    print("\n" + "=" * 65)
    print("Press Ctrl+C in this terminal to stop both servers.")
    print("=" * 65)

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down FinSight AI...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Done.")

if __name__ == "__main__":
    main()
