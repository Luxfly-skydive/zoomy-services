#!/usr/bin/env python3
"""
translate_site.py — Zoomy.services
Generates pre-translated HTML pages in /fr/ and /es/ subdirectories.
Uses Google Translate (deep-translator) with a local cache.
Run: python3 translate_site.py
"""

import os, re, time, json, sys
sys.path.insert(0, '/sessions/exciting-sleepy-ritchie/pkgs')

from bs4 import BeautifulSoup, NavigableString, Comment
from deep_translator import GoogleTranslator

ROOT       = os.path.dirname(os.path.abspath(__file__))
LANGS      = ['fr', 'es']
CACHE_FILE = os.path.join(ROOT, 'translation_cache.json')

SKIP_TAGS = {'script','style','meta','link','noscript','code','pre','textarea'}
TRANSLATE_ATTRS = ['placeholder','alt','title','aria-label']

NEVER_TRANSLATE = {
    'Zoomy','Zoomy.services','zoomy.services','hello@zoomy.services',
    'EN','FR','ES','EN/FR/ES',
    'Meta','Google','TikTok','LinkedIn','YouTube',
    'Stripe','Supabase','ElevenLabs','WordPress','Shopify',
    'CRM','SEO','UTM','ROAS','CPL','CPC','CPM',
    'MFA','ACH','GA4','GTM','API','FAQ',
    'HTML','CSS','JavaScript','JS','PHP',
    'GDPR','SSL','HTTPS',
}

ASSET_ATTRS = {
    'link':   ['href'],
    'script': ['src'],
    'img':    ['src','data-src'],
    'video':  ['src','poster'],
    'source': ['src','srcset'],
}
HTML_EXTS = {'.html','.htm'}

