import os, re

base = '/sessions/exciting-sleepy-ritchie/mnt/workspace/zoomy-services'

# ── 1. FIX NAV — remove duplicate Get Started from ul ────────
# New nav: no Get Started inside ul; Contact link added instead
CORRECT_NAV = '''  <ul class="nav-links" id="navLinks">
    <li><a href="index.html">Home</a></li>
    <li><a href="services.html">Services</a></li>
    <li><a href="portfolio.html">Work</a></li>
    <li><a href="about.html">About</a></li>
    <li><a href="contact.html">Contact</a></li>
  </ul>'''

for fname in sorted(os.listdir(base)):
    if not fname.endswith('.html'): continue
    path = os.path.join(base, fname)
    with open(path) as f:
        content = f.read()
    original = content
    content = re.sub(
        r'<ul class="nav-links" id="navLinks">.*?</ul>',
        CORRECT_NAV,
        content,
        flags=re.DOTALL
    )
    if content != original:
        with open(path, 'w') as f:
            f.write(content)
        print(f'Nav fixed: {fname}')

print('Nav duplicates removed.\n')
