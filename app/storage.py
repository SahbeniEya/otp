from __future__ import annotations
import time
from typing import Optional, Dict, Tuple, Any
import threading

import redis

from .config import get_settings
from .otp import verify_code, compute_hmac


class InMemoryStorage:
    """Fallback in-memory storage when Redis is not available"""

    def __init__(self):
        self._data: Dict[str, Dict[str, Any]] = {}
        self._index: Dict[str, float] = {}  # otp_id -> expiry_timestamp
        self._lock = threading.Lock()

    def create(self, otp_id: str, hmac_value: str, salt: str, ttl_seconds: int, subject: Optional[str],
               purpose: Optional[str]) -> None:
        with self._lock:
            expiry = time.time() + ttl_seconds
            self._data[otp_id] = {
                "hmac": hmac_value,
                "salt": salt,
                "subject": subject or "",
                "purpose": purpose or "",
                "used": "0",
                "created_at": str(int(time.time())),
                "expires_at": expiry
            }
            self._index[otp_id] = expiry

    def get_meta(self, otp_id: str) -> Optional[Dict[str, str]]:
        with self._lock:
            if otp_id not in self._data:
                return None

            # Check if expired
            if time.time() > self._data[otp_id]["expires_at"]:
                del self._data[otp_id]
                self._index.pop(otp_id, None)
                return None

            # Return copy without expires_at
            data = self._data[otp_id].copy()
            data.pop("expires_at", None)
            return data

    def verify_and_consume(self, otp_id: str, hmac_candidate: str) -> Tuple[bool, str]:
        with self._lock:
            if otp_id not in self._data:
                return False, 'not_found'

            data = self._data[otp_id]

            # Check if expired
            if time.time() > data["expires_at"]:
                del self._data[otp_id]
                self._index.pop(otp_id, None)
                return False, 'expired'

            # Check if already used
            if data["used"] == "1":
                return False, 'used'

            # Verify HMAC
            if data["hmac"] == hmac_candidate:
                data["used"] = "1"
                data["used_at"] = str(int(time.time()))
                self._index.pop(otp_id, None)
                return True, 'ok'
            else:
                return False, 'invalid'

    def list_active(self, limit: int = 50, subject: Optional[str] = None, purpose: Optional[str] = None,
                    status: Optional[str] = None):
        with self._lock:
            now = time.time()
            out = []

            # Clean up expired entries and collect active ones
            expired_keys = []
            for oid, data in self._data.items():
                if now > data["expires_at"]:
                    expired_keys.append(oid)
                    continue

                # Apply filters
                if subject and data.get('subject') != subject:
                    continue
                if purpose and data.get('purpose') != purpose:
                    continue
                if status == 'used' and data.get('used') != '1':
                    continue
                if status == 'active' and data.get('used') == '1':
                    continue

                # Add to results (without expires_at)
                result_data = data.copy()
                result_data.pop("expires_at", None)
                out.append({"id": oid, **result_data})

            # Clean up expired entries
            for key in expired_keys:
                self._data.pop(key, None)
                self._index.pop(key, None)

            # Sort by creation time and limit
            out.sort(key=lambda x: int(x.get('created_at', 0)), reverse=True)
            return out[:limit]

    def purge_index(self):
        # For in-memory storage, just clean up expired entries
        with self._lock:
            now = time.time()
            expired_keys = [oid for oid, data in self._data.items() if now > data["expires_at"]]
            for key in expired_keys:
                self._data.pop(key, None)
                self._index.pop(key, None)
            return len(expired_keys)


