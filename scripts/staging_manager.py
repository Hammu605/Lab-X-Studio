#!/usr/bin/env python3
"""
Lab X Studio — Staging & Report Template Promotion Manager
Allows testing new diagnostic reports in an isolated staging sandbox before touching production.

Usage:
  python scripts/staging_manager.py preview reports_templates/urine_examination.json
  python scripts/staging_manager.py promote reports_templates/urine_examination.json
"""

import os
import sys
import json
import subprocess

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STAGING_HTML_PATH = os.path.join(ROOT_DIR, 'staging.html')
INDEX_HTML_PATH = os.path.join(ROOT_DIR, 'index.html')
PHONE_STAGING_PATH = '/sdcard/Download/Lab_X_Staging.html'
PHONE_PROD_PATH = '/sdcard/Download/Lab_X_Studio.html'

def load_template(json_path):
    if not os.path.isabs(json_path):
        json_path = os.path.join(ROOT_DIR, json_path)
    if not os.path.exists(json_path):
        raise FileNotFoundError(f"Template not found: {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def render_report_html(tmpl):
    """Renders a complete A4 sheet HTML string from modular JSON template."""
    sheet_id = f"sheet_{tmpl['reportId']}"
    tbody_id = f"tbody_{tmpl['reportId']}"
    title = tmpl.get('reportTitle', 'INVESTIGATION REPORT')
    impression = tmpl.get('defaultImpression', 'Within biological reference limits.')

    rows_html = ""
    for sec in tmpl.get('sections', []):
        sec_title = sec.get('sectionTitle', '')
        if sec_title:
            rows_html += f"""
              <tr class="bg-slate-100/80 font-black text-[11px] text-slate-800 tracking-wider">
                <td colspan="6" class="py-1 px-2 uppercase">{sec_title}</td>
              </tr>
            """
        for param in sec.get('parameters', []):
            name = param.get('name', 'Test Parameter')
            val = param.get('defaultValue', '-')
            units = param.get('units', '-')
            ref = param.get('referenceRange', '-')
            low = param.get('low', '')
            high = param.get('high', '')

            low_attr = f'data-low="{low}"' if low != '' else ''
            high_attr = f'data-high="{high}"' if high != '' else ''

            rows_html += f"""
              <tr>
                <td class="py-1.5 font-bold"><span class="editable-field" contenteditable="true">{name}</span></td>
                <td class="py-1.5 text-center font-bold"><span class="editable-field param-val" {low_attr} {high_attr} contenteditable="true" onblur="recheckFlags()">{val}</span></td>
                <td class="py-1.5 text-center font-bold text-[11px] flag-cell text-emerald-600">NORMAL</td>
                <td class="py-1.5 text-center text-gray-600"><span class="editable-field" contenteditable="true">{units}</span></td>
                <td class="py-1.5 text-right text-gray-700"><span class="editable-field" contenteditable="true">{ref}</span></td>
                <td class="py-1.5 text-center no-print"><button onclick="this.closest('tr').remove(); recheckFlags()" class="text-rose-500 hover:text-rose-700 text-xs"><i class="fa-solid fa-xmark"></i></button></td>
              </tr>
            """

    return f"""
    <!-- DYNAMIC REPORT SHEET: {title} -->
    <article id="{sheet_id}" class="a4-sheet" data-report-title="{title}">
      <div class="page-content-wrapper">
        <div class="clinic-header-space">
          <div class="preprinted-spacer w-full relative">
            <div class="no-print absolute inset-0 border border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 text-xs">
              <span class="font-semibold text-gray-400"><i class="fa-regular fa-image mr-1"></i> Pre-Printed Clinic Letterhead Space (<span class="disp-spacerHeightText">40mm</span> Blank)</span>
            </div>
          </div>
          <div class="digital-header-block hidden w-full pb-2 border-b-2 border-teal-700">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-xl"><i class="fa-solid fa-microscope"></i></div>
                <div>
                  <h1 class="text-lg font-black tracking-wide text-teal-900 disp-clinicName">KRISHNA DIAGNOSTIC LABORATORY</h1>
                  <p class="text-[11px] font-semibold text-gray-600 disp-clinicAddress">Near Civil Hospital, Main Road, Punjab • Ph: +91 98765 43210</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-[10px] font-mono font-bold bg-teal-100 text-teal-900 px-2 py-0.5 rounded border border-teal-300">ISO 9001:2015 CERTIFIED</div>
                <div class="text-[9.5px] text-gray-500 mt-1">24x7 Diagnostic Services</div>
              </div>
            </div>
          </div>
        </div>

        <div class="w-full mt-2"><div class="border-t-2 border-black w-full"></div><div class="border-t border-black w-full mt-[2px]"></div></div>

        <!-- Demographics -->
        <section class="mt-2.5 text-[12px] leading-tight text-black">
          <div class="grid grid-cols-2 gap-x-6">
            <div class="space-y-1">
              <div class="flex items-baseline"><span class="font-bold w-28 shrink-0">Patient Name</span><span class="font-semibold mr-1.5">:</span><span class="editable-field font-semibold flex-1 disp-pName" contenteditable="true">Mrs. Naseeb Kaur</span></div>
              <div class="flex items-baseline"><span class="font-bold w-28 shrink-0">Patient ID</span><span class="font-semibold mr-1.5">:</span><span class="editable-field font-mono font-bold flex-1 disp-pId" contenteditable="true">PID-2026-1049</span></div>
              <div class="flex items-baseline"><span class="font-bold w-28 shrink-0">Age / Gender</span><span class="font-semibold mr-1.5">:</span><span class="editable-field flex-1 disp-pAgeGender" contenteditable="true">46 Y / Female</span></div>
              <div class="flex items-baseline"><span class="font-bold w-28 shrink-0">Referred By</span><span class="font-semibold mr-1.5">:</span><span class="editable-field flex-1 disp-pRefBy" contenteditable="true">Dr. H. S. Dhillon, M.D.</span></div>
            </div>
            <div class="space-y-1">
              <div class="flex items-baseline"><span class="font-bold w-36 shrink-0">Lab Accession No.</span><span class="font-semibold mr-1.5">:</span><span class="editable-field flex-1 font-mono font-bold disp-pLabNo" contenteditable="true">LAB-7842</span></div>
              <div class="flex items-baseline"><span class="font-bold w-36 shrink-0">Date &amp; Time</span><span class="font-semibold mr-1.5">:</span><span class="editable-field flex-1 disp-pDate" contenteditable="true">12-Nov-2026 10:15 AM</span></div>
              <div class="flex items-baseline"><span class="font-bold w-36 shrink-0">Specimen Type</span><span class="font-semibold mr-1.5">:</span><span class="editable-field flex-1 disp-pSpecimen" contenteditable="true">Clean Catch Urine</span></div>
              <div class="flex items-center pt-0.5"><span class="font-bold w-36 shrink-0">Barcode ID</span><span class="font-semibold mr-1.5">:</span><div class="barcode-holder inline-block"></div></div>
            </div>
          </div>
        </section>

        <div class="w-full mt-2.5"><div class="border-t border-black w-full"></div><div class="border-t-2 border-black w-full mt-[2px]"></div></div>

        <!-- Title Bar -->
        <div class="mt-2 text-center bg-slate-100 py-1 rounded border border-slate-300">
          <span class="text-xs font-black tracking-widest text-slate-800 uppercase editable-field" contenteditable="true">{title}</span>
        </div>

        <!-- Table -->
        <table class="w-full text-left text-[12px] border-collapse mt-3">
          <thead>
            <tr class="border-b-2 border-black text-black">
              <th class="py-1 px-1 font-bold">TEST DESCRIPTION</th>
              <th class="py-1 px-1 font-bold text-center">RESULT</th>
              <th class="py-1 px-1 font-bold text-center">FLAG</th>
              <th class="py-1 px-1 font-bold text-center">UNITS</th>
              <th class="py-1 px-1 font-bold text-right">REFERENCE RANGE</th>
              <th class="py-1 px-1 font-bold text-center no-print w-8">ACTION</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200" id="{tbody_id}">
            {rows_html}
          </tbody>
        </table>

        <!-- Clinical Impression -->
        <div class="mt-4 p-2 bg-slate-50 border border-slate-300 rounded text-[11px] text-slate-800 leading-normal">
          <span class="font-bold text-black uppercase">Impression / Note:</span>
          <span class="disp-doctorRemarks ml-1" contenteditable="true">{impression}</span>
        </div>
      </div>

      <!-- Footer -->
      <footer class="mt-4 pt-2">
        <div class="flex items-end justify-between min-h-[55px] mb-2">
          <div class="doctor-signature-container">
            <div class="text-[13px] font-bold text-black disp-docName">Dr. Gurpreet Singh, M.D.</div>
            <div class="text-[11px] font-semibold text-gray-800 disp-docDegree">Consultant Clinical Pathologist</div>
            <div class="text-[9.5px] text-gray-500">Reg. No: PMC-48291</div>
          </div>
          <div class="qr-stamp-container text-center flex flex-col items-center">
            <div class="qr-svg-holder"></div>
            <span class="text-[8.5px] font-mono text-gray-500 mt-0.5">SCAN TO VERIFY</span>
          </div>
          <div class="lab-technician-container text-right">
            <div class="text-[12px] font-bold text-gray-800 disp-staffName">Harpreet Sharma, DMLT</div>
            <div class="text-[10px] text-gray-600">Chief Medical Lab Technologist</div>
          </div>
        </div>
        <div class="border-t border-gray-400 pt-1 flex justify-between text-[9px] text-gray-500 font-mono">
          <span>Electronic Diagnostic Report • Lab X Studio Ultra</span>
          <span>End of Report</span>
        </div>
      </footer>
    </article>
    """

def create_staging_preview(json_path):
    """Builds staging.html and deploys it to /sdcard/Download for 1-tap phone review."""
    tmpl = load_template(json_path)
    with open(INDEX_HTML_PATH, 'r', encoding='utf-8') as f:
        html = f.read()

    report_html = render_report_html(tmpl)

    # Insert into reports-container before </main>
    anchor = '</main>'
    if anchor not in html:
        raise ValueError("Could not find </main> anchor in index.html")

    staging_banner = f"""
    <!-- STAGING BADGE (SANDBOX PREVIEW MODE) -->
    <div id="stagingBanner" class="no-print bg-amber-500/20 border-b border-amber-500/40 text-amber-200 text-xs px-4 py-2 flex items-center justify-between font-mono">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-flask-vial text-amber-400 text-sm"></i>
        <span><strong>STAGING SANDBOX PREVIEW:</strong> Testing "{tmpl['reportTitle']}" (Safe Mode - Master Code Unmodified)</span>
      </div>
      <span class="text-[10px] bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">ISOLATED BETA TEST</span>
    </div>
    """

    # Add staging banner right after <body>
    html_with_banner = html.replace('<!-- ========================================== -->\n  <!-- 1. TOP CONTROL NAVIGATION BAR -->', staging_banner + '\n  <!-- ========================================== -->\n  <!-- 1. TOP CONTROL NAVIGATION BAR -->')

    # Add report sheet before </main>
    html_staging = html_with_banner.replace(anchor, f"{report_html}\n{anchor}")

    # Write staging.html
    with open(STAGING_HTML_PATH, 'w', encoding='utf-8') as f:
        f.write(html_staging)

    # Write to phone download
    if os.path.exists('/sdcard/Download'):
        with open(PHONE_STAGING_PATH, 'w', encoding='utf-8') as f:
            f.write(html_staging)
        print(f"✓ Phone Staging File updated: {PHONE_STAGING_PATH}")

    print(f"✓ Staging sandbox ready: {STAGING_HTML_PATH}")
    print(f"👉 You can open and test this file on phone or PC without affecting production!")
    return STAGING_HTML_PATH

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'preview'
    target_json = sys.argv[2] if len(sys.argv) > 2 else 'reports_templates/urine_examination.json'
    if cmd == 'preview':
        create_staging_preview(target_json)
    else:
        print("Usage: python scripts/staging_manager.py preview <template.json>")
