#!/usr/bin/env python3
"""Build laptops catalog Excel with embedded product images (Flipkart + curated)."""

from __future__ import annotations

import csv
import io
import re
import time
from pathlib import Path
from urllib.parse import quote

import requests
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from PIL import Image as PILImage

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "laptops_multi_brand_catalog (1).csv"
OUT_XLSX = ROOT / "laptops_multi_brand_catalog.xlsx"
IMG_DIR = ROOT / "catalog_images"

UA = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
}

# Prefer these when Flipkart search is noisy (Apple / less common SKUs)
CURATED: dict[str, list[str]] = {
    "LAP-APL-001": [
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-midnight-select-20220606?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1653084303665",
        "https://cdsassets.apple.com/live/7WUAS350/images/tech-specs/macbook-air-13-inch-m2.png",
    ],
    "LAP-APL-002": [
        "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/mba13-m3-midnight-gallery1-202402?wid=4000&hei=3072&fmt=jpeg&qlt=90",
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-midnight-select-20220606?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1653084303665",
    ],
    "LAP-APL-003": [
        "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202310?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697230830066",
        "https://cdsassets.apple.com/live/7WUAS350/images/tech-specs/mbp14-m3.png",
    ],
    "LAP-DEL-003": [
        "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-13-9340/media-gallery/notebook-xps-13-9340-gray-gallery-4.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=402&qlt=100,1&resMode=sharp2&size=402,402&chrss=full",
    ],
}

ACCESSORY_BITS = (
    "keyboard",
    "adapter",
    "battery",
    "screen-guard",
    "mouse",
    "bag",
    "sleeve",
    "stand",
    "cooler",
    "charger",
    "dock",
    "hdd",
    "ssd-drive",
)


def flipkart_laptop_images(query: str) -> list[str]:
    url = f"https://www.flipkart.com/search?q={quote(query)}"
    try:
        resp = requests.get(url, headers=UA, timeout=35)
        resp.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        print(f"  flipkart error: {exc}")
        return []

    raw = re.findall(
        r"(https://rukminim\d*\.flixcart\.com/image/[^\"\\\s]+?\.(?:jpe?g|png|webp))",
        resp.text,
        flags=re.I,
    )
    out: list[str] = []
    seen: set[str] = set()
    for u in raw:
        u = u.replace("\\/", "/")
        low = u.lower()
        if "/computer/" not in low:
            continue
        if any(b in low for b in ACCESSORY_BITS):
            continue
        # Normalize to a useful preview size
        u = re.sub(r"/image/\d+/\d+/", "/image/416/416/", u)
        if u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out


def download_image(url: str, dest: Path) -> bool:
    try:
        resp = requests.get(url, headers=UA, timeout=35)
        resp.raise_for_status()
        data = resp.content
        if len(data) < 4_000:
            return False
        img = PILImage.open(io.BytesIO(data))
        img = img.convert("RGB")
        w, h = img.size
        if w < 100 or h < 80:
            return False
        img.thumbnail((360, 270), PILImage.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, format="JPEG", quality=90, optimize=True)
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"  download fail: {exc}")
        return False


def fetch_product_image(row: dict) -> Path | None:
    sku = row["SKU_ID"]
    dest = IMG_DIR / f"{sku}.jpg"
    if dest.exists():
        dest.unlink()

    candidates: list[str] = []
    candidates.extend(CURATED.get(sku, []))

    queries = [
        row["Model_Name"],
        f"{row['Brand']} {row['Series']} laptop",
        f"{row['Brand']} {row['Model_Name'].split()[-1]} laptop",
    ]
    for q in queries:
        print(f"  flipkart: {q}")
        candidates.extend(flipkart_laptop_images(q))
        time.sleep(0.5)

    # Deduplicate while preserving order
    seen: set[str] = set()
    uniq: list[str] = []
    for u in candidates:
        if u not in seen:
            seen.add(u)
            uniq.append(u)

    for url in uniq:
        if download_image(url, dest):
            print(f"  saved ← {url[:100]}")
            return dest
        time.sleep(0.15)
    return None


