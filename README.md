# 🪪 Mon système de productivité NFC - Deo-Favente
## ✍️ Description
Ce projet est un système de gestion de tâches basé sur la manipulation de cartes NFC. Il permet de créer, suivre et gérer des tâches en utilisant un lecteur de cartes NFC pour avoir une interaction physique. J'ai développé ce système pour améliorer ma productivité professionnelle, et je m'en sers quotidiennement.

## ✅ Principe
Les tâches sont affichées sous la forme de 3 colonnes Kanban : À faire, En cours, Terminé. Chaque tâche est représentée par une carte NFC que l'on peut scanner pour la déplacer entre les colonnes. Le système enregistre automatiquement les changements et permet de suivre l'avancement des tâches.
La motivation principale est de "gamifier" la réalisation des tâches en associant un objet physique (la carte NFC) à chaque tâche, ce qui rend l'expérience plus engageante et satisfaisante. Le fait de pouvoir toucher la carte et d'entendre un son de confirmation renforce le sentiment d'accomplissement.

## ⌛ Processus de conception
Pour l'histoire, je me suis inspiré de cette vidéo : 
*"J'ai résolu mon TDAH avec une imprimante de reçus" - Coding with Lewis* <br>
[![](https://markdown-videos-api.jorgenkh.no/youtube/xg45b8UXoZI)](https://youtu.be/xg45b8UXoZI)<br>
Le principe est d'utiliser des objets physiques pour représenter des tâches, ce qui rend le tout motivant et ludique. Vu que je n'aime pas la pollution causée par les tickets papier, j'ai décidé d'utiliser des cartes NFC réutilisables et un lecteur NFC acheté d'occasion. (UTrust 3700F)
J'affiche l'écran de gestion des tâches sur un écran secondaire fixé au mur, et j'utilise un Raspberry Pi pour faire tourner le serveur backend et le script de lecture des cartes NFC.

## 📸 Photos du montage IRL
(à venir)

## 🔧 Technologies utilisées
- Vue.js et Tailwind CSS pour le frontend, offrant une interface utilisateur réactive et moderne.
- Node.js + Express pour le serveur backend, gérant les requêtes API et le stockage des tâches.
- Python pour le script backend qui gère la lecture des cartes NFC et la communication avec l'API.
- Google Calendar API pour afficher les événements du calendrier en complément des tâches.
- JSON pour le stockage local des données des cartes NFC.

## 💖 Si vous souhaitez réutiliser ce projet (pistes d'utilisation)
1. Récupérez un lecteur NFC compatible PC/SC (ex: UTrust 3700F) et des cartes NFC réutilisables. Vous pouvez les numéroter avec un marqueur pour les différencier.
2. Adapter les scripts dans `scripts/` selon vos besoins et installez les dépendances requises.
3. Enregistrez les id de vos cartes NFC dans `cards.json` avec le script `scripts/read_cards.py`. Passez chaque carte 1 par 1 devant le lecteur pour les enregistrer sous un id unique de 1 à N. Vous n'aurez à le faire qu'une seule fois.
4. Installez les dépendances du backend et frontend (`npm install` dans chaque dossier).
5. Configurez les variables d'environnement dans le fichier `frontend/.env` du frontend avec votre propre clé API Google et ID de calendrier.
6. Lancez le backend (`node server.js` dans le dossier `backend/`) et le frontend (`npm run dev` dans le dossier `frontend/`). Le script `npm run dev` à la racine du projet lance les deux serveurs en même temps. Vous pouvez aussi build le frontend avec `npm run build` et servir les fichiers statiques avec un serveur web (ex: nginx).
7. Lancez le script de lecture des cartes NFC avec `python scripts/read_cards.py`. Chaque fois que vous passez une carte devant le lecteur, la tâche associée sera déplacée dans la colonne suivante (À faire -> En cours -> Terminé). Un son de confirmation sera joué à chaque scan réussi. Vous pouvez arrêter le script avec Ctrl+C ou utiliser un service systemd pour le lancer automatiquement.
8. (optionnel) Si vous voulez afficher le pannel sur un écran secondaire, vous pouvez utiliser un Raspberry Pi connectée en local avec un écran HDMI. Une fois que tout est lancé, vous pouvez automatiser le lancement au démarrage en passant le script `start-productivity.sh` dans un service systemd (sous --user pour ne pas bloquer l'interface graphique).
9. (optionnel) Vous pouvez aussi déployer le serveur sur le web pour y accéder depuis n'importe où. Assurez-vous de sécuriser l'accès avec une authentification et d'utiliser HTTPS. Vous pouvez mettre un mot de passe à la page web pour éviter que n'importe qui puisse modifier vos tâches.
10. **Amusez-vous !** N'hésitez pas à refaire complètement le système pour qu'il vous corresponde le mieux. Vous aurez encore plus envie de l'utiliser si vous l'avez fait vous-même.
