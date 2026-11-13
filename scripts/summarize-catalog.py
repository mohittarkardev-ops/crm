import re
with open(r'lib\vehicle-catalog.ts', encoding='utf-8') as f:
    code = f.read()
matches = re.findall(r'category: "([^"]+)", make: "([^"]+)", model: "([^"]+)"', code)
print(f'Total models: {len(matches)}')
cats = {}
for cat, make, model in matches:
    cats.setdefault(cat, {}).setdefault(make, []).append(model)
for cat, makes in cats.items():
    print(f"\n--- Category {cat}: {len(makes)} brands, {sum(len(m) for m in makes.values())} models ---")
    for make, models in sorted(makes.items()):
        print(f"  {make} ({len(models)} models)")