def style_header(ws) -> None:
    fill = PatternFill("solid", fgColor="1F2937")
    font = Font(bold=True, color="FFFFFF", name="Calibri", size=11)
    thin = Border(
        left=Side(style="thin", color="D1D5DB"),
        right=Side(style="thin", color="D1D5DB"),
        top=Side(style="thin", color="D1D5DB"),
        bottom=Side(style="thin", color="D1D5DB"),
    )
    for cell in ws[1]:
        cell.fill = fill
        cell.font = font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin


def main() -> None:
    IMG_DIR.mkdir(parents=True, exist_ok=True)

    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    wb = Workbook()
    ws = wb.active
    ws.title = "Laptop Catalog"

    columns = [
        "Image",
        "SKU_ID",
        "Brand",
        "Series",
        "Model_Name",
        "Category",
        "Processor",
        "RAM",
        "Storage",
        "Display",
        "Graphics",
        "OS",
        "MRP_INR",
        "Retail_Price_INR",
        "Warranty",
        "Image_File",
        "Region",
        "Supplier_Name",
        "Supplier_Phone",
    ]

    REGIONS = ["Bangalore", "Mumbai", "Delhi"]
    SUPPLIERS = {
        "Bangalore": ("Silicon Hub Distributors", "+919845512345"),
        "Mumbai": ("Gateway Tech Supplies", "+919820045678"),
        "Delhi": ("Capital Circuit Traders", "+919811178901"),
    }
    ws.append(columns)
    style_header(ws)
    ws.row_dimensions[1].height = 28

    widths = {
        "A": 20,
        "B": 14,
        "C": 10,
        "D": 14,
        "E": 34,
        "F": 20,
        "G": 26,
        "H": 14,
        "I": 16,
        "J": 26,
        "K": 28,
        "L": 14,
        "M": 12,
        "N": 16,
        "O": 22,
        "P": 16,
        "Q": 12,
        "R": 26,
        "S": 16,
    }
    for col, width in widths.items():
        ws.column_dimensions[col].width = width

    thin = Border(
        left=Side(style="thin", color="E5E7EB"),
        right=Side(style="thin", color="E5E7EB"),
        top=Side(style="thin", color="E5E7EB"),
        bottom=Side(style="thin", color="E5E7EB"),
    )
    alt_fill = PatternFill("solid", fgColor="F9FAFB")

    missing: list[str] = []
    for idx, row in enumerate(rows, start=2):
        sku = row["SKU_ID"]
        print(f"[{idx - 1}/{len(rows)}] {sku} — {row['Model_Name']}")
        img_path = fetch_product_image(row)
        if not img_path:
            missing.append(sku)

        region = row.get("Region") or REGIONS[(idx - 2) % 3]
        supplier_name = row.get("Supplier_Name") or SUPPLIERS[region][0]
        supplier_phone = row.get("Supplier_Phone") or SUPPLIERS[region][1]
        values = [
            "",
            row["SKU_ID"],
            row["Brand"],
            row["Series"],
            row["Model_Name"],
            row["Category"],
            row["Processor"],
            row["RAM"],
            row["Storage"],
            row["Display"],
            row["Graphics"],
            row["OS"],
            int(row["MRP_INR"]),
            int(row["Retail_Price_INR"]),
            row["Warranty"],
            img_path.name if img_path else "",
            region,
            supplier_name,
            supplier_phone,
        ]
        ws.append(values)
        ws.row_dimensions[idx].height = 125

        for col_idx in range(1, len(columns) + 1):
            cell = ws.cell(row=idx, column=col_idx)
            cell.border = thin
            cell.alignment = Alignment(vertical="center", wrap_text=True)
            if idx % 2 == 0:
                cell.fill = alt_fill
            if col_idx in (13, 14):
                cell.number_format = "₹#,##0"
                cell.alignment = Alignment(vertical="center", horizontal="right")

        if img_path and img_path.exists():
            xl_img = XLImage(str(img_path))
            xl_img.width = 150
            xl_img.height = 112
            xl_img.anchor = f"A{idx}"
            ws.add_image(xl_img)

    ws.freeze_panes = "B2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(columns))}{len(rows) + 1}"
    wb.save(OUT_XLSX)

    print(f"\nWrote {OUT_XLSX}")
    print(f"Images: {len(list(IMG_DIR.glob('*.jpg')))}/{len(rows)}")
    if missing:
        print("Missing images:", ", ".join(missing))


if __name__ == "__main__":
    main()
