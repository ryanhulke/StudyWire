from __future__ import annotations

import hashlib
from datetime import datetime
from pathlib import Path
from typing import List

from sqlmodel import Session, select

from .models import Source, SourceChunk

try:
    import fitz  # PyMuPDF  # type: ignore
except ImportError:
    fitz = None


def compute_file_hash(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def deduce_markdown_title(path: Path) -> str:
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                stripped = line.lstrip()
                if stripped.startswith("#"):
                    title = stripped.lstrip("#").strip()
                    if title:
                        return title
    except Exception:
        pass
    return path.stem


def deduce_pdf_title(path: Path) -> str:
    # Simple: use file name; could extend to read metadata later
    return path.stem


def parse_markdown_to_chunks(path: Path) -> List[dict]:
    """
    Simple markdown parser:
    - Each heading (#, ##, ###, ...) starts a new chunk.
    - Chunk text is all lines until the next heading.
    - If no headings, whole file becomes one chunk.
    """
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    chunks: List[dict] = []
    current_heading = "Document"
    current_lines: List[str] = []

    def flush() -> None:
        if current_lines:
            chunk_text = "\n".join(current_lines).strip()
            if chunk_text:
                chunks.append(
                    {
                        "kind": "markdown_section",
                        "loc": current_heading,
                        "text": chunk_text,
                    }
                )

    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith("#"):
            flush()
            heading_text = stripped.lstrip("#").strip()
            current_heading = heading_text or "Untitled section"
            current_lines = []
        else:
            current_lines.append(line)

    flush()

    if not chunks and text.strip():
        chunks.append(
            {
                "kind": "markdown_document",
                "loc": "whole_document",
                "text": text.strip(),
            }
        )

    return chunks


def parse_pdf_to_chunks(path: Path) -> List[dict]:
    if fitz is None:
        raise RuntimeError(
            "PyMuPDF (fitz) is not installed. Install it with 'pip install pymupdf'."
        )

    doc = fitz.open(path)  # type: ignore[attr-defined]
    chunks: List[dict] = []
    try:
        for page_index in range(len(doc)):
            page = doc.load_page(page_index)
            text = page.get_text().strip()
            if text:
                chunks.append(
                    {
                        "kind": "pdf_page",
                        "loc": f"page={page_index + 1}",
                        "text": text,
                    }
                )
    finally:
        doc.close()
    return chunks


def scan_notes_root(session: Session, notes_root: Path) -> int:
    """
    Scan notes_root for .md and .pdf files, update/create Source and
    SourceChunk entries. Returns number of sources processed (created or updated).
    """
    if not notes_root.exists():
        raise RuntimeError(f"Notes root does not exist: {notes_root}")

    processed = 0

    for path in notes_root.rglob("*"):
        if not path.is_file():
            continue

        suffix = path.suffix.lower()
        if suffix not in {".md", ".pdf"}:
            continue

        rel_path = str(path.relative_to(notes_root))
        file_hash = compute_file_hash(path)

        statement = select(Source).where(Source.path == rel_path)
        src = session.exec(statement).first()

        if src is not None and src.hash == file_hash:
            # No change; skip
            continue

        if src is None:
            # New source
            if suffix == ".md":
                title = deduce_markdown_title(path)
                src_type = "markdown"
            else:
                title = deduce_pdf_title(path)
                src_type = "pdf"

            src = Source(
                path=rel_path,
                title=title,
                type=src_type,
                hash=file_hash,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(src)
            session.commit()
            session.refresh(src)
        else:
            # Existing source updated
            src.hash = file_hash
            src.updated_at = datetime.utcnow()
            if suffix == ".md":
                src.title = deduce_markdown_title(path)
                src.type = "markdown"
            else:
                src.title = deduce_pdf_title(path)
                src.type = "pdf"
            session.add(src)
            session.commit()

            # Remove existing chunks
            existing_chunks = session.exec(
                select(SourceChunk).where(SourceChunk.source_id == src.id)
            ).all()
            for ch in existing_chunks:
                session.delete(ch)
            session.commit()

        # Parse and add new chunks
        if suffix == ".md":
            chunk_dicts = parse_markdown_to_chunks(path)
        else:
            chunk_dicts = parse_pdf_to_chunks(path)

        for cd in chunk_dicts:
            chunk = SourceChunk(
                source_id=src.id,
                kind=cd["kind"],
                loc=cd["loc"],
                text=cd["text"],
            )
            session.add(chunk)

        session.commit()
        processed += 1

    return processed