class RedisStorage:
    def __init__(self):
        s = get_settings()
        self._fallback = InMemoryStorage()
        self._use_fallback = False

        try:
            self._r: redis.Redis = redis.from_url(s.redis_url, decode_responses=True)
            # Test connection
            self._r.ping()
            self.ns = s.redis_namespace
            print("✅ Connected to Redis successfully")
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError) as e:
            print(f"⚠️  Redis connection failed: {e}")
            print("🔄 Falling back to in-memory storage (data will not persist)")
            self._use_fallback = True

    def _key(self, otp_id: str) -> str:
        return f"{self.ns}:otp:{otp_id}"

    def _index_key(self) -> str:
        return f"{self.ns}:index"

    def close(self):
        if not self._use_fallback:
            self._r.close()

    def create(self, otp_id: str, hmac_value: str, salt: str, ttl_seconds: int, subject: Optional[str], purpose: Optional[str]) -> None:
        if self._use_fallback:
            return self._fallback.create(otp_id, hmac_value, salt, ttl_seconds, subject, purpose)

        try:
            if not self._r.ping():
                print("⚠️  Redis connection lost, switching to fallback storage")
                self._use_fallback = True
                return self._fallback.create(otp_id, hmac_value, salt, ttl_seconds, subject, purpose)

            key = self._key(otp_id)
            pipe = self._r.pipeline()
            pipe.hset(key, mapping={
                "hmac": hmac_value,
                "salt": salt,
                "subject": subject or "",
                "purpose": purpose or "",
                "used": "0",
                "created_at": str(int(time.time())),
            })
            pipe.expire(key, ttl_seconds)
            # add to index sorted set with expiration timestamp as score
            pipe.zadd(self._index_key(), {otp_id: int(time.time()) + ttl_seconds})
            pipe.execute()
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
            print("⚠️  Redis connection lost, switching to fallback storage")
            self._use_fallback = True
            return self._fallback.create(otp_id, hmac_value, salt, ttl_seconds, subject, purpose)

    def get_meta(self, otp_id: str) -> Optional[Dict[str, str]]:
        if self._use_fallback:
            return self._fallback.get_meta(otp_id)

        try:
            data = self._r.hgetall(self._key(otp_id))
            return data if data else None
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
            print("⚠️  Redis connection lost, switching to fallback storage")
            self._use_fallback = True
            return self._fallback.get_meta(otp_id)

    def verify_and_consume(self, otp_id: str, hmac_candidate: str) -> Tuple[bool, str]:
        if self._use_fallback:
            return self._fallback.verify_and_consume(otp_id, hmac_candidate)

        try:
            # atomic verify and consume via Lua
            script = """
            local otp_key = KEYS[1]
            local index_key = KEYS[2]
            local provided_hmac = ARGV[1]
            local otp_id = ARGV[2]
            if redis.call('EXISTS', otp_key) == 0 then
              return 'not_found'
            end
            local used = redis.call('HGET', otp_key, 'used')
            if used == '1' then
              return 'used'
            end
            local ttl = redis.call('PTTL', otp_key)
            if ttl <= 0 then
              return 'expired'
            end
            local stored_hmac = redis.call('HGET', otp_key, 'hmac')
            if stored_hmac == provided_hmac then
              redis.call('HSET', otp_key, 'used', '1')
              redis.call('HSET', otp_key, 'used_at', tostring(redis.call('TIME')[1]))
              redis.call('ZREM', index_key, otp_id)
              return 'ok'
            else
              return 'invalid'
            end
            """
            res = self._r.eval(script, 2, self._key(otp_id), self._index_key(), hmac_candidate, otp_id)
            return (res == 'ok', res if isinstance(res, str) else 'invalid')
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
            print("⚠️  Redis connection lost, switching to fallback storage")
            self._use_fallback = True
            return self._fallback.verify_and_consume(otp_id, hmac_candidate)

    def list_active(self, limit: int = 50, subject: Optional[str] = None, purpose: Optional[str] = None, status: Optional[str] = None):
        if self._use_fallback:
            return self._fallback.list_active(limit, subject, purpose, status)

        try:
            # list by soonest expiry
            now = int(time.time())
            ids = self._r.zrangebyscore(self._index_key(), now - 86400, now + 86400 * 7, start=0, num=limit)
            out = []
            for oid in ids:
                meta = self.get_meta(oid)
                if not meta:
                    continue
                if subject and meta.get('subject') != subject:
                    continue
                if purpose and meta.get('purpose') != purpose:
                    continue
                if status == 'used' and meta.get('used') != '1':
                    continue
                if status == 'active' and meta.get('used') == '1':
                    continue
                out.append({"id": oid, **meta})
            return out
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
            print("⚠️  Redis connection lost, switching to fallback storage")
            self._use_fallback = True
            return self._fallback.list_active(limit, subject, purpose, status)

    def purge_index(self):
        if self._use_fallback:
            return self._fallback.purge_index()

        try:
            # remove entries whose keys are gone
            ids = self._r.zrange(self._index_key(), 0, -1)
            removed = 0
            pipe = self._r.pipeline()
            for oid in ids:
                exists = self._r.exists(self._key(oid))
                if not exists:
                    pipe.zrem(self._index_key(), oid)
                    removed += 1
            if removed:
                pipe.execute()
            return removed
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
            print("⚠️  Redis connection lost, switching to fallback storage")
            self._use_fallback = True
            return self._fallback.purge_index()
