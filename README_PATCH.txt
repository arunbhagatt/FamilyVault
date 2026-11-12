FamilyVault UI polish patch

Files to replace:
- src/App.tsx
- src/styles.css

Included:
- Mobile navigation fixed to bottom with five icon-only tabs and dividers.
- Tree pinch zoom using pointer tracking, with one-finger pan support.
- Faster initial PDF layout: page placeholders are created from the first page dimensions; visible pages render lazily.
- PDF toolbar remains one horizontal, scrollable row on phones.
- Document edit dialog for name, category and assigned family member; original file is preserved.
- Monochrome mobile refinements and smooth page transitions.

No database schema changes. No Android app ID changes. No data reset or migration.

Build on Windows:
  npm run build
  npx cap sync android
  cd android
  .\gradlew.bat assembleDebug

Note: this patch does not replace the Android backup plugin. The backup folder URI fix from the prior patch remains in android/app/src/main/java/com/familyvault/app/FamilyVaultBackupPlugin.java. If backup still fails, collect the exact Android logcat exception before changing native URI handling again.
