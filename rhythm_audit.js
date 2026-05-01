const fs = require('fs');

function analyzeSlides(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    
    // Extract all article slides
    const slideRegex = /<article[^>]*class="[^"]*slide[^"]*"[^>]*>(.*?)<\/article>/gs;
    const slides = [];
    let match;
    
    while ((match = slideRegex.exec(content)) !== null) {
        slides.push(match[1]);
    }
    
    const issues = [];
    const slideData = [];
    
    function cleanText(text) {
        return text.replace(/<[^>]+>/g, '').trim();
    }
    
    for (let i = 0; i < slides.length; i++) {
        const html = slides[i];
        
        // Extract elements
        const h2Texts = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gs)].map(m => cleanText(m[1]));
        const pTexts = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gs)].map(m => cleanText(m[1]));
        const buttonTexts = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/gs)].map(m => cleanText(m[1]));
        
        const allText = [...h2Texts, ...pTexts, ...buttonTexts].join(' ');
        
        const slideInfo = {
            index: i,
            h2: h2Texts,
            p: pTexts,
            buttons: buttonTexts,
            allText: allText,
            elementCount: h2Texts.length + pTexts.length + buttonTexts.length,
            endsWithDash: false,
            startsWithEllipsis: false,
            hasBrokenHtml: false
        };
        
        // Check trailing dash (look at last 50 chars of HTML)
        const lastChunk = html.slice(-100);
        if (lastChunk.includes('—') && !lastChunk.includes('...')) {
            // More precise check: does the visible text end with —?
            const visibleEnd = allText.slice(-5);
            if (visibleEnd.includes('—')) {
                slideInfo.endsWithDash = true;
            }
        }
        
        // Check leading ellipsis
        if (allText.startsWith('...') || allText.startsWith('..')) {
            slideInfo.startsWithEllipsis = true;
        }
        
        // Check for broken HTML - text between closing and opening tags
        const orphaned = html.match(/<\/h2>\s*([^.]{3,50}?)\s*<(h2|p|button|div)/g);
        if (orphaned) {
            slideInfo.hasBrokenHtml = true;
        }
        
        // Count punctuation
        const ellipsisCount = (allText.match(/\.\.\./g) || []).length;
        const dashCount = (allText.match(/—/g) || []).length;
        
        slideInfo.ellipsisCount = ellipsisCount;
        slideInfo.dashCount = dashCount;
        
        slideData.push(slideInfo);
    }
    
    // Analyze patterns
    for (let i = 0; i < slideData.length; i++) {
        const slide = slideData[i];
        
        // Issue 1: Double pause
        if (i > 0 && slideData[i-1].endsWithDash && slide.startsWithEllipsis) {
            issues.push({
                type: 'double_pause',
                slide: i,
                prevSlide: i - 1,
                severity: 'HIGH',
                message: `Slide ${i} starts with "..." but slide ${i-1} ends with "—"`,
                content: slide.allText.slice(0, 60)
            });
        }
        
        // Issue 2: Empty slides
        if (slide.elementCount <= 1 && slide.allText.length < 20) {
            issues.push({
                type: 'empty_slide',
                slide: i,
                severity: 'MEDIUM',
                message: `Slide ${i} is nearly empty (${slide.elementCount} elements)`,
                content: slide.allText.slice(0, 60)
            });
        }
        
        // Issue 3: Overcrowded
        if (slide.elementCount >= 5) {
            issues.push({
                type: 'crowded_slide',
                slide: i,
                severity: 'LOW',
                message: `Slide ${i} has ${slide.elementCount} elements — consider splitting`,
                content: slide.allText.slice(0, 60)
            });
        }
        
        // Issue 4: Dot fatigue
        if (slide.ellipsisCount >= 3) {
            issues.push({
                type: 'dot_fatigue',
                slide: i,
                severity: 'LOW',
                message: `Slide ${i} has ${slide.ellipsisCount} "..." — consider varying`,
                content: slide.allText.slice(0, 60)
            });
        }
        
        // Issue 5: Mixed pauses
        if (slide.ellipsisCount > 0 && slide.dashCount > 0) {
            const h2Combined = slide.h2.join(' ');
            if (h2Combined.includes('...') && h2Combined.includes('—')) {
                issues.push({
                    type: 'mixed_pauses',
                    slide: i,
                    severity: 'MEDIUM',
                    message: `Slide ${i} mixes "..." and "—" in same element`,
                    content: slide.allText.slice(0, 60)
                });
            }
        }
        
        // Issue 6: Broken HTML
        if (slide.hasBrokenHtml) {
            issues.push({
                type: 'broken_html',
                slide: i,
                severity: 'HIGH',
                message: `Slide ${i} may have orphaned text outside tags`,
                content: slide.allText.slice(0, 60)
            });
        }
    }
    
    return { issues, slideData, totalSlides: slides.length };
}

const result = analyzeSlides('c:\\Users\\andra\\Desktop\\dev\\stella-birthday-card\\index.html');

// Build report
let report = '=== RHYTHM AUDIT REPORT ===\n\n';
report += `Total slides: ${result.totalSlides}\n`;
report += `Issues found: ${result.issues.length}\n\n`;

const high = result.issues.filter(i => i.severity === 'HIGH');
const medium = result.issues.filter(i => i.severity === 'MEDIUM');
const low = result.issues.filter(i => i.severity === 'LOW');

if (high.length > 0) {
    report += '--- HIGH PRIORITY (Fix First) ---\n\n';
    high.forEach(issue => {
        report += `[Slide ${issue.slide}] ${issue.message}\n`;
        report += `  → "${issue.content}..."\n\n`;
    });
}

if (medium.length > 0) {
    report += '--- MEDIUM PRIORITY ---\n\n';
    medium.forEach(issue => {
        report += `[Slide ${issue.slide}] ${issue.message}\n`;
        report += `  → "${issue.content}..."\n\n`;
    });
}

if (low.length > 0) {
    report += '--- LOW PRIORITY (Optional) ---\n\n';
    low.forEach(issue => {
        report += `[Slide ${issue.slide}] ${issue.message}\n`;
        report += `  → "${issue.content}..."\n\n`;
    });
}

if (result.issues.length === 0) {
    report += 'No issues found! Narrative rhythm is clean.\n';
}

const reportPath = 'c:\\Users\\andra\\Desktop\\dev\\stella-birthday-card\\rhythm_report.txt';
fs.writeFileSync(reportPath, report);
console.log(`Audit complete. ${result.issues.length} issues found.`);
console.log('Report saved to ' + reportPath);
console.log('\n--- HIGH PRIORITY ---');
result.issues.filter(i => i.severity === 'HIGH').forEach(i => console.log(`Slide ${i.slide}: ${i.message}`));
console.log('\n--- MEDIUM PRIORITY ---');
result.issues.filter(i => i.severity === 'MEDIUM').forEach(i => console.log(`Slide ${i.slide}: ${i.message}`));
console.log(`\n(LOW priority: ${result.issues.filter(i => i.severity === 'LOW').length} items)`);
