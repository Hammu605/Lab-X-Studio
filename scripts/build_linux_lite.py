#!/usr/bin/env python3
import os
import shutil
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_HTML = os.path.join(ROOT_DIR, 'index.html')
DIST_DIR = os.path.join(ROOT_DIR, 'dist-electron')
os.makedirs(DIST_DIR, exist_ok=True)

VERSION = "1.1.2"
PKG_NAME = "lab-x-studio-lite"
WORK_DIR = os.path.join(DIST_DIR, "deb_work")
shutil.rmtree(WORK_DIR, ignore_errors=True)

# 1. Directory Tree
os.makedirs(f"{WORK_DIR}/DEBIAN", mode=0o755, exist_ok=True)
os.makedirs(f"{WORK_DIR}/usr/bin", mode=0o755, exist_ok=True)
os.makedirs(f"{WORK_DIR}/usr/share/applications", mode=0o755, exist_ok=True)
os.makedirs(f"{WORK_DIR}/usr/share/lab-x-studio", mode=0o755, exist_ok=True)
os.makedirs(f"{WORK_DIR}/usr/share/icons/hicolor/scalable/apps", mode=0o755, exist_ok=True)

# 2. Debian Control
control_content = f"""Package: {PKG_NAME}
Version: {VERSION}
Section: office
Priority: optional
Architecture: all
Maintainer: Krishna Diagnostic Laboratory <support@krishnalab.com>
Depends: bash
Recommends: chromium | google-chrome-stable | brave-browser | firefox-esr | firefox
Description: Lab X Studio Ultra-Lightweight Diagnostic Workstation
 Professional pathology diagnostic studio and multi-report generator for Linux.
 Native, lightning-fast (<1 MB), uses installed browser engine in standalone app window.
"""
with open(f"{WORK_DIR}/DEBIAN/control", "w", encoding="utf-8") as f:
    f.write(control_content)
os.chmod(f"{WORK_DIR}/DEBIAN/control", 0o644)

# 3. Post-install script
postinst_content = """#!/bin/sh
chmod +x /usr/bin/lab-x-studio
update-desktop-database 2>/dev/null || true
gtk-update-icon-cache -f /usr/share/icons/hicolor 2>/dev/null || true

# Add Desktop Shortcut for desktop users
for user_dir in /home/*; do
    if [ -d "$user_dir/Desktop" ]; then
        cp -f /usr/share/applications/lab-x-studio.desktop "$user_dir/Desktop/" 2>/dev/null || true
        chmod +x "$user_dir/Desktop/lab-x-studio.desktop" 2>/dev/null || true
        chown $(stat -c '%U:%G' "$user_dir") "$user_dir/Desktop/lab-x-studio.desktop" 2>/dev/null || true
    fi
done
exit 0
"""
with open(f"{WORK_DIR}/DEBIAN/postinst", "w", encoding="utf-8") as f:
    f.write(postinst_content)
os.chmod(f"{WORK_DIR}/DEBIAN/postinst", 0o755)

# 4. Standalone Runner Script
runner_content = """#!/usr/bin/env bash
HTML_FILE="file:///usr/share/lab-x-studio/index.html"

# Run in borderless dedicated application window mode
if command -v chromium >/dev/null 2>&1; then
    exec chromium --app="$HTML_FILE" --start-maximized --class="LabXStudio" "$@"
elif command -v chromium-browser >/dev/null 2>&1; then
    exec chromium-browser --app="$HTML_FILE" --start-maximized --class="LabXStudio" "$@"
elif command -v google-chrome >/dev/null 2>&1; then
    exec google-chrome --app="$HTML_FILE" --start-maximized --class="LabXStudio" "$@"
elif command -v brave-browser >/dev/null 2>&1; then
    exec brave-browser --app="$HTML_FILE" --start-maximized --class="LabXStudio" "$@"
elif command -v microsoft-edge >/dev/null 2>&1; then
    exec microsoft-edge --app="$HTML_FILE" --start-maximized --class="LabXStudio" "$@"
elif command -v firefox >/dev/null 2>&1; then
    exec firefox --new-window "$HTML_FILE" "$@"
elif command -v xdg-open >/dev/null 2>&1; then
    exec xdg-open "$HTML_FILE"
else
    echo "Please open /usr/share/lab-x-studio/index.html in any web browser."
fi
"""
with open(f"{WORK_DIR}/usr/bin/lab-x-studio", "w", encoding="utf-8") as f:
    f.write(runner_content)
os.chmod(f"{WORK_DIR}/usr/bin/lab-x-studio", 0o755)

