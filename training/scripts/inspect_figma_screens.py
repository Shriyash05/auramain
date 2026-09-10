import struct
import zstandard as zstd
import zlib
import re
import json

def inspect_figma():
    with open('assets/figma_images/canvas.fig', 'rb') as f:
        data = f.read()

    schema_len = struct.unpack('<I', data[12:16])[0]
    msg_len = struct.unpack('<I', data[16+schema_len:20+schema_len])[0]
    msg_data = data[20+schema_len:20+schema_len+msg_len]
    dctx = zstd.ZstdDecompressor()
    msg_raw = dctx.decompress(msg_data, max_output_size=50*1024*1024)

    # Let's inspect screens and surrounding text in chunks
    screen_names = [
        "04 - Home",
        "15 Closet",
        "16 Closet Category",
        "17 Garment Detail",
        "18 Add Clothing",
        "28 Outfit Results",
        "29 - Mix & Match Outfit Builder",
        "30 Outfit Detail",
        "31 Save Outfit",
        "32 Mirror",
        "35 Try-On Result",
        "36 Compare",
        "48 Product Discovery",
        "55 Empty Closet"
    ]

    print("=== FIGMA SCREEN INSPECTION ===")
    for sn in screen_names:
        pos = msg_raw.find(sn.encode('utf-8'))
        if pos != -1:
            print(f"\n--- SCREEN: {sn} (offset {pos}) ---")
            # Grab window around this screen
            window = msg_raw[pos:pos+4000]
            # Extract ascii text sequences of length >= 3
            matches = re.findall(b'[\x20-\x7e]{3,}', window)
            texts = []
            for m in matches:
                t = m.decode('ascii', errors='ignore').strip()
                # filter out pure hashes or numbers
                if len(t) >= 3 and not re.match(r'^[0-9a-f]{20,}$', t) and not re.match(r'^[0-9]+$', t):
                    texts.append(t)
            print("Extracted strings in screen context:")
            for t in texts[:30]:
                print(f"  • {t}")

if __name__ == '__main__':
    inspect_figma()
