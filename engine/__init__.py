"""A reusable engine for dense academic visual notebooks.

Content in, laid-out notebook pages out.  The visual language (warm graph
paper, translucent highlighter cards, handwritten headings, hand-drawn
diagrams) is fixed by the theme; the information architecture adapts to
whatever subject the content document describes.
"""
from .theme import Theme, DEFAULT           # noqa: F401
from .render import Notebook, rasterize     # noqa: F401
from .audit import audit_pdf, report        # noqa: F401

__all__ = ["Theme", "DEFAULT", "Notebook", "rasterize", "audit_pdf", "report"]
__version__ = "1.0.0"