# 5. Desktop Application Entry
desktop_content = """[Desktop Entry]
Version=1.0
Type=Application
Name=Lab X Studio
GenericName=Pathology Diagnostic Workstation
Comment=Professional Pathology Diagnostic Workstation & Report Generator
Exec=/usr/bin/lab-x-studio %u
Icon=lab-x-studio
Terminal=false
Categories=Office;MedicalSoftware;Utility;
StartupWMClass=LabXStudio
MimeType=text/html;
Keywords=pathology;laboratory;blood;report;cbc;lft;kft;
"""
with open(f"{WORK_DIR}/usr/share/applications/lab-x-studio.desktop", "w", encoding="utf-8") as f:
    f.write(desktop_content)

# 6. High-Res SVG Icon
svg_icon = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f766e"/><stop offset="100%" stop-color="#042f2e"/></linearGradient></defs>
<rect width="512" height="512" rx="128" fill="url(#g)"/>
<path fill="#ffffff" d="M384 320c-17.7 0-32-14.3-32-32 0-35.3-28.7-64-64-64h-32v128c0 17.7-14.3 32-32 32s-32-14.3-32-32V128c0-17.7 14.3-32 32-32s32 14.3 32 32v64h32c70.7 0 128 57.3 128 128 0 17.7-14.3 32-32 32z"/>
<circle cx="224" cy="384" r="32" fill="#2dd4bf"/>
</svg>"""
with open(f"{WORK_DIR}/usr/share/icons/hicolor/scalable/apps/lab-x-studio.svg", "w", encoding="utf-8") as f:
    f.write(svg_icon)
with open(f"{WORK_DIR}/usr/share/lab-x-studio/icon.svg", "w", encoding="utf-8") as f:
    f.write(svg_icon)

# 7. Copy production index.html
shutil.copy(INDEX_HTML, f"{WORK_DIR}/usr/share/lab-x-studio/index.html")

# Ensure proper permissions for all files and directories
for root, dirs, files in os.walk(WORK_DIR):
    for d in dirs:
        os.chmod(os.path.join(root, d), 0o755)
    for fl in files:
        if fl not in ['postinst', 'lab-x-studio']:
            os.chmod(os.path.join(root, fl), 0o644)

# 8. Build Debian Package (.deb) using dpkg-deb with maximum xz compression
out_deb = os.path.join(DIST_DIR, f"Lab-X-Studio-Linux-Lite-{VERSION}.deb")
subprocess.run(["dpkg-deb", "-Zxz", "--build", WORK_DIR, out_deb], check=True)
deb_size = os.path.getsize(out_deb) / 1024
print(f"Created Lite .deb: {out_deb} ({deb_size:.1f} KB)")

# 9. Build Standalone Portable Archive (.tar.gz)
import tarfile
portable_script = """#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
HTML_FILE="file://$DIR/index.html"

if command -v chromium >/dev/null 2>&1; then
    exec chromium --app="$HTML_FILE" --start-maximized --class="LabXStudio" "$@"
elif command -v chromium-browser >/dev/null 2>&1; then
    exec chromium-browser --app="$HTML_FILE" --start-maximized --class="LabXStudio" "$@"
elif command -v google-chrome >/dev/null 2>&1; then
    exec google-chrome --app="$HTML_FILE" --start-maximized --class="LabXStudio" "$@"
elif command -v brave-browser >/dev/null 2>&1; then
    exec brave-browser --app="$HTML_FILE" --start-maximized --class="LabXStudio" "$@"
elif command -v microsoft-edge >/dev/null 2>&1; then
    exec microsoft-edge --app="$HTML_FILE" --start-maximized --class="LabXStudio" "$@"
elif command -v firefox >/dev/null 2>&1; then
    exec firefox --new-window "$HTML_FILE" "$@"
elif command -v xdg-open >/dev/null 2>&1; then
    exec xdg-open "$HTML_FILE"
else
    echo "Please open $HTML_FILE in your browser."
fi
"""
port_sh_path = os.path.join(DIST_DIR, "run.sh")
with open(port_sh_path, "w", encoding="utf-8") as f:
    f.write(portable_script)
os.chmod(port_sh_path, 0o755)

out_tar = os.path.join(DIST_DIR, f"Lab-X-Studio-Linux-Portable-{VERSION}.tar.gz")
with tarfile.open(out_tar, "w:gz") as tar:
    tar.add(INDEX_HTML, arcname="Lab-X-Studio/index.html")
    tar.add(port_sh_path, arcname="Lab-X-Studio/run.sh")
    tar.add(f"{WORK_DIR}/usr/share/lab-x-studio/icon.svg", arcname="Lab-X-Studio/icon.svg")
    tar.add(f"{WORK_DIR}/usr/share/applications/lab-x-studio.desktop", arcname="Lab-X-Studio/lab-x-studio.desktop")

if os.path.exists(port_sh_path):
    os.remove(port_sh_path)
shutil.rmtree(WORK_DIR, ignore_errors=True)

tar_size = os.path.getsize(out_tar) / 1024
print(f"Created Portable .tar.gz: {out_tar} ({tar_size:.1f} KB)")
