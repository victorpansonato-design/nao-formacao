"""Regenera src/data/catalog.ts a partir do catálogo público de graduação do UniAnchieta.

Uso (na raiz do repositório):
    python scripts/fetch_catalog.py                 # baixa tudo para um diretório temporário e regenera
    python scripts/fetch_catalog.py --cache DIR     # reaproveita o que já estiver baixado em DIR

O que é lido (só páginas públicas, sem login, uma requisição por vez com pausa):
  1. A listagem https://anchieta.br/graduacao/ (carregada por rolagem; 6 cursos por página) dá o nome
     oficial de cada curso, o diploma e o selo "Novo".
  2. A página de cada curso (lista do sitemap https://anchieta.br/graduacao-sitemap.xml) dá os formatos
     (Presencial, Presencial Integral, Presencial Intensivo, Semipresencial, EAD, EAD Live) e o turno.

O que NÃO vem do site: vagas, mensalidades, matrículas e alunos. Esses continuam sintéticos (src/data/seed.ts).
Regras de leitura e limites: docs/15-catalogo-real.md. O site muda sem aviso: confira o resumo impresso
(quantidade de cursos, turmas e selos) antes de versionar o arquivo gerado.
"""

import argparse
import glob
import html
import json
import os
import re
import sys
import tempfile
import time
import urllib.parse
import urllib.request

BASE = 'https://anchieta.br/graduacao/'
SITEMAP = 'https://anchieta.br/graduacao-sitemap.xml'
AGENT = {'User-Agent': 'Mozilla/5.0'}
FORMATS = ['Presencial Integral', 'Presencial Intensivo', 'Presencial', 'Semipresencial', 'EAD Live', 'EAD']
DIPLOMAS = ['Bacharelado', 'Tecnólogo', 'Licenciatura']
MODALITY = {
    'Presencial': 'presencial',
    'Presencial Integral': 'presencial_integral',
    'Presencial Intensivo': 'presencial_intensivo',
    'Semipresencial': 'semipresencial',
    'EAD': 'ead',
    'EAD Live': 'ead_live',
}


def get(url, data=None):
    headers = dict(AGENT)
    if data is not None:
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
    request = urllib.request.Request(url, data=data, headers=headers)
    return urllib.request.urlopen(request, timeout=60).read()


def text_lines(markup):
    body = re.sub(r'<(script|style)\b.*?</\1>', '', markup, flags=re.S)
    text = html.unescape(re.sub(r'<[^>]+>', '\n', body))
    text = re.sub(r'[ \t\r\xa0]+', ' ', text)
    return [line.strip() for line in text.split('\n') if line.strip()]


def flatten(prefix, value, out):
    """Codifica dicionários/listas no formato de formulário aninhado que o WordPress espera."""
    if isinstance(value, dict):
        for key, item in value.items():
            flatten(f'{prefix}[{key}]', item, out)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            flatten(f'{prefix}[{index}]', item, out)
    elif isinstance(value, bool):
        out.append((prefix, 'true' if value else 'false'))
    else:
        out.append((prefix, '' if value is None else str(value)))


