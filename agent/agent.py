"""
TimeTracker Python Agent
========================
Tracks keyboard & mouse activity and reports to the TimeTracker backend.

Thresholds:
  IDLE_THRESHOLD  = 30s   (30s of no activity → status: idle)
  AWAY_THRESHOLD  = 60s   (1 min of no activity → status: away)

Unproductive tracking:
  Detects active window process name or browser tab URL/title.
  If it matches UNPRODUCTIVE_APPS or UNPRODUCTIVE_DOMAINS, the
  unproductive counter runs (instead of / alongside active counter).

Install dependencies:
  pip install pynput requests python-dotenv pywin32

How to use:
  1. Copy agent_config.env.example → agent_config.env
  2. Fill in your API token (login via the web app first and copy the
     token from localStorage key 'tt_token', or run `python agent.py --login`)
  3. Run:  python agent.py
  4. For auto-start on Windows: add a Task Scheduler entry pointing to
     pythonw agent.py (so it runs silently in the background).
"""

import time
import threading
import requests  # type: ignore[import]
import json
import os
import sys
import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from pynput import keyboard, mouse  # type: ignore[import]
except ImportError:
    print("ERROR: pynput not installed. Run:  pip install pynput requests python-dotenv pywin32")
    sys.exit(1)

try:
    from dotenv import load_dotenv  # type: ignore[import]
except ImportError:
    def load_dotenv(*a, **k): pass  # type: ignore[misc]  # graceful degradation

# ── pywin32 for active-window detection (optional but recommended) ─────────────
try:
    import win32gui       # type: ignore[import]
    import win32process   # type: ignore[import]
    import psutil         # type: ignore[import]
    WIN32_AVAILABLE = True
except ImportError:
    WIN32_AVAILABLE = False

# ── Config ──────────────────────────────────────────────────────────────────
CONFIG_FILE = Path(__file__).parent / "agent_config.env"
load_dotenv(CONFIG_FILE)

API_BASE        = os.getenv("TT_API_BASE", "http://localhost:5000/api")
API_TOKEN       = os.getenv("TT_API_TOKEN", "")  # JWT token
HEARTBEAT_SEC   = int(os.getenv("TT_HEARTBEAT_SEC", "30"))   # how often to push data
IDLE_THRESHOLD  = int(os.getenv("TT_IDLE_SEC",  "30"))       # 30s → idle
AWAY_THRESHOLD  = int(os.getenv("TT_AWAY_SEC", "60"))        # 1 minute → away

# ── Unproductive App / Domain Lists ─────────────────────────────────────────
UNPRODUCTIVE_APPS = {
    "steam.exe",
    "epicgameslauncher.exe",
    "spotify.exe",
    "discord.exe",
}

UNPRODUCTIVE_DOMAINS = {
    "facebook.com",
    "instagram.com",
    "youtube.com",
    "netflix.com",
    "tiktok.com",
    "reddit.com",
    "amazon.com",
    "flipkart.com",
}

# Browser process names to check window title for domain detection
BROWSER_PROCESSES = {
    "chrome.exe",
    "firefox.exe",
    "msedge.exe",
    "opera.exe",
    "brave.exe",
    "vivaldi.exe",
    "iexplore.exe",
}

# ── Logging ─────────────────────────────────────────────────────────────────
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "agent.log"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("TTAgent")


# ── Active Window Detection ──────────────────────────────────────────────────
def get_active_window_info() -> tuple:
    """
    Returns (process_name_lower, window_title_lower) of the focused window.
    Falls back to ('', '') if pywin32 is not available or an error occurs.
    """
    if not WIN32_AVAILABLE:
        return ('', '')
    try:
        hwnd = win32gui.GetForegroundWindow()
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        proc = psutil.Process(pid)
        proc_name = str(proc.name()).lower()
        title = str(win32gui.GetWindowText(hwnd)).lower()
        return (proc_name, title)
    except Exception:
        return ('', '')


def is_unproductive_window() -> bool:
    """
    Returns True if the current foreground window is an unproductive app
    or a browser showing an unproductive domain.

    Browser window titles show the PAGE TITLE (e.g. "Instagram", "YouTube"),
    NOT the URL. So we match by the base domain name (strip TLD).
    e.g. "instagram.com" → match "instagram" in title.
    """
    result = get_active_window_info()
    proc_name: str = result[0]
    title: str = result[1]

    # Check unproductive apps directly (e.g. steam.exe, discord.exe)
    if proc_name in UNPRODUCTIVE_APPS:
        return True

    # Check browser tabs via window title
    if proc_name in BROWSER_PROCESSES:
        for domain in UNPRODUCTIVE_DOMAINS:
            # Extract base name before first dot: "instagram.com" → "instagram"
            base_name = domain.split('.')[0]   # e.g. "instagram"
            if base_name in title:
                return True
            # Also check full domain in case the URL appears in the title
            if domain in title:
                return True

    return False


