#!/usr/bin/env python3
"""
Lab X Studio — Automated Backup & Disaster Recovery Manager
Usage:
  python scripts/backup_manager.py create [optional_note]
  python scripts/backup_manager.py list
  python scripts/backup_manager.py restore [latest | backup_filename]
"""

import os
import sys
import zipfile
import subprocess
from datetime import datetime

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKUP_DIR = os.path.join(ROOT_DIR, 'backups')
PHONE_DOWNLOAD_PATH = '/sdcard/Download/Lab_X_Studio.html'

FILES_TO_BACKUP = [
    'index.html',
    'lab_x_standalone.html',
    'staging.html',
    'main.js',
    'package.json',
    '.gitignore',
]

DIRS_TO_BACKUP = [
    '.github',
    'reports_templates',
    'scripts',
]

def ensure_backup_dir():
    os.makedirs(BACKUP_DIR, exist_ok=True)

def create_backup(note="stable"):
    ensure_backup_dir()
    clean_note = "".join(c if c.isalnum() or c in "-_" else "_" for c in note)[:30]
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    zip_name = f"lab_x_backup_{timestamp}_{clean_note}.zip"
    zip_path = os.path.join(BACKUP_DIR, zip_name)

    backed_count = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for fname in FILES_TO_BACKUP:
            fpath = os.path.join(ROOT_DIR, fname)
            if os.path.exists(fpath):
                zipf.write(fpath, arcname=fname)
                backed_count += 1
        
        for dname in DIRS_TO_BACKUP:
            dpath = os.path.join(ROOT_DIR, dname)
            if os.path.exists(dpath):
                for root, _, files in os.walk(dpath):
                    for file in files:
                        full_p = os.path.join(root, file)
                        rel_p = os.path.relpath(full_p, ROOT_DIR)
                        zipf.write(full_p, arcname=rel_p)
                        backed_count += 1

    size_kb = os.path.getsize(zip_path) / 1024
    print(f"✓ Backup created successfully: {zip_name} ({size_kb:.1f} KB, {backed_count} files)")

    # Git Tag
    tag_name = f"backup-{timestamp}"
    try:
        subprocess.run(['git', 'tag', '-a', tag_name, '-m', f"Automated Backup: {clean_note}"], cwd=ROOT_DIR, check=True)
        print(f"✓ Git Tag created: {tag_name}")
    except Exception as e:
        print(f"! Note: Git tag skipped ({e})")

    return zip_path

def list_backups():
    ensure_backup_dir()
    backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith('.zip')], reverse=True)
    if not backups:
        print("No backups found in backups/ directory.")
        return []
    
    print(f"\nAvailable Backups ({len(backups)}):")
    print(f"{'#':<4} {'Filename':<45} {'Size (KB)':<12}")
    print("-" * 65)
    for i, b in enumerate(backups, 1):
        fpath = os.path.join(BACKUP_DIR, b)
        sz = os.path.getsize(fpath) / 1024
        print(f"{i:<4} {b:<45} {sz:<12.1f}")
    print("-" * 65 + "\n")
    return backups

def restore_backup(target='latest'):
    backups = list_backups()
    if not backups:
        print("Error: No backups available to restore.")
        return False
    
    target_zip = None
    if target == 'latest' or target == '1':
        target_zip = backups[0]
    else:
        for b in backups:
            if target in b:
                target_zip = b
                break
    
    if not target_zip:
        print(f"Error: Specified backup '{target}' not found.")
        return False

    zip_path = os.path.join(BACKUP_DIR, target_zip)
    print(f"Restoring from: {target_zip} ...")

    with zipfile.ZipFile(zip_path, 'r') as zipf:
        zipf.extractall(ROOT_DIR)

    # Sync to phone download
    index_path = os.path.join(ROOT_DIR, 'index.html')
    if os.path.exists(index_path) and os.path.exists('/sdcard/Download'):
        try:
            with open(index_path, 'r', encoding='utf-8') as src:
                content = src.read()
            with open(PHONE_DOWNLOAD_PATH, 'w', encoding='utf-8') as dst:
                dst.write(content)
            print(f"✓ Restored and synchronized: {PHONE_DOWNLOAD_PATH}")
        except Exception as e:
            print(f"! Note: Could not copy to /sdcard/Download: {e}")

    print(f"✓ Restore 100% COMPLETE. Codebase rolled back to: {target_zip}")
    return True

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'list'
    if cmd == 'create':
        note = sys.argv[2] if len(sys.argv) > 2 else 'stable_v1.4.0'
        create_backup(note)
    elif cmd == 'list':
        list_backups()
    elif cmd == 'restore':
        target = sys.argv[2] if len(sys.argv) > 2 else 'latest'
        restore_backup(target)
    else:
        print("Unknown command. Use: create, list, or restore")
