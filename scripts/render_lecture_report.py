#!/usr/bin/env python3
"""Render the generated lecture-focus Markdown reports to tracked PDFs.

Requires Python-Markdown and a Chromium-compatible browser. Set CHROME_BIN when
Chrome is not on PATH or in the local agent-browser cache.
"""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

import markdown

ROOT = Path(__file__).resolve().parents[1]
REPORTS = [
    {
        "source": ROOT / "reports" / "lecture-focus-report.md",
        "output": ROOT / "reports" / "S3-Ghana_MED422_Lecture_Focus_Report.pdf",
        "freshness": ROOT / "reports" / "S3-Ghana_MED422_Lecture_Focus_Report.source.sha256",
        "title": "S3 Ghana MED422 Lecture Focus Report",
    },
    {
        "source": ROOT / "reports" / "final-1-lecture-focus-report.md",
        "output": ROOT / "reports" / "S3-Ghana_MED422_Final_1_Lecture_Focus_Report.pdf",
        "freshness": ROOT / "reports" / "S3-Ghana_MED422_Final_1_Lecture_Focus_Report.source.sha256",
        "title": "S3 Ghana MED422 Final 1 Lecture Focus Report",
    },
    {
        "source": ROOT / "reports" / "final-2-lecture-focus-report.md",
        "output": ROOT / "reports" / "S3-Ghana_MED422_Final_2_Lecture_Focus_Report.pdf",
        "freshness": ROOT / "reports" / "S3-Ghana_MED422_Final_2_Lecture_Focus_Report.source.sha256",
        "title": "S3 Ghana MED422 Final 2 Lecture Focus Report",
    },
]

CSS = r"""
@page { size: A4 landscape; margin: 11mm 12mm 12mm; }
:root { --ink:#172033; --muted:#5f6b7a; --line:#d8dee9; --blue:#3b63dd; --pale:#eef3ff; --navy:#111a31; }
* { box-sizing:border-box; }
body { margin:0; color:var(--ink); font-family:Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif; font-size:9.1pt; line-height:1.38; }
h1 { margin:0 0 5mm; padding:8mm 9mm; border-radius:5mm; color:white; background:linear-gradient(125deg,#111a31,#294aab 70%,#6a7eed); font-size:25pt; line-height:1.08; letter-spacing:-.035em; }
h1 + p { margin:-3mm 2mm 4mm; padding:3.5mm 4.5mm; border-left:1.4mm solid var(--blue); background:var(--pale); font-size:11pt; }
h2 { break-after:avoid; margin:7mm 0 2.2mm; padding-bottom:1.5mm; border-bottom:.5mm solid #a9b9ed; color:#17327c; font-size:15.5pt; letter-spacing:-.02em; }
h3 { break-after:avoid; margin:4.5mm 0 1.7mm; color:#263d7d; font-size:11.5pt; }
p { margin:1.5mm 0 2.2mm; }
blockquote { margin:2.5mm 0 4mm; padding:3mm 4mm; border-left:1.1mm solid #d59a1b; border-radius:0 3mm 3mm 0; background:#fff7df; color:#59420f; }
ol,ul { margin:1.5mm 0 3mm; padding-left:6mm; }
li { margin:.7mm 0; }
code { padding:.2mm 1mm; border-radius:1mm; background:#edf0f6; font-size:8.2pt; }
table { width:100%; margin:2mm 0 4mm; border-collapse:separate; border-spacing:0; border:0.25mm solid var(--line); border-radius:2.2mm; overflow:hidden; font-size:7.65pt; line-height:1.25; }
thead { display:table-header-group; }
tr { break-inside:avoid; }
th { padding:1.7mm 1.8mm; background:var(--navy); color:white; text-align:left; font-weight:700; }
td { padding:1.25mm 1.8mm; border-top:.2mm solid var(--line); vertical-align:top; }
tbody tr:nth-child(even) td { background:#f7f9fc; }
th:not(:first-child), td:not(:first-child) { text-align:right; }
td:first-child { text-align:left; }
strong { font-weight:750; }
a { color:var(--blue); }
body > h2:last-of-type { margin-top:2mm; margin-bottom:.8mm; padding-bottom:.8mm; }
body > h2:last-of-type + ul { margin-top:.8mm; margin-bottom:0; }
body > h2:last-of-type + ul li { margin:.3mm 0; }
.page-break { break-before:page; height:0; }
@media print { h2 { break-before:auto; } }
"""


def find_chrome() -> str:
    configured = os.environ.get("CHROME_BIN")
    if configured:
        path = Path(configured).expanduser()
        if path.is_file():
            return str(path)
        raise SystemExit(f"CHROME_BIN does not exist: {path}")

    for command in ("google-chrome", "chromium", "chromium-browser"):
        found = shutil.which(command)
        if found:
            return found

    cached = sorted(Path("/var/lib/lecture-tracker/model-home/.agent-browser/browsers").glob("chrome-*/chrome"), reverse=True)
    if cached:
        return str(cached[0])
    raise SystemExit("No Chrome/Chromium binary found; set CHROME_BIN")


def render_report(report: dict[str, Path | str], chrome: str) -> None:
    source = report["source"]
    output = report["output"]
    freshness = report["freshness"]
    title = report["title"]
    assert isinstance(source, Path)
    assert isinstance(output, Path)
    assert isinstance(freshness, Path)
    assert isinstance(title, str)

    source_bytes = source.read_bytes()
    source_text = source_bytes.decode("utf-8")
    body = markdown.markdown(source_text, extensions=["tables", "fenced_code", "toc"])
    document = (
        '<!doctype html><html><head><meta charset="utf-8">'
        f"<title>{title}</title><style>{CSS}</style>"
        f"</head><body>{body}</body></html>"
    )

    with tempfile.TemporaryDirectory(prefix="s3-lecture-report-") as temp_dir:
        temp = Path(temp_dir)
        html_path = temp / "report.html"
        pdf_path = temp / "report.pdf"
        html_path.write_text(document, encoding="utf-8")
        command = [
            chrome,
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            "--disable-extensions",
            "--no-pdf-header-footer",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=1000",
            f"--print-to-pdf={pdf_path}",
            html_path.as_uri(),
        ]
        result = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=120)
        if result.returncode != 0 or not pdf_path.exists():
            raise SystemExit(f"Chrome PDF render failed ({result.returncode}):\n{result.stdout}")
        rendered_pdf = pdf_path.read_bytes()
        if not rendered_pdf.startswith(b"%PDF-") or len(rendered_pdf) < 10_000:
            raise SystemExit("Chrome produced an invalid or unexpectedly small PDF")
        output.parent.mkdir(parents=True, exist_ok=True)
        pdf_path.replace(output)

    source_hash = hashlib.sha256(source_bytes).hexdigest()
    pdf_hash = hashlib.sha256(output.read_bytes()).hexdigest()
    freshness.write_text(
        f"{source_hash}  {source.name}\n{pdf_hash}  {output.name}\n",
        encoding="utf-8",
    )
    print(f"Rendered {output.relative_to(ROOT)} ({output.stat().st_size} bytes)")
    print(f"Source SHA-256: {source_hash}")
    print(f"PDF SHA-256: {pdf_hash}")


def main() -> None:
    chrome = find_chrome()
    for report in REPORTS:
        render_report(report, chrome)


if __name__ == "__main__":
    main()