# ── Cache ──────────────────────────────────────────────────────────────────
def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE,'r',encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(cache):
    with open(CACHE_FILE,'w',encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

# ── String filtering ───────────────────────────────────────────────────────
def should_translate(text):
    text = text.strip()
    if not text or len(text) < 2:               return False
    if not re.search(r'[a-zA-Z]', text):        return False
    if re.match(r'^[\w.\-]+@[\w.\-]+\.\w+$', text): return False
    if text.startswith('http') or text.startswith('www.'): return False
    if re.match(r'^[\+\d\s()\-\.]{7,}$', text): return False
    if text in NEVER_TRANSLATE:                  return False
    if len(text) <= 2:                           return False
    return True

# ── Collect all unique strings ─────────────────────────────────────────────
def collect_strings(html_files):
    strings = set()
    for path in html_files:
        with open(path,'r',encoding='utf-8',errors='ignore') as f:
            content = f.read()
        soup = BeautifulSoup(content,'html.parser')
        for el in soup.find_all(string=True):
            if isinstance(el, Comment): continue
            if el.parent and el.parent.name in SKIP_TAGS: continue
            t = el.strip()
            if should_translate(t): strings.add(t)
        for tag in soup.find_all(True):
            for attr in TRANSLATE_ATTRS:
                if tag.has_attr(attr):
                    v = tag[attr].strip()
                    if should_translate(v): strings.add(v)
    return list(strings)

# ── Translate strings via Google (batch, cached) ───────────────────────────
def translate_strings(strings, lang, cache):
    lc = cache.get(lang, {})
    todo = [s for s in strings if s not in lc]
    if not todo:
        print(f'  {lang}: all {len(strings)} strings from cache')
        return lc

    print(f'  {lang}: translating {len(todo)} new strings ({len(strings)-len(todo)} cached)...')
    tr = GoogleTranslator(source='en', target=lang)
    BATCH, MAXC = 40, 4500
    i = done = 0
    while i < len(todo):
        batch, chars = [], 0
        while i < len(todo) and len(batch) < BATCH:
            s = todo[i]
            if chars + len(s) > MAXC and batch: break
            batch.append(s); chars += len(s) + 15; i += 1
        if not batch: i += 1; continue
        try:
            if len(batch) == 1:
                lc[batch[0]] = tr.translate(batch[0]); done += 1
            else:
                SEP = ' ||| '
                res = tr.translate(SEP.join(batch))
                parts = [p.strip().strip('|').strip() for p in res.split('|||')]
                if len(parts) == len(batch):
                    for o,t in zip(batch,parts): lc[o]=t; done += len(batch)
                else:
                    for s in batch:
                        try: lc[s] = tr.translate(s); done += 1; time.sleep(0.05)
                        except: lc[s] = s
            time.sleep(0.15)
        except Exception as e:
            print(f'    batch error: {e}')
            for s in batch:
                try: lc[s] = tr.translate(s); done += 1; time.sleep(0.1)
                except: lc[s] = s
            time.sleep(0.3)
        if done % 100 == 0 and done > 0:
            print(f'    {done}/{len(todo)}...')
            save_cache({**cache, lang: lc})
    print(f'  {lang}: done ({done} translated)')
    cache[lang] = lc
    return lc

# ── Fix asset paths (add ../ for subdirectory pages) ──────────────────────
def fix_asset_paths(soup):
    def needs(p):
        if not p: return False
        if p.startswith(('http','//','#','data:','../','/',' ','mailto:','tel:','javascript')): return False
        return True

    for tag_name, attrs in ASSET_ATTRS.items():
        for tag in soup.find_all(tag_name):
            for attr in attrs:
                v = tag.get(attr,'')
                if needs(v): tag[attr] = '../'+v

    for a in soup.find_all('a', href=True):
        href = a['href']
        if not needs(href): continue
        path_only = href.split('?')[0].split('#')[0]
        _, ext = os.path.splitext(path_only)
        if ext.lower() in HTML_EXTS or ext == '': continue
        a['href'] = '../'+href

    for tag in soup.find_all(style=True):
        def rep(m):
            url = m.group(1).strip('"\'')
            if needs(url): url = '../'+url
            return f"url('{url}')"
        tag['style'] = re.sub(r"url\(['\"]?([^)'\"\s]+)['\"]?\)", rep, tag['style'])

# ── Update lang switcher buttons → links to subdirectory pages ────────────
def update_switcher_subdir(soup, filename, lang):
    """For pages inside /fr/ or /es/ — convert all .lang-btn to correct links."""
    for el in soup.find_all(['button', 'a'], class_='lang-btn'):
        # Determine which language this element represents
        btn_lang = el.get('data-lang', '')
        if not btn_lang:
            # Infer from text (EN / FR / ES)
            txt = el.get_text(strip=True).lower()
            if txt in ('en', 'fr', 'es'):
                btn_lang = txt
            else:
                continue

        if btn_lang == 'en':
            href = f'../{filename}'
        elif btn_lang == lang:
            # Current lang — render as a styled span (no link)
            span = soup.new_tag('span')
            span['class'] = 'lang-btn lang-active'
            span['style'] = 'opacity:1;font-weight:700;cursor:default;'
            span.string = btn_lang.upper()
            el.replace_with(span)
            continue
        else:
            href = f'../{btn_lang}/{filename}'

        a = soup.new_tag('a', href=href)
        a['class'] = 'lang-btn'
        a.string = btn_lang.upper()
        el.replace_with(a)

def update_switcher_root(soup, filename):
    """For root EN pages — ensure FR/ES link to subdirectories. Idempotent."""
    for el in soup.find_all(['button', 'a', 'span'], class_='lang-btn'):
        btn_lang = el.get('data-lang', '')
        if not btn_lang:
            txt = el.get_text(strip=True).lower()
            if txt in ('en', 'fr', 'es'):
                btn_lang = txt
            else:
                continue
        if btn_lang == 'en':
            continue  # keep as-is (button or whatever)
        href = f'{btn_lang}/{filename}'
        a = soup.new_tag('a', href=href)
        a['class'] = 'lang-btn'
        a.string = btn_lang.upper()
        el.replace_with(a)

# ── Translate one HTML file ────────────────────────────────────────────────
def translate_file(html_file, lang, lc, out_dir):
    filename = os.path.basename(html_file)
    with open(html_file,'r',encoding='utf-8',errors='ignore') as f:
        content = f.read()
    soup = BeautifulSoup(content,'html.parser')

    # Set lang attribute
    ht = soup.find('html')
    if ht: ht['lang'] = lang

    # Translate text nodes
    for el in soup.find_all(string=True):
        if isinstance(el, Comment): continue
        if el.parent and el.parent.name in SKIP_TAGS: continue
        text = el.strip()
        if text and text in lc:
            raw = str(el)
            pre  = raw[:len(raw)-len(raw.lstrip())]
            suf  = raw[len(raw.rstrip()):]
            el.replace_with(pre + lc[text] + suf)

    # Translate attributes
    for tag in soup.find_all(True):
        for attr in TRANSLATE_ATTRS:
            if tag.has_attr(attr):
                v = tag[attr].strip()
                if v in lc: tag[attr] = lc[v]

    # Fix asset paths
    fix_asset_paths(soup)

    # Update language switcher
    update_switcher_subdir(soup, filename, lang)

    # Restore brand name in nav-logo (never translate "Zoomy.services")
    for logo in soup.find_all('a', class_='nav-logo'):
        for child in logo.children:
            if isinstance(child, NavigableString):
                text = str(child).strip()
                # Restore if it looks like a translation of "services"
                if text and text not in ('Zoomy', ''):
                    child.replace_with(NavigableString('services'))

    # Inject localStorage lang-setter so chatbot detects correct language
    head = soup.find('head')
    if head:
        lang_script = soup.new_tag('script')
        lang_script.string = f"localStorage.setItem('zmy_lang','{lang}');"
        head.append(lang_script)

    # Remove i18n.js (not needed — page is pre-translated)
    for script in soup.find_all('script', src=True):
        if 'i18n' in script.get('src',''):
            script.decompose()

    # Write
    os.makedirs(out_dir, exist_ok=True)
    out = '<!DOCTYPE html>\n' + re.sub(r'^(?:html\n)+', '', str(soup), flags=re.IGNORECASE)
    with open(os.path.join(out_dir, filename),'w',encoding='utf-8') as f:
        f.write(out)

# ── Update root EN pages (switcher links, keep i18n.js for now) ───────────
def update_root_pages(html_files):
    for path in html_files:
        filename = os.path.basename(path)
        with open(path,'r',encoding='utf-8',errors='ignore') as f:
            content = f.read()
        soup = BeautifulSoup(content,'html.parser')
        update_switcher_root(soup, filename)
        out = '<!DOCTYPE html>\n' + re.sub(r'^(?:html\n)+', '', str(soup), flags=re.IGNORECASE)
        with open(path,'w',encoding='utf-8') as f:
            f.write(out)

# ── Main ───────────────────────────────────────────────────────────────────
def main():
    print('=== Zoomy.services Translator ===')
    html_files = sorted([
        os.path.join(ROOT,f) for f in os.listdir(ROOT)
        if f.endswith('.html') and os.path.isfile(os.path.join(ROOT,f))
    ])
    print(f'Found {len(html_files)} HTML files')

    cache = load_cache()

    print('\nCollecting strings...')
    strings = collect_strings(html_files)
    print(f'{len(strings)} unique translatable strings')

    print('\nTranslating...')
    for lang in LANGS:
        lc = translate_strings(strings, lang, cache)
        save_cache(cache)

    print('\nGenerating translated pages...')
    for lang in LANGS:
        lc = cache.get(lang, {})
        out_dir = os.path.join(ROOT, lang)
        for f in html_files:
            translate_file(f, lang, lc, out_dir)
        print(f'  {lang}: {len(html_files)} pages → /{lang}/')

    print('\nUpdating root EN switcher buttons...')
    update_root_pages(html_files)

    save_cache(cache)
    print('\nAll done!')
    for lang in LANGS:
        print(f'  {lang}: {len(cache.get(lang,{}))} cached translations')

    # ── Auto-deploy zoomy-ai worker so chatbot+phone agent prices stay in sync ──
    import subprocess, sys
    worker_dir = os.path.join(os.path.dirname(ROOT), 'zoomy-ai-worker')
    if os.path.exists(worker_dir):
        print('\nDeploying zoomy-ai worker (keeps chatbot & phone agent prices in sync)...')
        result = subprocess.run(
            ['npx', 'wrangler', 'deploy'],
            cwd=worker_dir, capture_output=True, text=True
        )
        if result.returncode == 0:
            print('  ✅ zoomy-ai worker deployed — chatbot & phone agent prices updated')
        else:
            print('  ⚠️  Worker deploy failed (prices may be stale) — run manually:')
            print(f'     cd {worker_dir} && npx wrangler deploy')

if __name__ == '__main__':
    main()
