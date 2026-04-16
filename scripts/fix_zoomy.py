import os, re

base = '/sessions/exciting-sleepy-ritchie/mnt/workspace/zoomy-services'

# 1. Delete pricing.html and landing-pages.html
for f in ['pricing.html', 'landing-pages.html']:
    p = os.path.join(base, f)
    if os.path.exists(p):
        os.remove(p)
        print(f'Deleted: {f}')

# 2. Update all HTML files:
#    - pricing.html links → contact.html
#    - landing-pages.html links → website-design.html
#    - Remove "Pricing" from nav (the <li> item)
#    - Update footer landing pages link

htmls = [f for f in os.listdir(base) if f.endswith('.html')]

for fname in htmls:
    path = os.path.join(base, fname)
    with open(path) as f:
        content = f.read()
    
    original = content
    
    # Replace pricing.html links → contact.html
    content = content.replace('href="pricing.html"', 'href="contact.html"')
    content = content.replace("href='pricing.html'", "href='contact.html'")
    
    # Replace landing-pages.html links → website-design.html
    content = content.replace('href="landing-pages.html"', 'href="website-design.html"')
    content = content.replace("href='landing-pages.html'", "href='website-design.html'")
    
    # Remove the Pricing nav <li> item completely
    content = re.sub(r'\s*<li><a href="contact\.html">Pricing</a></li>', '', content)
    content = re.sub(r'\s*<li><a href="pricing\.html"[^>]*>Pricing</a></li>', '', content)
    
    # Replace "View Pricing" buttons text → "Get a Quote" pointing to contact
    content = content.replace('>View Pricing<', '>Get a Quote<')
    content = content.replace('>View Pricing </a>', '>Get a Quote</a>')
    
    # In footer, update landing pages link
    content = content.replace(
        '<li><a href="website-design.html">Landing Pages</a></li>',
        '<li><a href="website-design.html">Websites &amp; Landing Pages</a></li>'
    )
    
    if content != original:
        with open(path, 'w') as f:
            f.write(content)
        print(f'Updated: {fname}')

print('\nDone. Remaining HTML files:')
for f in sorted(os.listdir(base)):
    if f.endswith('.html'):
        print(f'  {f}')
