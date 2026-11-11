# Lab X — Diagnostic Studio & LIS

> **Professional Laboratory Information System & Multi-Report Generator for PC & Web**

![Version](https://img.shields.io/badge/version-1.0.0-teal)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Web%20%7C%20Android-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🌟 Key Highlights

1. **Dual Mode Architecture**:
   - **Standalone Single File (`lab_x_standalone.html`)**: Open anywhere (Chrome, Edge, Android, Laptop) without installing any software or runtime!
   - **Desktop Native App (`.exe`)**: Built with **Electron.js** with silent printer support, local disk database sync, and OS integration.
2. **Clinical Test Formats**:
   - **Typhoid Card & Widal Agglutination (+/-)** with interactive clickable cells.
   - **Biochemistry Profile** (CRP, Fasting Glucose, Uric Acid, SGOT, SGPT, ALP).
   - **Complete Blood Count (CBC)** with automated DLC breakdown.
   - **Liver & Kidney Function Test (LFT/KFT)**.
   - **Thyroid Profile (FT3, FT4, TSH)**.
   - **Vitamin D & B12 Profile**.
3. **Smart Features**:
   - **Auto-Suggest & Returning Patient Lookup**: Type patient name or mobile to auto-fill demographics.
   - **Reorderable Print Pages**: Use ▲ / ▼ controls to arrange pages in any sequence.
   - **Independent Signature Controls**: Toggle Doctor (Pathologist) and D.M.L.T. signature boxes independently.
   - **Parameter Exclusion**: Easily toggle any test row ON/OFF (dimmed on screen, completely hidden from final print).
   - **Pre-printed Letterhead Compatible**: 95mm blank top margin reserved for clinic letterhead.
   - **WhatsApp & Web Share Dispatch**: Send instant report notifications to patients with custom accession details.
   - **Keyboard Shortcuts**: `Ctrl + S` (Save Record), `Ctrl + P` (Print), `Ctrl + F` (Search), `Ctrl + W` (WhatsApp Share).

---

## 🚀 How to Run & Build

### 1. Instant Run (No Installation Needed)
Simply open `lab_x_standalone.html` in any web browser (Google Chrome, Microsoft Edge, Firefox, Brave):
```bash
# On phone/Termux:
termux-open lab_x_standalone.html
```

### 2. Run on PC in Development Mode (Electron)
```bash
# 1. Install dependencies
pnpm install

# 2. Launch desktop app
pnpm start
```

### 3. Generate Windows `.exe` Executable
Run on your Windows PC or VM:
```bash
# Builds both NSIS Setup Installer and Portable .exe inside 'dist-electron/' folder
pnpm run dist
```
Or for a portable zero-install `.exe`:
```bash
pnpm run dist:portable
```

### 4. Build `.exe` Automatically with Free GitHub Actions
If you don't have a Windows PC right now:
1. Push this project to your GitHub repository.
2. Go to the **Actions** tab on GitHub.
3. The workflow **"Build Windows PC Executable (.exe)"** will automatically build the Windows `.exe` on a Microsoft Windows server.
4. Download the ready-to-run `.exe` directly from the GitHub Artifacts/Releases!

---

## 📁 Project Structure

```
projects/
├── index.html                 # Electron main UI (always synced with standalone)
├── lab_x_standalone.html      # 100% self-contained single-file version
├── main.js                    # Electron main process (printing, windows, IPC)
├── preload.js                 # Secure context bridge API
├── package.json               # Desktop app metadata & build configurations
└── .github/
    └── workflows/
        └── build-windows-exe.yml # Automated Windows .exe CI/CD builder
```

---

## 🤝 Developed for Krishna Computerized Laboratory
*Designed for speed, accuracy, and paper-perfect A4 printing.*