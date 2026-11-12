# FamilyVault patch – 31 October 2026

## Changes
- Fixed Android Storage Access Framework backup creation by converting the persisted tree URI into its document URI before calling `DocumentsContract.createDocument`.
- Added pinch-to-zoom and on-screen zoom controls to the family tree.
- Changed PDF rendering to create page placeholders and render pages lazily as they approach the viewport, rather than rendering every page before showing the document.
- Kept the current PDF page position when zoom changes and updated the page indicator while scrolling.
- Consolidated the PDF controls into one horizontally scrollable toolbar row.
- Improved PDF vertical scrolling and page navigation smoothness.
- Cached native share files after the first share of a document to make subsequent shares faster.
- Applied a restrained monochrome theme and smoother page-transition animation.

## Important testing note
This source patch has not been built on the user's Windows machine or tested on the Redmi device. Run the web production build and Android Gradle build before installing. Test backup creation with dummy files before relying on it for important documents.
