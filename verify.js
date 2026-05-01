const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\andra\\Desktop\\dev\\stella-birthday-card\\index.html', 'utf-8');

// Extract h2 text by stripping all inner tags
const h2s = [...content.matchAll(/<h2[^>]*>(.*?)<\/h2>/gs)];
let mixed = 0;

for (const match of h2s) {
    const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.includes('...') && text.includes('—')) {
        mixed++;
        console.log(`MIXED: "${text.slice(0, 100)}"`);
    }
}

console.log(`\nTotal mixed-pause h2 elements: ${mixed}`);

// Also verify zero double-pauses
const slides = [...content.matchAll(/<article[^>]*class="[^"]*slide[^"]*"[^>]*>(.*?)<\/article>/gs)];
let doublePauses = 0;
for (let i = 0; i < slides.length - 1; i++) {
    const current = slides[i][1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const next = slides[i+1][1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const endsDash = /—\s*$/.test(current.slice(-30));
    const startsEllipsis = /^\.\.\./.test(next.slice(0, 30));
    if (endsDash && startsEllipsis) {
        doublePauses++;
        console.log(`DOUBLE: slide ${i} → ${i+1}`);
    }
}
console.log(`Double-pause collisions: ${doublePauses}`);
