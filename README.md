# Relais Client 📨

Application Android (Expo SDK 58 / React Native 0.88) pour récupérer les messages et images envoyés par un client,
**extraire le texte des images (OCR)** et **transférer le tout par e-mail** (ou autre) pour l'avoir sur son PC.

## Fonctionnalités

| Fonction | Expo Go | APK (EAS) |
|---|:-:|:-:|
| Recevoir une image/un texte via **Partager** depuis WhatsApp, Messages, Galerie… (plusieurs images possibles) | ❌ | ✅ |
| Lire directement les **SMS et MMS** reçus (filtre par période et par numéro, nom du contact) | ❌ | ✅ |
| Ajouter une image (galerie / appareil photo), coller depuis le presse-papier, saisir un texte | ✅ | ✅ |
| **OCR** sur le téléphone (Google ML Kit, hors ligne, gratuit) | ❌ | ✅ |
| OCR en ligne (OCR.space), utilisé automatiquement si l'OCR sur le téléphone n'est pas dispo | ✅ | ✅ |
| Filtre **par période** : 15 min, **1 h**, 3 h, aujourd'hui, 24 h, 7 jours, tout, perso (X min/h/jours) | ✅ | ✅ |
| Filtre « non envoyés » et par client | ✅ | ✅ |
| **Envoi par e-mail** (texte du message + texte extrait + images en pièces jointes) | ✅ | ✅ |
| Partager vers une autre appli, exporter en `.txt`, copier | ✅ | ✅ |
| Texte extrait modifiable, ré-extraction, historique « envoyé le… », nettoyage auto | ✅ | ✅ |

## 1. Installer

```bash
npm install
```

## 2. Tester avec Expo Go

1. Installez **Expo Go** (à jour, compatible SDK 58) depuis le Play Store.
2. Lancez :
   ```bash
   npx expo start
   ```
3. Scannez le QR code avec Expo Go (même Wi‑Fi ; sinon `npx expo start --tunnel`).

Dans Expo Go, le partage depuis d'autres applis, la lecture des SMS et l'OCR hors ligne sont désactivés
(ils demandent du code natif). Un bandeau l'indique dans l'appli. Tout le reste fonctionne.

## 3. Construire l'APK avec EAS Build

```bash
npm install -g eas-cli
eas login              # compte Expo gratuit
eas init               # relie le projet à votre compte (ajoute projectId dans app.json)
eas build -p android --profile preview
```

À la fin, EAS donne un lien/QR code pour télécharger l'**APK** à installer sur le téléphone.

Autres profils (`eas.json`) :
- `development` : APK de développement (avec `expo-dev-client`) pour tester les fonctions natives
  avec rechargement à chaud : `eas build -p android --profile development` puis `npx expo start --dev-client`.
- `production` : `.aab` pour le Play Store.

> Vous pouvez changer le nom du paquet `com.relaisclient.app` dans `app.json` avant le premier build.

### ⚠️ Android récent : autoriser la lecture des SMS sur un APK installé à la main

Android bloque la permission SMS pour les applis installées hors Play Store (« paramètre restreint »).
Si la demande d'accès aux SMS ne s'affiche pas ou est grisée :
**Paramètres → Applications → Relais Client → ⋮ (en haut à droite) → Autoriser les paramètres restreints**,
puis réessayez dans l'onglet SMS.

## Utilisation

- **Depuis WhatsApp / Messages** : appui long sur l'image (ou le message) → **Partager** → **Relais Client**.
  Le message est ajouté et le texte de l'image est extrait automatiquement. Renseignez le nom du client si besoin.
- **Onglet SMS** : choisissez la période (ex. *1 h*), éventuellement le numéro du client, puis **Charger les SMS**
  → **Importer + envoyer**.
- **Onglet Messages** : choisissez la période, cochez des messages (ou rien = toute la période) → **Envoyer**.
- **Réglages** : adresse e-mail par défaut, objet (`{client}`, `{date}`, `{nombre}`), contenu par défaut,
  moteur OCR, clé OCR.space, nettoyage automatique.

## Limites à connaître

- Android ne permet à aucune appli de lire les conversations **WhatsApp** ni les messages **RCS** (« Chat » de Google Messages) :
  pour ceux-là, utilisez **Partager**.
- La permission `READ_SMS` est réservée par Google aux applis SMS par défaut sur le **Play Store**. Pour un APK
  installé directement, aucun problème. Pour une publication Play Store, retirez la lecture SMS
  (partage + presse-papier restent dispo).
- La clé OCR.space `helloworld` est une clé de démo limitée : créez une clé gratuite sur https://ocr.space/ocrapi
  si vous utilisez l'OCR en ligne. Avec l'APK, l'OCR se fait sur le téléphone, sans internet.

## Structure

```
App.tsx                        navigation (onglets), réception des partages
src/store.tsx                  données (AsyncStorage), file d'attente OCR
src/ocr.ts                     OCR ML Kit (natif) / OCR.space (en ligne)
src/periods.ts                 filtres de période
src/exportText.ts              mise en forme du mail
src/screens/                   Messages, SMS, Réglages, Détail, Nouveau, Envoi
modules/relais-native/         module natif Kotlin : lecture SMS/MMS + OCR ML Kit
```