# ── State ────────────────────────────────────────────────────────────────────
class AgentState:
    session_id:    Optional[str]
    session_start: Optional[datetime]

    def __init__(self):
        self.lock                   = threading.Lock()
        self.last_activity:  float  = time.time()
        self.status:         str    = "active"   # active | idle | away | unproductive | out_of_shift
        self.session_id             = None        # declared above as Optional[str]
        self.session_start          = None        # declared above as Optional[datetime]
        self.active_seconds:       float = 0.0
        self.idle_seconds:         float = 0.0
        self.away_seconds:         float = 0.0
        self.unproductive_seconds: float = 0.0
        self._last_tick:     float  = time.time()
        self.is_unproductive: bool  = False   # is the current window unproductive?

    def record_activity(self):
        with self.lock:
            self.last_activity = time.time()

    def seconds_since_activity(self):
        return time.time() - self.last_activity

    def tick(self):
        """Called every second to accumulate counters."""
        now = time.time()
        with self.lock:
            elapsed = now - self._last_tick
            self._last_tick = now

            if self.status == "unproductive":
                self.unproductive_seconds += elapsed
            elif self.status == "active":
                self.active_seconds += elapsed
            elif self.status == "idle":
                self.idle_seconds += elapsed
            elif self.status == "away":
                self.away_seconds += elapsed
            # out_of_shift: do not accumulate

    @property
    def total_seconds(self):
        return self.active_seconds + self.idle_seconds + self.away_seconds + self.unproductive_seconds

def is_in_shift():
    now = datetime.now()
    hour = now.hour
    minute = now.minute
    # Shift is 19:30 (7:30 PM) to 05:00 (5:00 AM)
    if hour > 19 or (hour == 19 and minute >= 30):
        return True
    if hour < 5:
        return True
    return False


state = AgentState()


# ── HTTP helpers ─────────────────────────────────────────────────────────────
def api_post(path, body=None):
    try:
        r = requests.post(
            f"{API_BASE}{path}",
            json=body or {},
            headers={"Authorization": f"Bearer {API_TOKEN}", "Content-Type": "application/json"},
            timeout=10,
        )
        return r.json()
    except Exception as e:
        log.warning(f"POST {path} failed: {e}")
        return None


def api_get(path):
    try:
        r = requests.get(
            f"{API_BASE}{path}",
            headers={"Authorization": f"Bearer {API_TOKEN}"},
            timeout=10,
        )
        return r.json()
    except Exception as e:
        log.warning(f"GET {path} failed: {e}")
        return None


# ── Session management ────────────────────────────────────────────────────────
def start_session():
    log.info("Starting session…")
    data = api_post("/sessions/start")
    if data and data.get("success"):
        state.session_id    = data["session"]["_id"]
        state.session_start = datetime.now()
        resumed = data.get("resumed", False)
        log.info(f"Session {'resumed' if resumed else 'started'}: {state.session_id}")
        return True
    log.error(f"Failed to start session: {data}")
    return False


def end_session():
    if not state.session_id:
        return
    log.info("Ending session…")
    api_post("/sessions/end", {
        "sessionId":            state.session_id,
        "activeSeconds":        int(state.active_seconds),
        "idleSeconds":          int(state.idle_seconds),
        "awaySeconds":          int(state.away_seconds),
        "unproductiveSeconds":  int(state.unproductive_seconds),
    })
    log.info("Session ended.")


def send_heartbeat():
    if not state.session_id:
        return
    api_post("/sessions/heartbeat", {
        "sessionId":            state.session_id,
        "activeSeconds":        int(state.active_seconds),
        "idleSeconds":          int(state.idle_seconds),
        "awaySeconds":          int(state.away_seconds),
        "unproductiveSeconds":  int(state.unproductive_seconds),
        "status":               state.status,
    })
    log.debug("Heartbeat sent.")


def send_event(event_type):
    if not state.session_id:
        return
    api_post("/sessions/event", {
        "sessionId":            state.session_id,
        "type":                 event_type,
        "activeSeconds":        int(state.active_seconds),
        "idleSeconds":          int(state.idle_seconds),
        "awaySeconds":          int(state.away_seconds),
        "unproductiveSeconds":  int(state.unproductive_seconds),
    })
    log.info(f"Event sent: {event_type}")


# ── Input listeners ───────────────────────────────────────────────────────────
def on_key_press(key):
    state.record_activity()


def on_mouse_move(x, y):
    state.record_activity()


def on_mouse_click(x, y, button, pressed):
    state.record_activity()


def on_mouse_scroll(x, y, dx, dy):
    state.record_activity()


