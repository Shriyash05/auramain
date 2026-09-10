import struct
import zlib
import zstandard as zstd
import json

def parse_kiwi_schema(schema_bytes):
    pos = 0
    def read_varuint():
        nonlocal pos
        res = 0
        shift = 0
        while True:
            b = schema_bytes[pos]
            pos += 1
            res |= (b & 0x7f) << shift
            if (b & 0x80) == 0:
                break
            shift += 7
        return res

    def read_varint():
        v = read_varuint()
        return (v >> 1) ^ (-(v & 1))

    def read_string():
        nonlocal pos
        start = pos
        while schema_bytes[pos] != 0:
            pos += 1
        s = schema_bytes[start:pos].decode('utf-8', errors='ignore')
        pos += 1
        return s

    num_types = read_varuint()
    types = []
    type_map = {}
    
    for i in range(num_types):
        name = read_string()
        kind = schema_bytes[pos]
        pos += 1
        num_fields = read_varuint()
        fields = []
        if kind == 0: # ENUM
            for _ in range(num_fields):
                fname = read_string()
                fval = read_varuint()
                fields.append({'name': fname, 'value': fval})
        elif kind == 1: # STRUCT
            for _ in range(num_fields):
                fname = read_string()
                ftype = read_varint()
                is_arr = (schema_bytes[pos] == 1)
                pos += 1
                fields.append({'name': fname, 'type': ftype, 'is_array': is_arr})
        elif kind == 2: # MESSAGE
            for _ in range(num_fields):
                fname = read_string()
                ftype = read_varint()
                is_arr = (schema_bytes[pos] == 1)
                pos += 1
                fval = read_varuint()
                fields.append({'name': fname, 'type': ftype, 'is_array': is_arr, 'value': fval})

        tinfo = {'name': name, 'kind': kind, 'fields': fields, 'index': i}
        types.append(tinfo)
        type_map[name] = tinfo

    print(f"Parsed schema: {len(types)} types, remaining unread schema bytes: {len(schema_bytes) - pos}")
    return types, type_map


def main():
    with open('assets/figma_images/canvas.fig', 'rb') as f:
        data = f.read()

    schema_len = struct.unpack('<I', data[12:16])[0]
    schema_data = data[16:16+schema_len]
    decompressed_schema = zlib.decompress(schema_data, -15)
    types, type_map = parse_kiwi_schema(decompressed_schema)
    print(f"Loaded {len(types)} schema types.")

    msg_len = struct.unpack('<I', data[16+schema_len:20+schema_len])[0]
    msg_data = data[20+schema_len:20+schema_len+msg_len]
    dctx = zstd.ZstdDecompressor()
    msg_raw = dctx.decompress(msg_data, max_output_size=50*1024*1024)
    print(f"Message length: {len(msg_raw)}")

    class KiwiReader:
        def __init__(self, data, types):
            self.data = data
            self.pos = 0
            self.types = types

        def read_byte(self):
            b = self.data[self.pos]
            self.pos += 1
            return b

        def read_varuint(self):
            res = 0
            shift = 0
            while True:
                b = self.data[self.pos]
                self.pos += 1
                res |= (b & 0x7f) << shift
                if (b & 0x80) == 0:
                    break
                shift += 7
            return res

        def read_varint(self):
            v = self.read_varuint()
            return (v >> 1) ^ (-(v & 1))

        def read_float(self):
            f = struct.unpack('<f', self.data[self.pos:self.pos+4])[0]
            self.pos += 4
            return f

        def read_string(self):
            start = self.pos
            while self.data[self.pos] != 0:
                self.pos += 1
            s = self.data[start:self.pos].decode('utf-8', errors='ignore')
            self.pos += 1
            return s

        def read_value(self, type_id):
            # Primitives: -1=bool, -2=byte, -3=int, -4=uint, -5=float, -6=string
            if type_id == -1:
                return self.read_byte() != 0
            elif type_id == -2:
                return self.read_byte()
            elif type_id == -3:
                return self.read_varint()
            elif type_id == -4:
                return self.read_varuint()
            elif type_id == -5:
                return self.read_float()
            elif type_id == -6:
                return self.read_string()
            else:
                ut = self.types[type_id]
                if ut['kind'] == 0: # enum
                    return self.read_varuint()
                elif ut['kind'] == 1: # struct
                    obj = {}
                    for f in ut['fields']:
                        if f['is_array']:
                            cnt = self.read_varuint()
                            obj[f['name']] = [self.read_value(f['type']) for _ in range(cnt)]
                        else:
                            obj[f['name']] = self.read_value(f['type'])
                    return obj
                elif ut['kind'] == 2: # message
                    obj = {}
                    field_by_val = {f['value']: f for f in ut['fields']}
                    while True:
                        tag = self.read_varuint()
                        if tag == 0:
                            break
                        f = field_by_val.get(tag)
                        if f is None:
                            raise ValueError(f"Unknown field tag {tag} in {ut['name']}")
                        if f['is_array']:
                            cnt = self.read_varuint()
                            obj[f['name']] = [self.read_value(f['type']) for _ in range(cnt)]
                        else:
                            obj[f['name']] = self.read_value(f['type'])
                    return obj

    reader = KiwiReader(msg_raw, types)
    msg_type_idx = type_map['Message']['index']
    print(f"Decoding Message (type index {msg_type_idx})...")
    msg_obj = reader.read_value(msg_type_idx)
    print("Decoded Message successfully!")

    node_changes = msg_obj.get('nodeChanges', [])
    print(f"Total nodeChanges: {len(node_changes)}")

    # Let's collect screens and frames
    screens = {}
    for nc in node_changes:
        name = nc.get('name')
        if name:
            screens[name] = nc

    print(f"Total named nodes: {len(screens)}")
    with open('training/scripts/figma_nodes_summary.json', 'w') as f:
        json.dump({
            'named_nodes': list(screens.keys()),
            'sample_node_changes': [
                {k: v for k, v in nc.items() if k in ['name', 'guid', 'type', 'fontSize', 'size', 'cornerRadius']}
                for nc in node_changes if nc.get('name')
            ]
        }, f, indent=2)
    print("Saved figma_nodes_summary.json")





if __name__ == '__main__':
    main()
