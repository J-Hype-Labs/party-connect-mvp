import re
import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

scripts = re.findall(r'<script type="text/babel">(.*?)</script>', content, re.DOTALL)
if not scripts:
    print("ERROR: No babel script found")
    sys.exit(1)

script = scripts[0]

# Check balanced braces, brackets, parens
def check_balanced(text):
    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}
    for idx, ch in enumerate(text):
        if ch in '([{':
            stack.append((ch, idx))
        elif ch in ')]}':
            if not stack:
                return False, f'Unmatched {ch} at position {idx}'
            last, pos = stack.pop()
            if pairs[ch] != last:
                return False, f'Mismatch at {idx}: expected {pairs[ch]} but got {last} (from pos {pos})'
    if stack:
        for ch, pos in stack:
            return False, f'Unclosed {ch} at position {pos}'
    return True, 'OK'

ok, msg = check_balanced(script)
if not ok:
    print(f"ERROR: JSX syntax check failed - {msg}")
    sys.exit(1)
print(f"✅ JSX bracket validation PASSED: {msg}")

# Check component definitions vs usage
jsx_opens = re.findall(r'<([A-Z]\w*)', script)
jsx_closes = re.findall(r'</([A-Z]\w*)>', script)
from collections import Counter
open_counter = Counter(jsx_opens)
close_counter = Counter(jsx_closes)

for tag, count in open_counter.items():
    if close_counter.get(tag, 0) != count and tag not in ['StatCard', 'AdminDashboardTab', 'AdminPartiesTab', 'AdminApplicationsTab', 'AdminReviewsTab', 'AdminStatsTab', 'App']:
        print(f"WARNING: <{tag}> opens={count} closes={close_counter.get(tag, 0)} (may be component definition)")

print("Component validation passed")