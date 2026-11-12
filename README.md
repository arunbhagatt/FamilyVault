# FamilyVault

**A simple, offline-first family document and record management app for Android.**

FamilyVault helps families keep important documents and family information organised in one place. It is designed with simplicity, privacy and ease of use in mind, especially for people who prefer a straightforward interface.

## ✨ Features

- **Family Member Management** – Add, view and manage family member profiles.
- **Document Management** – Organise important family documents such as Aadhaar cards, PAN cards, certificates and property records.
- **Document Preview** – View supported PDF and image files within the app.
- **Family Tree** – Visualise family relationships and navigate between family members.
- **Search and Organisation** – Find and manage stored records.
- **Backup and Restore** – Create backups and restore family records.
- **Offline-first** – Designed to keep family information accessible locally without requiring a cloud account.
- **Simple Interface** – Clean, minimal design with a monochrome theme.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Application logic and type safety |
| Vite | Development and production builds |
| Tailwind CSS | Styling |
| Capacitor | Android application integration |
| IndexedDB / Dexie | Local data storage |
| PDF.js | PDF rendering |
| pdf-lib | PDF processing |

## 📱 Platform

- Android
- Built using Capacitor.
- Designed primarily for offline use.

## 🚀 Getting Started

### Prerequisites

Install the following:

- Node.js
- npm
- Android Studio
- Android SDK
- Java Development Kit (JDK)

### 1. Clone the repository

```bash
git clone https://github.com/arunbhagatt/FamilyVault.git
```

### 2. Open the project

```bash
cd FamilyVault
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run the development server

```bash
npm run dev
```

### 5. Build the application

```bash
npm run build
```

### 6. Sync with Android

```bash
npx cap sync android
```

### 7. Generate the Android APK

```bash
cd android
```

```bash
./gradlew assembleDebug
```

The debug APK will be generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 🔒 Privacy

FamilyVault is designed around local-first storage and user privacy.

- Family records are intended to remain on the device.
- No cloud account is required for normal local use.
- Users should keep independent backups of important information.
- Avoid storing real personal documents in the source-code repository.

**Important:** Local storage and backups should not be treated as encryption or protection against someone with access to the device. Keep your device secured.

## 💾 Backup and Recovery

FamilyVault includes a backup and restore workflow intended to help users preserve their family records.

Always test backup restoration with sample data before relying on backups containing important documents.

## 🗺️ Project Vision

The goal of FamilyVault is to make family document management easier and more accessible.

Instead of keeping important records scattered across phones, folders and messaging applications, FamilyVault aims to provide one organised place for family profiles, documents and relationships.

## 🤝 Contributing

Contributions, suggestions and bug reports are welcome.

If you find a bug or have an idea for improvement, please open an issue in the repository.

## 📄 License

No open-source licence has been selected yet. All rights are reserved unless a licence is added to this repository.

---

**FamilyVault**  
*Your family's important records, organised in one place.*
