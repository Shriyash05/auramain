import urllib.request
import urllib.parse
import json
import re

test_urls = [
    "https://www.myntra.com/shirts/roadster/roadster-men-navy-blue-sustainable-casual-shirt/13737276/buy",
    "https://www.myntra.com/13737276",
    "https://www.myntra.com/tshirts/hrx-by-hrithik-roshan/hrx-by-hrithik-roshan-men-yellow-printed-round-neck-t-shirt/1700944/buy"
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
}

import ssl

ctx = ssl._create_unverified_context()

for url in test_urls:
    print(f"\n--- Testing URL: {url} ---")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            status = resp.status
            content_type = resp.headers.get('Content-Type', '')
            html = resp.read().decode('utf-8', errors='ignore')
            print(f"Status: {status}, Content-Type: {content_type}, Length: {len(html)}")


            # Check for OpenGraph or JSON-LD
            og_images = re.findall(r'<meta property="og:image" content="([^"]+)"', html)
            og_titles = re.findall(r'<meta property="og:title" content="([^"]+)"', html)
            json_ld_matches = re.findall(r'<script type="application/ld\+json">([^<]+)</script>', html)

            print(f"OG Image: {og_images[:1]}")
            print(f"OG Title: {og_titles[:1]}")
            print(f"JSON-LD matches: {len(json_ld_matches)}")
            for jm in json_ld_matches:
                try:
                    pdata = json.loads(jm)
                    if isinstance(pdata, dict) and pdata.get('@type') == 'Product':
                        print("  [Product JSON-LD]")
                        print(f"    Name: {pdata.get('name')}")
                        print(f"    Brand: {pdata.get('brand')}")
                        print(f"    Image: {pdata.get('image')}")
                        offers = pdata.get('offers')
                        if isinstance(offers, dict):
                            print(f"    Price: {offers.get('price')} {offers.get('priceCurrency')}")
                except Exception as ex:
                    pass

    except Exception as e:
        print(f"Fetch failed: {e}")
