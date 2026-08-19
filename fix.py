import os

for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.ts') or f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # The files literally contain backslash followed by backtick
            # e.g. \`
            content = content.replace('\\`', '`')
            content = content.replace('\\$', '$')
            
            with open(path, 'w', encoding='utf-8') as file:
                file.write(content)
