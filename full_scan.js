const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\andra\\Desktop\\dev\\stella-birthday-card\\index.html', 'utf-8');

const slides = [...content.matchAll(/<article[^>]*class="[^"]*slide[^"]*"[^>]*>(.*?)<\/article>/gs)];

function clean(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

let totalDots = 0, totalDashes = 0;

console.log('=== STARTING WITH ... ===');
for (let i = 0; i < slides.length; i++) {
    const text = clean(slides[i][1]);
    totalDots += (text.match(/\.\.\./g) || []).length;
    totalDashes += (text.match(/—/g) || []).length;
    if (/^\.\.\./.test(text)) {
        console.log(`[Slide ${i}] ${text.slice(0, 80)}`);
    }
}

console.log('\n=== DOUBLE PAUSES (— at end, ... at start) ===');
let doublePauses = 0;
for (let i = 0; i < slides.length - 1; i++) {
    const curr = clean(slides[i][1]);
    const next = clean(slides[i+1][1]);
    if (/—\s*$/.test(curr.slice(-20)) && /^\.\.\./.test(next.slice(0, 20))) {
        doublePauses++;
        console.log(`COLLISION ${i}→${i+1}`);
        console.log(`  End: "...${curr.slice(-40)}"`);
        console.log(`  Start: "${next.slice(0, 40)}..."`);
    }
}

console.log('\n=== MIXED ... + — IN SAME h2 ===');
let mixedH2 = 0;
for (let i = 0; i < slides.length; i++) {
    const h2s = [...slides[i][1].matchAll(/<h2[^>]*>(.*?)<\/h2>/gs)];
    for (const h2 of h2s) {
        const txt = clean(h2[1]);
        if (txt.includes('...') && txt.includes('—')) {
            mixedH2++;
            console.log(`[Slide ${i}] ${txt.slice(0, 100)}`);
        }
    }
}

console.log('\n=== MIXED ... + — IN SAME p ===');
let mixedP = 0;
for (let i = 0; i < slides.length; i++) {
    const ps = [...slides[i][1].matchAll(/<p[^>]*>(.*?)<\/p>/gs)];
    for (const p of ps) {
        const txt = clean(p[1]);
        if (txt.includes('...') && txt.includes('—')) {
            mixedP++;
            console.log(`[Slide ${i}] ${txt.slice(0, 100)}`);
        }
    }
}

console.log('\n=== —... PATTERNS (dash directly followed by dots) ===');
for (let i = 0; i < slides.length; i++) {
    const text = clean(slides[i][1]);
    const matches = [...text.matchAll(/—\s*\.\.\./g)];
    if (matches.length > 0) {
        console.log(`[Slide ${i}] ${text.slice(0, 100)}`);
    }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total slides: ${slides.length}`);
console.log(`Total '...': ${totalDots}`);
console.log(`Total '—': ${totalDashes}`);
console.log(`Double-pause collisions: ${doublePauses}`);
console.log(`Mixed-pause h2: ${mixedH2}`);
console.log(`Mixed-pause p: ${mixedP}`);
