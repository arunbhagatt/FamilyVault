# FamilyVault

**Your family's important information, organised in one place.**

FamilyVault is an offline-first Android application designed to help families organise personal information, manage family relationships and keep important documents together — all on one device.

Built with React, TypeScript, Vite and Capacitor, FamilyVault provides a simple, clean interface for managing family members, visualising family connections and storing important documents locally.

---

## Features

### 👨‍👩‍👧‍👦 Family Management
- Add, edit and manage family members.
- Record relationships between family members.
- Support for parents, children, siblings, spouses and friends.
- View individual family member profiles.
- Pin frequently accessed members to the home screen.
- Search and organise family members.

### 🌳 Interactive Family Tree
- Visual representation of family relationships.
- Connected family members and generations.
- Select a person to view their profile and associated documents.
- Pinch-to-zoom and pan around the family tree.

### 📁 Document Management
- Import and organise important family documents.
- Support for PDF and common image formats.
- Assign document categories and family members.
- Rename, preview, share and manage documents.
- Grid-based and list-based document views.

### 📖 PDF Viewer
- Continuous vertical PDF viewing.
- Zoom and navigation controls.
- Search within PDF documents.
- Page navigation.
- Touch-friendly viewing experience.

### 💾 Backup & Restore
- Create FamilyVault backups using the `.fvault` format.
- Choose a destination folder for backups.
- Restore information from an existing backup.
- Two restore options:
  - **Add New Files Only**
  - **Update and Add New Files**

### 🎨 User Interface
- Minimal, monochrome-inspired design.
- Mobile-friendly interface.
- Bottom navigation with icon-based controls.
- Smooth navigation between application sections.
- Simple layout designed for everyday use.

---

## Privacy & Offline Usage

FamilyVault is designed around local-first storage.

- Family information and documents are stored locally on the device.
- No account registration is required.
- No cloud account is required.
- No external backend is required for normal application usage.
- No analytics or advertising services are intentionally integrated.

**Important:** Local storage is not the same as end-to-end encryption. Protect your device and maintain regular backups of important documents.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Application logic |
| Vite | Development and production builds |
| Tailwind CSS | Styling |
| Capacitor | Android application integration |
| IndexedDB | Local application data |
| PDF.js | PDF rendering |
| Java / Gradle | Android native build |

---

## Getting Started

### Prerequisites

Install the following:

- Node.js 22 or newer
- npm
- Java JDK 21
- Android SDK
- Android platform tools
- Git

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
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

### 5. Build the web application

```bash
npm run build
```

---

## Building the Android APK

After installing dependencies and configuring the Android development environment:

```bash
npm run build
npx cap sync android
```

Navigate to the Android directory:

```bash
cd android
```

Build the debug APK:

**Windows:**
```powershell
.\gradlew.bat assembleDebug
```

**Linux / macOS:**
```bash
./gradlew assembleDebug
```

The generated APK can be found at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Transfer the APK to your Android device and install it.

---

## Project Structure

```text
FamilyVault/
│
├── android/                 # Android native project
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable UI components
│   ├── data/                # Local data and database logic
│   ├── services/            # Application services
│   ├── App.tsx              # Main application
│   ├── main.tsx             # Application entry point
│   └── styles.css           # Application styles
│
├── index.html
├── package.json
├── capacitor.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Backup Recommendation

Before using FamilyVault to store important family documents:

1. Add a few sample family members.
2. Import some sample documents.
3. Create a `.fvault` backup.
4. Test restoring the backup.
5. Keep a copy of your backup in a separate location.

Never rely on a single copy of important documents.

---

## Project Goals

FamilyVault aims to make family document organisation simple, accessible and independent of cloud services.

The goal is not to build another complicated document management platform, but to provide a lightweight application that anyone in the family can use comfortably.

---

## Contributions

Suggestions, bug reports and contributions are welcome.

If you find a bug or have an idea for improvement, feel free to open an issue or submit a pull request.

---

---

**FamilyVault — A place for what matters.**