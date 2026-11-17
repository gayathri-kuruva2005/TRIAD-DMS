
import os
import io

import pymupdf
import pytesseract

from PIL import Image
from flask import current_app


def configure_tesseract():
    """
    Configure pytesseract to use the installed
    Tesseract OCR executable.
    """
    tesseract_path = current_app.config.get("TESSERACT_CMD")

    if tesseract_path and os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
    else:
        raise FileNotFoundError(
            "Tesseract OCR executable was not found. "
            "Check TESSERACT_CMD in config.py."
        )


def extract_text_from_pdf(file_bytes):
    """
    First extract embedded text from a PDF.
    If a page has no embedded text, use OCR on that page.
    """
    configure_tesseract()

    extracted_pages = []

    pdf_document = pymupdf.open(
        stream=file_bytes,
        filetype="pdf"
    )

    try:
        for page in pdf_document:
            page_text = page.get_text("text").strip()

            if not page_text:
                pixmap = page.get_pixmap(
                    matrix=pymupdf.Matrix(2, 2),
                    alpha=False
                )

                image_bytes = pixmap.tobytes("png")
                image = Image.open(io.BytesIO(image_bytes))

                page_text = pytesseract.image_to_string(
                    image,
                    lang="eng"
                ).strip()

            if page_text:
                extracted_pages.append(page_text)

    finally:
        pdf_document.close()

    return "\n".join(extracted_pages)


def extract_text_from_image(file_bytes):
    """
    Extract text from PNG and JPEG images using OCR.
    """
    configure_tesseract()

    image = Image.open(io.BytesIO(file_bytes))

    return pytesseract.image_to_string(
        image,
        lang="eng"
    ).strip()


def extract_text(file_bytes, filename):
    """
    Select the correct extraction method based on
    the uploaded file extension.
    """
    extension = os.path.splitext(filename)[1].lower()

    if extension == ".pdf":
        return extract_text_from_pdf(file_bytes)

    if extension in [".png", ".jpg", ".jpeg"]:
        return extract_text_from_image(file_bytes)

    raise ValueError("Unsupported file format for OCR.")