# ── Status monitor thread ─────────────────────────────────────────────────────
def monitor_loop():
    """Runs every second — checks idle/away/unproductive thresholds and sends heartbeats."""
    heartbeat_counter = 0

    while True:
        time.sleep(1)
        
        if not is_in_shift():
            if state.status != "out_of_shift":
                state.status = "out_of_shift"
                send_event("out_of_shift")
                log.info("Shift ended (5:00 AM passed). Agent paused until 7:30 PM.")
                send_heartbeat()
            # Update last_tick so we don't accumulate thousands of seconds when shift starts
            state._last_tick = time.time()
            continue
            
        state.tick()

        idle_secs = state.seconds_since_activity()

        # ── Check unproductive window ──────────────────────────────────────
        currently_unproductive = is_unproductive_window()

        # Determine desired status: unproductive overrides active (but not idle/away)
        if idle_secs >= AWAY_THRESHOLD:
            new_status = "away"
        elif idle_secs >= IDLE_THRESHOLD:
            new_status = "idle"
        elif currently_unproductive:
            new_status = "unproductive"
        else:
            new_status = "active"

        # Detect status change
        if new_status != state.status:
            old = state.status
            state.status = new_status
            if new_status == "away":
                send_event("away")
                log.info(f"-> AWAY  (inactive for {idle_secs:.0f}s)")
            elif new_status == "idle":
                send_event("idle")
                log.info(f"-> IDLE  (inactive for {idle_secs:.0f}s)")
            elif new_status == "unproductive":
                send_event("unproductive")
                log.info(f"-> UNPRODUCTIVE (switched from {old})")
            elif new_status == "active":
                if old == "unproductive":
                    send_event("resume_productive")
                    log.info(f"-> ACTIVE (productive window regained focus)")
                else:
                    send_event("resume")
                    log.info(f"-> ACTIVE (was {old})")
            
            # Immediately sync the exact accumulated counters so the backend doesn't lose the delta
            send_heartbeat()
            heartbeat_counter = 0

        # Periodic heartbeat
        heartbeat_counter += 1
        if heartbeat_counter >= HEARTBEAT_SEC:
            send_heartbeat()
            heartbeat_counter = 0


# ── Login helper ──────────────────────────────────────────────────────────────
def interactive_login():
    import getpass as gp
    print("\n── TimeTracker Agent Login ──")
    email    = input("Email: ").strip()
    password = gp.getpass("Password: ")
    try:
        r = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=10,
        )
        data = r.json()
        if data.get("success"):
            token = data["token"]
            # Write to config file
            cfg_lines = []
            if CONFIG_FILE.exists():
                cfg_lines = CONFIG_FILE.read_text().splitlines()
            # Replace or append TT_API_TOKEN
            found = False
            for i, line in enumerate(cfg_lines):
                if line.startswith("TT_API_TOKEN="):
                    cfg_lines[i] = f"TT_API_TOKEN={token}"
                    found = True
            if not found:
                cfg_lines.append(f"TT_API_TOKEN={token}")
            CONFIG_FILE.write_text("\n".join(cfg_lines) + "\n")
            print(f"\n✅ Logged in as {data['user']['name']}. Token saved to agent_config.env")
            print("Now run:  python agent.py\n")
        else:
            print(f"❌ Login failed: {data.get('message', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Error: {e}")


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    global API_TOKEN

    parser = argparse.ArgumentParser(description="TimeTracker Activity Agent")
    parser.add_argument("--login", action="store_true", help="Login and save token to config")
    args = parser.parse_args()

    if args.login:
        interactive_login()
        return

    # Reload token in case it was just saved
    load_dotenv(CONFIG_FILE, override=True)
    API_TOKEN = os.getenv("TT_API_TOKEN", "")

    if not API_TOKEN:
        log.error("No API token. Run:  python agent.py --login")
        sys.exit(1)

    if not WIN32_AVAILABLE:
        log.warning("pywin32/psutil not installed — unproductive window detection disabled.")
        log.warning("Install with:  pip install pywin32 psutil")

    log.info("TimeTracker Agent starting…")
    log.info(f"  API Base       : {API_BASE}")
    log.info(f"  Idle threshold : {IDLE_THRESHOLD}s")
    log.info(f"  Away threshold : {AWAY_THRESHOLD}s")
    log.info(f"  Heartbeat every: {HEARTBEAT_SEC}s")
    log.info(f"  Unproductive apps: {', '.join(sorted(UNPRODUCTIVE_APPS))}")
    log.info(f"  Unproductive domains: {', '.join(sorted(UNPRODUCTIVE_DOMAINS))}")

    # Start session
    if not start_session():
        log.error("Could not start session. Check your API_TOKEN and backend URL.")
        sys.exit(1)

    # Start input listeners (suppressed=False so normal input still works)
    kb_listener    = keyboard.Listener(on_press=on_key_press)
    mouse_listener = mouse.Listener(
        on_move=on_mouse_move,
        on_click=on_mouse_click,
        on_scroll=on_mouse_scroll,
    )
    kb_listener.start()
    mouse_listener.start()

    # Start monitor in background thread
    monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
    monitor_thread.start()

    log.info("Agent running. Press Ctrl+C to stop.")

    try:
        kb_listener.join()
    except KeyboardInterrupt:
        log.info("Interrupted by user.")
    finally:
        kb_listener.stop()
        mouse_listener.stop()
        end_session()
        log.info("Agent stopped.")


if __name__ == "__main__":
    main()
