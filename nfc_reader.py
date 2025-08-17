# Installation : pip install pyscard
import time
from smartcard.System import readers
from smartcard.Exceptions import NoCardException
from smartcard.util import toHexString

def main():
    r = readers()
    if not r:
        print("Aucun lecteur NFC détecté.")
        return

    print("Lecteurs disponibles :")
    for i, reader in enumerate(r):
        print(f"{i}: {reader}")

    reader = r[0]
    print(f"\nUtilisation du lecteur : {reader}")

    connection = reader.createConnection()

    while True:
        try:
            connection.connect()
            # Commande APDU pour récupérer l'UID
            GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]
            data, sw1, sw2 = connection.transmit(GET_UID)

            if sw1 == 0x90 and sw2 == 0x00:
                uid = toHexString(data).replace(" ", "")
                print(f"Carte détectée - UID : {uid}")
            else:
                print(f"Erreur lecture UID : SW1={sw1:02X}, SW2={sw2:02X}")

            # On attend que la carte soit retirée
            while True:
                try:
                    connection.connect()
                    time.sleep(0.2)
                except NoCardException:
                    print("Carte retirée.\n")
                    break

        except NoCardException:
            # Pas de carte présente
            time.sleep(0.5)
        except Exception as e:
            print("Erreur :", e)
            time.sleep(1)

if __name__ == "__main__":
    main()
