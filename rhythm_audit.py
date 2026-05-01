import re
from html.parser import HTMLParser

class SlideExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.slides = []
        self.current_slide = None
        self.in_slide = False
        self.current_tag = None
        self.current_attrs = None
        self.text_buffer = []
        self.tag_stack = []
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'article' and attrs_dict.get('class', '').find('slide') != -1:
            self.in_slide = True
            self.current_slide = {
                'tag': tag,
                'attrs': attrs_dict,
                'elements': [],
                'raw_html': ''
            }
            self.slides.append(self.current_slide)
        elif self.in_slide:
            self.current_tag = tag
            self.current_attrs = attrs_dict
            self.text_buffer = []
            self.tag_stack.append(tag)
            
    def handle_endtag(self, tag):
        if tag == 'article' and self.in_slide:
            self.in_slide = False
            self.current_slide = None
        elif self.in_slide and self.current_tag == tag:
            text = ''.join(self.text_buffer).strip()
            if text:
                self.current_slide['elements'].append({
                    'tag': tag,
                    'text': text,
                    'attrs': self.current_attrs
                })
            if self.tag_stack and self.tag_stack[-1] == tag:
                self.tag_stack.pop()
                
    def handle_data(self, data):
        if self.in_slide:
            self.text_buffer.append(data)
            if self.current_slide:
                self.current_slide['raw_html'] += data

def analyze_slides(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract all article slides using regex for simplicity
    slide_pattern = r'<article[^>]*class="[^"]*slide[^"]*"[^>]*>(.*?)</article>'
    slides = re.findall(slide_pattern, content, re.DOTALL)
    
    issues = []
    slide_data = []
    
    for i, slide_html in enumerate(slides):
        # Extract text elements
        h2_texts = re.findall(r'<h2[^>]*>(.*?)</h2>', slide_html, re.DOTALL)
        p_texts = re.findall(r'<p[^>]*>(.*?)</p>', slide_html, re.DOTALL)
        button_texts = re.findall(r'<button[^>]*>(.*?)</button>', slide_html, re.DOTALL)
        
        # Clean HTML tags from text for analysis
        def clean_text(text):
            return re.sub(r'<[^>]+>', '', text).strip()
        
        h2_clean = [clean_text(t) for t in h2_texts]
        p_clean = [clean_text(t) for t in p_texts]
        button_clean = [clean_text(t) for t in button_texts]
        
        all_text = ' '.join(h2_clean + p_clean + button_clean)
        
        slide_info = {
            'index': i,
            'h2': h2_clean,
            'p': p_clean,
            'buttons': button_clean,
            'all_text': all_text,
            'element_count': len(h2_texts) + len(p_texts) + len(button_texts),
            'ends_with_dash': False,
            'starts_with_ellipsis': False,
            'has_broken_html': False
        }
        
        # Check for trailing em dash
        if all_text.endswith('—') or all_text.endswith('— ') or all_text.endswith('—<') or '—</' in slide_html[-50:]:
            slide_info['ends_with_dash'] = True
            
        # Check for leading ellipsis
        if all_text.startswith('...') or all_text.startswith('..') or '...' in h2_clean[0][:3] if h2_clean else False:
            slide_info['starts_with_ellipsis'] = True
            
        # Check for broken HTML - orphaned text outside tags
        # Look for text patterns that suggest malformed structure
        orphaned = re.findall(r'</h2>\s*([^.]+?)\s*<(?:h2|p|button|div)', slide_html, re.DOTALL)
        if orphaned and any(len(o.strip()) > 10 for o in orphaned):
            slide_info['has_broken_html'] = True
            
        # Count ellipsis and dashes
        ellipsis_count = all_text.count('...')
        dash_count = all_text.count('—')
        
        slide_info['ellipsis_count'] = ellipsis_count
        slide_info['dash_count'] = dash_count
        
        slide_data.append(slide_info)
    
    # Analyze patterns
    for i, slide in enumerate(slide_data):
        # Issue 1: Double pause — previous ends with dash, current starts with ellipsis
        if i > 0 and slide_data[i-1]['ends_with_dash'] and slide['starts_with_ellipsis']:
            issues.append({
                'type': 'double_pause',
                'slide': i,
                'prev_slide': i-1,
                'severity': 'high',
                'message': f'Slide {i} starts with "..." but slide {i-1} ends with "—"'
            })
        
        # Issue 2: Empty or nearly empty slides
        if slide['element_count'] <= 1 and len(slide['all_text']) < 20:
            issues.append({
                'type': 'empty_slide',
                'slide': i,
                'severity': 'medium',
                'message': f'Slide {i} is nearly empty (only {slide["element_count"]} elements)'
            })
            
        # Issue 3: Overcrowded slides
        if slide['element_count'] >= 5:
            issues.append({
                'type': 'crowded_slide',
                'slide': i,
                'severity': 'low',
                'message': f'Slide {i} has {slide["element_count"]} elements — consider splitting'
            })
            
        # Issue 4: Multiple ellipsis in one slide (dot fatigue)
        if slide['ellipsis_count'] >= 3:
            issues.append({
                'type': 'dot_fatigue',
                'slide': i,
                'severity': 'low',
                'message': f'Slide {i} has {slide["ellipsis_count"]} "..." — consider varying punctuation'
            })
            
        # Issue 5: Mixed pause styles in same element
        if slide['ellipsis_count'] > 0 and slide['dash_count'] > 0:
            # Check if they're in the same text element
            combined = ' '.join(slide['h2'] + slide['p'])
            if '...' in combined and '—' in combined:
                issues.append({
                    'type': 'mixed_pauses',
                    'slide': i,
                    'severity': 'medium',
                    'message': f'Slide {i} mixes "..." and "—" — pick one style per beat'
                })
                
        # Issue 6: Broken HTML
        if slide['has_broken_html']:
            issues.append({
                'type': 'broken_html',
                'slide': i,
                'severity': 'high',
                'message': f'Slide {i} may have orphaned text outside proper tags'
            })
    
    return issues, slide_data

if __name__ == '__main__':
    filepath = 'index.html'
    issues, slides = analyze_slides(filepath)
    
    # Write report
    with open('rhythm_report.txt', 'w', encoding='utf-8') as f:
        f.write('=== RHYTHM AUDIT REPORT ===\n\n')
        f.write(f'Total slides analyzed: {len(slides)}\n')
        f.write(f'Issues found: {len(issues)}\n\n')
        
        if not issues:
            f.write('No issues found! Narrative rhythm looks clean.\n')
        else:
            # Group by severity
            high = [i for i in issues if i['severity'] == 'high']
            medium = [i for i in issues if i['severity'] == 'medium']
            low = [i for i in issues if i['severity'] == 'low']
            
            if high:
                f.write('--- HIGH PRIORITY ---\n')
                for issue in high:
                    f.write(f'Slide {issue["slide"]}: {issue["message"]}\n')
                    # Show context
                    s = slides[issue['slide']]
                    f.write(f'  Content: {s["all_text"][:80]}...\n\n')
                    
            if medium:
                f.write('\n--- MEDIUM PRIORITY ---\n')
                for issue in medium:
                    f.write(f'Slide {issue["slide"]}: {issue["message"]}\n')
                    s = slides[issue['slide']]
                    f.write(f'  Content: {s["all_text"][:80]}...\n\n')
                    
            if low:
                f.write('\n--- LOW PRIORITY ---\n')
                for issue in low:
                    f.write(f'Slide {issue["slide"]}: {issue["message"]}\n')
    
    print(f'Audit complete. {len(issues)} issues found.')
    print(f'Report written to rhythm_report.txt')
