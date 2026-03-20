import time
from typing import List, Dict, Optional
import threading

class SessionManager:
    def __init__(self, ttl_seconds: int = 3600):
        self.sessions: Dict[str, Dict] = {}
        self.ttl_seconds = ttl_seconds
        self.lock = threading.Lock()

    def get_session(self, session_id: str) -> Dict:
        """Retrieve or create a session"""
        with self.lock:
            if session_id not in self.sessions:
                self.sessions[session_id] = {
                    "messages": [],
                    "summary": "",
                    "last_active": time.time(),
                    "metadata": {}
                }
            
            # Update last active time
            self.sessions[session_id]["last_active"] = time.time()
            return self.sessions[session_id]

    def add_message(self, session_id: str, role: str, content: str):
        """Add a message to the session history"""
        with self.lock:
            session = self.get_session(session_id)
            session["messages"].append({"role": role, "content": content})
            # Keep raw history manageable (e.g., last 20 messages for safety)
            if len(session["messages"]) > 20:
                session["messages"] = session["messages"][-20:]

    def update_summary(self, session_id: str, summary: str):
        """Update the rolling summary for the session"""
        with self.lock:
            session = self.get_session(session_id)
            session["summary"] = summary

    def get_history_slice(self, session_id: str, count: int = 5) -> List[Dict]:
        """Get the last N messages for immediate context"""
        session = self.get_session(session_id)
        return session["messages"][-count:]

    def get_context_for_agent(self, session_id: str) -> Dict:
        """Package history and summary for agent consumption"""
        session = self.get_session(session_id)
        return {
            "history": self.get_history_slice(session_id, 5),
            "summary": session["summary"]
        }

    def cleanup_sessions(self):
        """Remove stale sessions"""
        now = time.time()
        with self.lock:
            expired_ids = [
                sid for sid, sdata in self.sessions.items()
                if now - sdata["last_active"] > self.ttl_seconds
            ]
            for sid in expired_ids:
                del self.sessions[sid]
        return len(expired_ids)