def download(cache):
    os.makedirs(os.path.join(cache, 'pages'), exist_ok=True)
    index_path = os.path.join(cache, 'grad.html')
    if not os.path.exists(index_path):
        open(index_path, 'wb').write(get(BASE))
    page = open(index_path, encoding='utf-8', errors='replace').read()
    lazy = re.search(r'data-lazy-load="([^"]+)"', page)
    if not lazy:
        sys.exit('A listagem mudou: não encontrei data-lazy-load. Revise scripts/fetch_catalog.py.')
    settings = json.loads(html.unescape(lazy.group(1)))
    widget = re.search(r'elementor-element-([0-9a-f]+)[^>]*>\s*<div class="jet-listing-grid', page)
    page_settings = [
        ('page_settings[post_id]', str(settings['post_id'])),
        ('page_settings[queried_id]', settings['queried_id']),
        ('page_settings[element_id]', widget.group(1) if widget else '5c19568'),
    ]
    common = [('action', 'jet_engine_ajax'), ('listing_type', 'elementor'), ('isEditMode', 'false')]

    first = os.path.join(cache, 'list_01.json')
    if not os.path.exists(first):
        fields = common + [('handler', 'get_listing')] + page_settings + [('page_settings[page]', '1')]
        open(first, 'wb').write(get(BASE + '?nocache=1', urllib.parse.urlencode(fields).encode()))
    listing = json.load(open(first, encoding='utf-8'))['data']['html']
    nav = json.loads(html.unescape(re.search(r'data-nav="([^"]+)"', listing).group(1)))
    props = re.search(r'"found_posts":(\d+),"max_num_pages":(\d+)', page)
    pages = int(props.group(2)) if props else 14
    for number in range(2, pages + 1):
        path = os.path.join(cache, f'list_{number:02d}.json')
        if os.path.exists(path):
            continue
        fields = common + [('handler', 'listing_load_more')]
        flatten('query', nav['query'], fields)
        flatten('widget_settings', nav['widget_settings'], fields)
        fields += page_settings + [('page_settings[page]', str(number))]
        open(path, 'wb').write(get(f'{BASE}?nocache={number}', urllib.parse.urlencode(fields).encode()))
        time.sleep(0.5)

    sitemap = get(SITEMAP).decode('utf-8', errors='replace')
    urls = [u for u in re.findall(r'<loc>([^<]+)</loc>', sitemap) if u.rstrip('/') != BASE.rstrip('/') and not re.search(r'\.(jpe?g|png|webp)$', u)]
    for url in urls:
        path = os.path.join(cache, 'pages', os.path.basename(url.rstrip('/')) + '.html')
        if os.path.exists(path) and os.path.getsize(path) > 0:
            continue
        open(path, 'wb').write(get(url))
        time.sleep(0.4)


def read_cards(cache):
    """Cartões da listagem: nome oficial, diploma e selo "Novo"."""
    cards = {}
    for path in sorted(glob.glob(os.path.join(cache, 'list_*.json'))):
        lines = text_lines(json.load(open(path, encoding='utf-8'))['data']['html'])
        for i, line in enumerate(lines):
            if line in DIPLOMAS and i + 2 < len(lines):
                new = lines[i + 1].upper() == 'NOVO'
                cards[lines[i + 2] if new else lines[i + 1]] = {'degree': line, 'isNew': new}
    return cards


def shifts_of(fmt, turno):
    if fmt in ('EAD', 'EAD Live'):
        return ['online']
    if fmt in ('Semipresencial', 'Presencial Intensivo'):
        return ['agenda']
    text = (turno or '').lower()
    result = []
    if 'matutino' in text or 'diurno' in text:
        result.append('diurno')
    if 'noturno' in text:
        result.append('noturno')
    if 'integral' in text and not result:
        result.append('integral')
    return result or ['diurno']


