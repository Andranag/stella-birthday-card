const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\andra\\Desktop\\dev\\stella-birthday-card\\index.html', 'utf-8');

const slides = [...content.matchAll(/<article[^>]*class="[^"]*slide[^"]*"[^>]*>(.*?)<\/article>/gs)];

function clean(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

console.log('=== PERIOD VS ELLIPSIS CHECK ===');
console.log('(Statements ending ... that look declarative/complete)\n');
let periodIssues = 0;
for (let i = 0; i < slides.length; i++) {
    const text = clean(slides[i][1]);
    // Find sentences that end with ... but are complete statements (not trailing thoughts)
    // Pattern: complete clause + ... at end of element
    const lines = text.split(/[.!?]\s+/);
    for (const line of lines) {
        const trimmed = line.trim();
        // Heuristics: if it ends with ... and looks like a complete sentence
        if (/\.\.\.$/.test(trimmed) && trimmed.length > 15 && !/\b(if|when|because|for|and|or|but|so)\b.*\.\.\.$/i.test(trimmed)) {
            // These are candidates for period instead of ellipsis
            // Only flag if it's a declarative statement
            const words = trimmed.split(/\s+/);
            const lastWord = words[words.length - 1].replace(/\.\.\.$/, '');
            // Skip if clearly trailing (ends with verb or incomplete phrase)
            const incompleteStarters = /^\b(on|in|for|to|with|by|at|from|about|into|through|during|before|after|above|below|between|under|again|further|then|once|here|there|when|where|why|how|all|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|can|will|just|should|now)\b/i;
            if (!incompleteStarters.test(lastWord) && words.length > 3) {
                // Likely complete statement - flag it
                // But only show a sample, not everything
                if (periodIssues < 15) {
                    console.log(`[Slide ${i}] "${trimmed.slice(0, 70)}"`);
                }
                periodIssues++;
            }
        }
    }
}
console.log(`\n${periodIssues} potential declarative statements ending in ...\n`);

console.log('=== COMMA CHECKS ===\n');
let commaIssues = 0;
for (let i = 0; i < slides.length; i++) {
    const text = clean(slides[i][1]);
    // Check for missing comma before "—" in standard constructions
    // Pattern: word word — (no comma before em dash when there should be one)
    // This is subjective but common pattern: "word , —" vs "word —"
    
    // More useful: check for comma splices or missing commas in lists
    // Heuristic: "and" without preceding comma in long clauses
    const noCommaBeforeAnd = /\b\w+\s+\w+\s+and\b/g;
    const matches = [...text.matchAll(noCommaBeforeAnd)];
    
    // Check for double punctuation: ,... or ..., or ;...
    if (/\.\.\.,/.test(text) || /,\.\.\./.test(text)) {
        console.log(`[Slide ${i}] Double punctuation found: ${text.slice(0, 60)}`);
        commaIssues++;
    }
    
    // Check for semicolons
    if (/;/.test(text)) {
        if (commaIssues < 30) {
            console.log(`[Slide ${i}] Semicolon found: "${text.slice(0, 60)}"`);
        }
        commaIssues++;
    }
}
console.log(`\n${commaIssues} comma/semicolon notes\n`);

console.log('=== ELLIPSIS OVERUSE ZONES ===\n');
for (let i = 0; i < slides.length; i++) {
    const text = clean(slides[i][1]);
    const dots = (text.match(/\.\.\./g) || []).length;
    if (dots >= 3) {
        console.log(`[Slide ${i}] ${dots} ellipses in one slide: "${text.slice(0, 70)}..."`);
    }
}

console.log('\n=== DOUBLE PERIODS ===');
for (let i = 0; i < slides.length; i++) {
    const text = clean(slides[i][1]);
    if (/\.\.(?!\.)|\. \. \./.test(text)) {
        console.log(`[Slide ${i}] Spaced/dot pattern: "${text.slice(0, 60)}"`);
    }
}

console.log('\n=== DONE ===');
