import os
from jinja2 import Environment, FileSystemLoader, select_autoescape
from utils.common import ensure_dir, logger

def render_html(template_dir: str, context: dict, out_html_path: str):
    env = Environment(loader=FileSystemLoader(template_dir), autoescape=select_autoescape())
    tpl = env.get_template("advisory_4.html")
    html = tpl.render(**context)
    ensure_dir(os.path.dirname(out_html_path))
    with open(out_html_path, "w", encoding="utf-8") as f:
        f.write(html)
    return out_html_path

def html_to_pdf(html_path: str, pdf_path: str):
    from weasyprint import HTML
    HTML(filename=html_path).write_pdf(pdf_path)
    return pdf_path