def read_pages(cache):
    """Página de cada curso: blocos "<Formato> / Diploma / Duração / Local / Turno"."""
    courses = []
    for path in sorted(glob.glob(os.path.join(cache, 'pages', '*.html'))):
        markup = open(path, encoding='utf-8', errors='replace').read()
        heading = re.search(r'<h1[^>]*>(.*?)</h1>', markup, re.S)
        name = html.unescape(re.sub(r'<[^>]+>', '', heading.group(1))).strip() if heading else ''
        name = re.sub(r'^Grade de Disciplinas\s*-\s*', '', name).strip()
        lines = text_lines(markup)
        formats = []
        for i, line in enumerate(lines):
            if line in FORMATS and i + 1 < len(lines) and lines[i + 1] == 'Diploma':
                block = lines[i:i + 14]
                if 'O que vou estudar' in block:
                    block = block[:block.index('O que vou estudar')]
                turno = block[block.index('Turno') + 1] if 'Turno' in block and block.index('Turno') + 1 < len(block) else None
                degree = block[2] if len(block) > 2 else ''
                if not any(f['format'] == line for f in formats):
                    formats.append({'format': line, 'degree': degree, 'shifts': shifts_of(line, turno)})
        courses.append({'slug': os.path.basename(path)[:-5], 'name': name, 'formats': formats})
    return courses


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', help='diretório com downloads anteriores (grad.html, list_NN.json, pages/)')
    parser.add_argument('--out', default=os.path.join('src', 'data', 'catalog.ts'))
    args = parser.parse_args()
    cache = args.cache or tempfile.mkdtemp(prefix='continua-catalogo-')
    download(cache)
    cards = read_cards(cache)
    pages = read_pages(cache)

    def card_for(name):
        if name in cards:
            return name
        # A página pode trazer um nome comercial ("Nutrição 360º"); o cartão da listagem é o nome oficial.
        return next((card for card in cards if name.startswith(card + ' ')), None)

    problems = []
    rows = []
    for course in pages:
        official = card_for(course['name'])
        if not official:
            problems.append(f'sem cartão na listagem: {course["name"]} ({course["slug"]})')
            continue
        if not course['formats']:
            problems.append(f'sem formato na página: {official}')
            continue
        rows.append({'name': official, 'slug': course['slug'], 'degree': cards[official]['degree'], 'isNew': cards[official]['isNew'], 'formats': course['formats']})
    for name in cards:
        if not any(row['name'] == name for row in rows):
            problems.append(f'cartão sem página de curso: {name}')
    rows.sort(key=lambda row: row['name'].lower())

    today = time.strftime('%d/%m/%Y')
    out = [
        "import type { Modality, Shift } from '@/domain/types'",
        '',
        '/**',
        ' * Catálogo real de graduação do UniAnchieta: cursos, formatos e turnos públicos.',
        f' * Fonte: {BASE} (listagem oficial e a página de cada curso), coletado em {today}.',
        ' * Só nome, diploma, formato, turno e selo "Novo" vêm do site. Vagas, mensalidades, matrículas e alunos',
        ' * continuam sintéticos (src/data/seed.ts). ARQUIVO GERADO: não editar à mão.',
        ' * Para atualizar: python scripts/fetch_catalog.py (regras e limites em docs/15-catalogo-real.md).',
        ' */',
        'export interface CatalogCourse {',
        '  name: string',
        '  slug: string',
        "  degree: 'Bacharelado' | 'Tecnólogo' | 'Licenciatura'",
        '  /** Selo "Novo" exibido na listagem do site. */',
        '  isNew: boolean',
        '  formats: { modality: Modality; shifts: Shift[] }[]',
        '}',
        '',
        'export const CATALOG_COURSES: CatalogCourse[] = [',
    ]
    for row in rows:
        formats = ', '.join("{ modality: '%s', shifts: [%s] }" % (MODALITY[f['format']], ', '.join("'%s'" % s for s in f['shifts'])) for f in row['formats'])
        name = row['name'].replace("'", "\\'")
        out.append("  { name: '%s', slug: '%s', degree: '%s', isNew: %s, formats: [%s] }," % (name, row['slug'], row['degree'], 'true' if row['isNew'] else 'false', formats))
    out += [']', '']
    open(args.out, 'w', encoding='utf-8', newline='').write('\n'.join(out))

    classes = sum(len(f['shifts']) for row in rows for f in row['formats'])
    print(f'{len(rows)} cursos, {classes} turmas (curso + modalidade + turno), {sum(row["isNew"] for row in rows)} com selo Novo')
    print(f'gerado: {args.out}   cache: {cache}')
    for problem in problems:
        print('ATENÇÃO:', problem)
    if problems:
        sys.exit(1)


if __name__ == '__main__':
    main()
