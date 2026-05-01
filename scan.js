const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\andra\\Desktop\\dev\\stella-birthday-card\\index.html', 'utf-8');

// Extract slides
const slideRegex = /<article[^>]*class="[^"]*slide[^"]*"[^>]*>(.*?)<\/article>/gs;
const slides = [];
let m;
while ((m = slideRegex.exec(content)) !== null) {
    slides.push(m[1]);
}

function cleanText(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

console.log('=== DOUBLE PAUSE SCAN (— at end, ... at start) ===\n');
let doublePauses = 0;
for (let i = 0; i < slides.length - 1; i++) {
    const current = cleanText(slides[i]);
    const next = cleanText(slides[i+1]);
    
    const endsWithDash = /—\s*$/.test(current.slice(-20));
    const startsWithEllipsis = /^\.\.\./.test(next.slice(0, 20));
    
    if (endsWithDash && startsWithEllipsis) {
        doublePauses++;
        console.log(`COLLISION: Slide ${i} → Slide ${i+1}`);
        console.log(`  Slide ${i} ends: "...${current.slice(-40)}"`);
        console.log(`  Slide ${i+1} starts: "${next.slice(0, 40)}..."`);
        console.log('');
    }
}

console.log(`\nFound ${doublePauses} double-pause collisions.\n`);

console.log('=== MIXED PAUSES IN SAME <h2> (... + —) ===\n');
let mixedCount = 0;
for (let i = 0; i < slides.length; i++) {
    const h2s = [...slides[i].matchAll(/<h2[^>]*>(.*?)<\/h2>/gs)];
    for (const h2 of h2s) {
        const text = cleanText(h2[1]);
        if (text.includes('...') && text.includes('—')) {
            mixedCount++;
            console.log(`Slide ${i}: "${text.slice(0, 70)}..."`);
        }
    }
}
console.log(`\nFound ${mixedCount} mixed-pause h2 elements.`);
