#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os, json, time, signal, threading, subprocess
from pathlib import Path

import requests
from smartcard.System import readers
from smartcard.CardRequest import CardRequest
from smartcard.CardType import AnyCardType
from smartcard.CardConnection import CardConnection
from smartcard.Exceptions import CardConnectionException, NoCardException

# ---------- Config ----------
API_BASE = "http://localhost/api"
CARDS_PATH = Path("/opt/productivity/backend/data/cards.json")
TICKETS_PATH = Path("/opt/productivity/backend/data/tickets.json")
START_WAV   = Path("/opt/productivity/frontend/public/start.wav")
COMPLETE_WAV= Path("/opt/productivity/frontend/public/complete.wav")

GET_UID_APDU = [0xFF, 0xCA, 0x00, 0x00, 0x00]
STOP = threading.Event()

# ---------- Audio helpers ----------
def _synth_beep(path: Path, freq=880, ms=180, vol=0.35, rate=44100):
    """Crée un petit bip .wav (standard lib seulement)."""
    import wave, struct, math
    n = int(rate * ms / 1000)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        for i in range(n):
            s = vol * math.sin(2 * math.pi * freq * (i / rate))
            w.writeframes(struct.pack("<h", int(max(-1, min(1, s)) * 32767)))

def _ensure_wav(path: Path):
    try:
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            _synth_beep(path)
    except Exception:
        pass

def play(path: Path):
    """Joue un wav via ALSA; fallback bip terminal si aplay indisponible."""
    try:
        _ensure_wav(path)
        subprocess.run(["aplay", "-q", str(path)], check=False)
    except FileNotFoundError:
        print("\a", end="", flush=True)  # fallback beep

# ---------- Files ----------
def load_json_safe(path: Path, default):
    try:
        txt = path.read_text(encoding="utf-8").strip()
        return json.loads(txt) if txt else default
    except (FileNotFoundError, json.JSONDecodeError):
        return default

# ---------- NFC ----------
def sigint_handler(sig, frame): STOP.set()
signal.signal(signal.SIGINT, sigint_handler)

def pick_contactless_utrust():
    rl = readers()
    if not rl: raise RuntimeError("Aucun lecteur PC/SC détecté.")
    def score(r):
        s = str(r).lower(); pts = 0
        if "utrust" in s or "identiv" in s: pts += 2
        if any(k in s for k in ("contactless"," cl","nfc","picc")): pts += 5
        return pts
    return sorted(rl, key=lambda r: (-score(r), str(r)))[0]

def connect_safely(conn):
    try:
        conn.connect(CardConnection.T1_protocol); return True
    except Exception:
        try:
            conn.connect(CardConnection.T0_protocol); return True
        except Exception:
            return False

def read_uid_once_blocking(reader, poll_timeout_s=0.5, attempts=10):
    while not STOP.is_set():
        try:
            req = CardRequest(timeout=poll_timeout_s, readers=[reader], cardType=AnyCardType())
            svc = req.waitforcard()
            conn = svc.connection
            for _ in range(attempts):
                if STOP.is_set(): return None
                if connect_safely(conn):
                    try:
                        data, sw1, sw2 = conn.transmit(GET_UID_APDU)
                    except (CardConnectionException, NoCardException):
                        data, sw1, sw2 = None, None, None
                    try: conn.disconnect()
                    except Exception: pass
                    if sw1 == 0x90 and sw2 == 0x00 and data:
                        uid_hex = "".join(f"{b:02X}" for b in data)
                        time.sleep(0.1)
                        return uid_hex
                time.sleep(0.1)
        except Exception:
            pass
    return None

def wait_card_removed_polling(reader, poll_timeout_s=0.3):
    while not STOP.is_set():
        try:
            req = CardRequest(timeout=poll_timeout_s, readers=[reader], cardType=AnyCardType())
            _ = req.waitforcard()
            time.sleep(0.2)
            continue
        except Exception:
            break

# ---------- Mapping & actions ----------
def uid_to_ticket_id(uid_hex):
    db = load_json_safe(CARDS_PATH, {"cards": []})
    for c in db.get("cards", []):
        if c.get("uid") == uid_hex:
            return c.get("id")
    return None

def find_ticket_column(tickets, ticket_id):
    for col in ("todo","doing","done"):
        for t in tickets.get(col, []):
            try:
                if int(t.get("id")) == int(ticket_id): return col
            except Exception:
                continue
    return None

def act_on_ticket(ticket_id, column) -> str:
    """Retourne True si une action API a bien été effectuée."""
    try:
        if column == "todo":
            r = requests.post(f"{API_BASE}/tickets/{ticket_id}/start", timeout=5)
            if r.ok:
                print(f"[OK] Ticket #{ticket_id} : À faire → En cours")
                return "start"
            print(f"[ERREUR] start #{ticket_id} {r.status_code}: {r.text}")
            return None
        elif column == "doing":
            r = requests.post(f"{API_BASE}/tickets/{ticket_id}/complete", timeout=5)
            if r.ok:
                print(f"[OK] Ticket #{ticket_id} : En cours → Terminé")
                return "complete"
            print(f"[ERREUR] complete #{ticket_id} {r.status_code}: {r.text}")
            return None
        elif column == "done":
            print(f"[INFO] Ticket #{ticket_id} déjà Terminé → aucune action.")
            return None
        else:
            print(f"[INFO] Ticket #{ticket_id} introuvable dans tickets.json.")
            return None
    except requests.RequestException as e:
        print("[ERREUR réseau]:", e)
        return None

# ---------- Boucle principale ----------
def main_loop():
    try:
        reader = pick_contactless_utrust()
        print("Lecteur:", reader)
    except Exception as e:
        print("Erreur lecteur:", e); return

    print("Présentez une carte… (Ctrl+C pour quitter)")
    last_uid = None

    while not STOP.is_set():
        uid = read_uid_once_blocking(reader)
        if STOP.is_set(): break
        if not uid: continue

        # Ne réagir qu’aux changements d’UID
        if uid == last_uid:
            # même carte que précédemment → attendre le retrait pour éviter spam
            wait_card_removed_polling(reader)
            #continue

        print(f"UID: {uid}")
        ticket_id = uid_to_ticket_id(uid)
        tickets = load_json_safe(TICKETS_PATH, {"todo": [], "doing": [], "done": []})

        result = None
        if ticket_id is not None:
            col = find_ticket_column(tickets, ticket_id)
            result = act_on_ticket(ticket_id, col)
        else:
            print("[INFO] UID non mappé dans cards.json.")
        
        if result == "start":
            play(START_WAV)
        elif result == "complete":
            play(COMPLETE_WAV)

        last_uid = uid
        # attendre retrait avant nouveau tour (évite double déclenchement)
        wait_card_removed_polling(reader)

if __name__ == "__main__":
    try:
        main_loop()
    finally:
        print("\nArrêt propre.")
