#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import time, threading, signal, json, os
from pathlib import Path
from tempfile import NamedTemporaryFile
from json import JSONDecodeError
from smartcard.System import readers
from smartcard.CardRequest import CardRequest
from smartcard.CardType import AnyCardType
from smartcard.CardConnection import CardConnection
from smartcard.Exceptions import CardConnectionException, NoCardException
import json

GET_UID_APDU = [0xFF, 0xCA, 0x00, 0x00, 0x00]  # -> UID + 0x90 0x00 si OK
DB_PATH = Path("../backend/data/cards.json")

def _ensure_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not DB_PATH.exists():
        DB_PATH.write_text(json.dumps({"cards": []}, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_db():
    _ensure_db()
    try:
        with DB_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except (JSONDecodeError, OSError):
        # fichier corrompu → on repart propre
        data = {"cards": []}

    # normalisation
    if not isinstance(data, dict) or "cards" not in data or not isinstance(data["cards"], list):
        data = {"cards": []}
    return data


def _save_db(data: dict):
    """Écriture atomique pour éviter les JSON partiels."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile("w", delete=False, dir=str(DB_PATH.parent), encoding="utf-8") as tmp:
        json.dump(data, tmp, ensure_ascii=False, indent=2)
        tmp_path = Path(tmp.name)
    os.replace(tmp_path, DB_PATH)  # atomic move


import json

def is_card_registered(uid):
    """Vérifie si une carte est déjà enregistrée (robuste si fichier vide)."""
    try:
        with open("../backend/data/cards.json", "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return None #Fichier vide
            data = json.loads(content)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError:
        # fichier corrompu / mal formé
        return None

    cards = data.get("cards", [])
    for c in cards:
        if c.get("uid") == uid:
            return c.get("id")
    return None


def get_next_card_id(data=None):
    """Retourne l'ID suivant (max+1). Accepte en option un dict 'data' déjà chargé."""
    if data is None:
        try:
            with open("../backend/data/cards.json", "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return 1  # fichier vide
                data = json.loads(content)
        except FileNotFoundError:
            return 1
        except json.JSONDecodeError:
            return 1

    cards = data.get("cards", [])
    existing_ids = [c.get("id") for c in cards if isinstance(c.get("id"), int)]
    return (max(existing_ids) + 1) if existing_ids else 1


def register_new_card(uid):
    """Enregistre une nouvelle carte dans la liste 'cards' du JSON (écriture propre)."""
    # déjà présent ? on ne duplique pas
    res = is_card_registered(uid)
    if res is not None:
        print("Carte déjà enregistrée ! Numéro " + str(res))
        return

    # charger l'état actuel (tolérant au fichier vide)
    try:
        with open("../backend/data/cards.json", "r", encoding="utf-8") as f:
            content = f.read().strip()
            data = json.loads(content) if content else {"cards": []}
    except FileNotFoundError:
        data = {"cards": []}
    except json.JSONDecodeError:
        data = {"cards": []}

    # ajouter la carte
    card_data = {
        "id": get_next_card_id(data),
        "uid": uid
    }
    data.setdefault("cards", []).append(card_data)

    # réécriture complète (pas d'append de fragments JSON)
    with open("../backend/data/cards.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Nouvelle carte, uid : " + str(card_data.get("uid")) + ", id : " + str(card_data.get("id")))

stop = threading.Event()

def sigint_handler(sig, frame):
    stop.set()
signal.signal(signal.SIGINT, sigint_handler)  # Ctrl+C -> stop.set()

def pick_contactless_utrust():
    rl = readers()
    if not rl:
        raise RuntimeError("Aucun lecteur PC/SC détecté.")
    def score(r):
        s = str(r).lower()
        pts = 0
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

def get_uid(conn):
    try:
        data, sw1, sw2 = conn.transmit(GET_UID_APDU)
        if sw1 == 0x90 and sw2 == 0x00 and data:
            return "".join(f"{b:02X}" for b in data)
    except (CardConnectionException, NoCardException):
        pass
    return None

def read_uid_polling(reader, poll_timeout_s=0.5, attempts=10):
    """
    Attend la présence carte via petits timeouts (polling) -> Ctrl+C réagit instant.
    Tente plusieurs connexions rapides pour tolérer les faux contacts.
    Retourne l'UID (str) ou None si rien de stable.
    """
    # Attente non bloquante de la carte
    while not stop.is_set():
        try:
            req = CardRequest(timeout=poll_timeout_s, readers=[reader], cardType=AnyCardType())
            svc = req.waitforcard()           # retourne si carte détectée dans la fenêtre
            conn = svc.connection

            for _ in range(attempts):
                if stop.is_set():
                    return None
                if connect_safely(conn):
                    uid = get_uid(conn)
                    try: conn.disconnect()
                    except Exception: pass
                    if uid:
                        time.sleep(0.1)      # petit settle
                        return uid
                time.sleep(0.1)
            # pas réussi -> ré-essayer le cycle
        except Exception:
            # timeout ou pas de carte détectée -> re-poll
            pass
    return None

def wait_card_removed_polling(reader, poll_timeout_s=0.3):
    """Boucle jusqu’au retrait de la carte (polling non bloquant)."""
    while not stop.is_set():
        try:
            # Si on VOIT encore une carte, on attend un peu et on continue
            req = CardRequest(timeout=poll_timeout_s, readers=[reader], cardType=AnyCardType())
            _ = req.waitforcard()
            time.sleep(0.2)
            continue
        except Exception:
            # timeout: pas de carte détectée -> retirée
            break

if __name__ == "__main__":
    try:
        reader = pick_contactless_utrust()
        print("Lecteur:", reader)
        print("Présentez une carte… (Ctrl+C pour quitter)")
        last_uid = None

        while not stop.is_set():
            uid = read_uid_polling(reader)
            if stop.is_set():
                break
            if not uid:
                # rien de stable détecté (ou faux contact) -> on repart
                continue

            if uid != last_uid:
                print("UID:", uid)      # n’affiche qu’une fois par nouveau UID
                register_new_card(uid)
                last_uid = uid

            # attendre le retrait pour éviter les doublons
            wait_card_removed_polling(reader)

    finally:
        print("\nArrêt propre.")
