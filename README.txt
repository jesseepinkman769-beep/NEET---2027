NEET 2027 — Salaar Study System

Version 4 upgrades:
- Live command-center dashboard
- Daily execution, study time and question accuracy snapshot
- Syllabus core-progress summary
- Biology chapter/BPT/test accuracy summary
- Export and restore tracker backup
- My Vault now uses the user's Google Drive instead of a separate PDF database
- Upload, search, open and delete private PDF documents
- Categories: Tests, Mistake Notebook, Test Analysis, Other Study PDFs

GOOGLE DRIVE ONE-TIME SETUP
1. Create a Google Cloud project.
2. Enable the Google Drive API.
3. Configure OAuth consent screen / Google Auth Platform.
4. Create an OAuth 2.0 Client ID with application type "Web application".
5. Add the exact GitHub Pages origin as an Authorized JavaScript origin, e.g. https://YOUR-USERNAME.github.io
6. Copy the OAuth Client ID into vault-config.js.
7. Do NOT add a client secret to the website.
8. Open My Vault, tap Connect Google Drive, and authorize the account you want to use.

The app uses the drive.file scope, so it can manage files/folders created by this app without requesting full access to the user's entire Drive.

Open index.html to start. For PWA/service-worker behavior, use HTTPS hosting or localhost.
