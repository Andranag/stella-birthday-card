const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\andra\\Desktop\\dev\\stella-birthday-card\\index.html', 'utf-8');

const slides = [...content.matchAll(/<article[^>]*class="[^"]*slide[^"]*"[^>]*>(.*?)<\/article>/gs)];

function clean(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

let report = '=== PUNCTUATION RHYTHM AUDIT ===\n\n';

// 1. SEMICOLONS (rare in love stories - usually awkward)
report += '--- SEMICOLONS (;) ---\n';
let semiCount = 0;
for (let i = 0; i < slides.length; i++) {
    const text = clean(slides[i][1]);
    if (/;/.test(text)) {
        const lines = text.split(/[.!?]/);
        for (const line of lines) {
            if (/;/.test(line)) {
                report += `[Slide ${i}] "${line.trim().slice(0, 80)}"\n`;
                semiCount++;
            }
        }
    }
}
report += `${semiCount} semicolons found\n\n`;

// 2. DOUBLE PUNCTUATION (,... or ..., or "... etc)
report += '--- DOUBLE PUNCTUATION ---\n';
let doublePunct = 0;
for (let i = 0; i < slides.length; i++) {
    const text = clean(slides[i][1]);
    if (/\.\.\.,/.test(text) || /,\.\.\./.test(text) || /\.\.\.;/.test(text) || /;\.\.\./.test(text) || /\"\.\.\./.test(text) || /\.\.\.\"/.test(text)) {
        const ctx = text.slice(0, 100);
        report += `[Slide ${i}] ${ctx}\n`;
        doublePunct++;
    }
}
report += `${doublePunct} double-punctuation instances\n\n`;

// 3. MISSING COMMA BEFORE — (standard: "word, —" not "word —")
report += '--- MISSING COMMA BEFORE EM DASH ---\n';
let missingComma = 0;
for (let i = 0; i < slides.length; i++) {
    const text = clean(slides[i][1]);
    // Find "word —" where the word is not a conjunction or interjection
    // Standard style: comma before em dash when it's parenthetical
    const matches = [...text.matchAll(/\b(\w+)\s+—/g)];
    for (const m of matches) {
        const word = m[1].toLowerCase();
        // Skip common exceptions where comma is optional
        const noCommaNeeded = /^(yes|no|well|now|then|there|here|so|but|and|or|for|nor|yet|ahem|honestly|basically|actually|seriously|though|although|however|meanwhile|finally|eventually|suddenly|apparently|obviously|clearly|fortunately|unfortunately|interestingly|surprisingly|frankly|personally|honestly|luckily|hopefully|incidentally|meanwhile|instead|rather|otherwise|therefore|thus|hence|consequently|accordingly|subsequently|meantime|anyway|anyhow|besides|furthermore|moreover|nevertheless|nonetheless|notwithstanding|otherwise|similarly|whereas|while|whereas|albeit|despite|regardless|notwithstanding)$/;
        if (!noCommaNeeded.test(word)) {
            report += `[Slide ${i}] "...${text.slice(Math.max(0,m.index-20), m.index+10)}..."\n`;
            missingComma++;
            if (missingComma > 20) break;
        }
    }
    if (missingComma > 20) break;
}
report += `${missingComma} potential missing commas\n\n`;

// 4. ELLIPSIS AT END OF DECLARATIVE STATEMENTS
report += '--- DECLARATIVE STATEMENTS ENDING IN ... (should be .) ---\n';
let declarativeEllipsis = 0;
for (let i = 0; i < slides.length; i++) {
    const text = clean(slides[i][1]);
    const sentences = text.split(/[.!?]/);
    for (const sent of sentences) {
        const s = sent.trim();
        // Heuristic: complete sentence (subject + verb), not a fragment, ends with ...
        // Skip incomplete thoughts, questions, and obvious trailing pauses
        if (/\.\.\.$/.test(s) && s.length > 20) {
            const words = s.split(/\s+/);
            const lastRealWord = words[words.length - 1].replace(/\.\.\.$/, '');
            // Check if it looks like a complete declarative statement
            const hasVerb = /\b(is|was|are|were|had|have|has|did|does|do|would|could|should|will|can|may|might|must|shall|been|being|go|went|gone|come|came|say|said|think|thought|know|knew|feel|felt|see|saw|find|found|take|took|give|gave|make|made|get|got|want|wanted|need|needed|love|loved|like|liked|hope|hoped|wish|wished|dream|dreamed|believe|believed|remember|reminded|decided|realized|noticed|wondered|asked|told|wrote|read|heard|saw|looked|seemed|appeared|happened|turned|changed|became|grew|started|began|ended|continued|remained|stayed|left|arrived|returned|came|went|ran|walked|talked|spoke|sat|stood|lay|fell|rose|raised|kept|held|put|set|let|made|kept|brought|took|gave|sent|showed|helped|tried|used|worked|played|lived|died|killed|hurt|hit|cut|broke|built|burn|burned|clean|cleaned|open|opened|close|closed|push|pushed|pull|pulled|turn|turned|move|moved|live|lived|die|died|cry|cried|smile|smiled|laugh|laughed|stop|stopped|start|started|wait|waited|watch|watched|follow|followed|lead|led|win|won|lose|lost|pay|paid|buy|bought|sell|sold|send|sent|spend|spent|eat|ate|drink|drank|sleep|slept|wake|woke|wear|wore|drive|drove|fly|flew|swim|swam|throw|threw|catch|caught|draw|drew|sing|sang|dance|danced|jump|jumped|climb|climbed|fall|fell|fight|fought|beat|beat|bite|bit|blow|blew|choose|chose|hide|hid|hold|held|hurt|hurt|lay|laid|lie|lay|ring|rang|rise|rose|shake|shook|shine|shone|shut|shut|sink|sank|slide|slid|spit|spat|split|split|spread|spread|spring|sprang|stand|stood|steal|stole|stick|stuck|strike|struck|sweep|swept|swing|swung|tear|tore|tell|told|think|thought|throw|threw|understand|understood|wake|woke|weep|wept|win|won|wind|wound|withdraw|withdrew|write|wrote)\b/i.test(s);
            
            if (hasVerb && !/\b(if|when|because|for|and|or|but|so|although|though|unless|while|since|before|after|once|until|whether|how|what|who|where|why|which|whose|whom|that|this|these|those|here|there|then|than|as|like|such|so|very|too|just|only|even|also|too|still|yet|already|almost|quite|rather|pretty|fairly|enough|indeed|certainly|surely|definitely|absolutely|completely|totally|entirely|fully|hardly|barely|scarcely|rarely|seldom|never|always|often|usually|sometimes|frequently|occasionally|generally|typically|mainly|mostly|partly|slightly|somewhat|kind|sort|type|way|kinda|sorta|bit|little|lot|few|many|much|more|most|some|any|no|none|all|both|each|either|neither|one|two|first|second|last|next|other|another|same|different|new|old|young|long|short|big|small|high|low|good|bad|better|best|worse|worst|great|little|own|old|right|left|early|late|same|able|back|bad|best|better|big|black|blue|brown|certain|clear|close|cold|dark|dead|different|difficult|dry|early|easy|empty|enough|equal|even|every|false|far|fast|final|fine|first|flat|foreign|free|full|funny|good|great|green|happy|hard|heavy|high|hot|huge|human|important|interested|interesting|large|last|late|lazy|left|light|likely|little|local|long|loud|low|lucky|main|major|many|modern|narrow|national|natural|necessary|new|nice|normal|old|only|open|original|other|perfect|personal|poor|popular|possible|private|public|quick|quiet|ready|real|recent|red|rich|right|rough|round|sad|safe|same|second|serious|several|sharp|short|significant|similar|simple|single|slow|small|smooth|soft|special|strong|sudden|sure|sweet|tall|terrible|thick|thin|third|tight|tiny|top|total|true|useful|usual|various|vast|very|warm|weak|wet|white|wide|wild|willing|wonderful|wrong|yellow|young)\b$/i.test(lastRealWord)) {
                declarativeEllipsis++;
                if (declarativeEllipsis <= 15) {
                    report += `[Slide ${i}] "${s.slice(0, 80)}..."\n`;
                }
            }
        }
    }
}
report += `${declarativeEllipsis} declarative statements ending in ellipsis\n\n`;

// 5. QUESTIONS WITHOUT ?
report += '--- QUESTIONS WITHOUT QUESTION MARK ---\n';
let noQmark = 0;
for (let i = 0; i < slides.length; i++) {
    const text = clean(slides[i][1]);
    // Look for question words followed by ... instead of ?
    const qPatterns = /\b(what|how|why|where|when|who|whom|whose|which|whether|if|can|could|would|will|shall|should|may|might|did|do|does|have|has|had|is|are|was|were|am)\b[^.!?]{10,50}\b(you|he|she|it|they|we|I|your|his|her|its|their|our|my|this|that|these|those|there|here|now|then|today|tomorrow|yesterday|ever|never|always|sometimes|often|usually|rarely|already|yet|still|just|only|even|also|too|very|quite|rather|pretty|fairly|enough|indeed|certainly|surely|definitely|absolutely|completely|totally|entirely|fully|hardly|barely|really|actually|probably|possibly|maybe|perhaps|likely|unlikely|obviously|clearly|apparently|evidently|presumably|supposedly|reportedly|allegedly|hopefully|thankfully|fortunately|unfortunately|interestingly|surprisingly|amazingly|incredibly|extremely|extraordinarily|remarkably|particularly|especially|specifically|generally|usually|normally|typically|mainly|mostly|partly|slightly|somewhat|kind|sort|type|way|kinda|sorta)\b[^.!?]{0,30}\.\.\./gi;
    const matches = [...text.matchAll(qPatterns)];
    for (const m of matches) {
        noQmark++;
        if (noQmark <= 10) {
            report += `[Slide ${i}] "${m[0].slice(0, 80)}..."\n`;
        }
    }
}
report += `${noQmark} questions ending in ... instead of ?\n\n`;

fs.writeFileSync('c:\\Users\\andra\\Desktop\\dev\\stella-birthday-card\\punct_report.txt', report);
console.log('Report saved to punct_report.txt');
console.log(`Semicolons: ${semiCount}, Double-punct: ${doublePunct}, Missing commas: ${missingComma}, Declarative ...: ${declarativeEllipsis}, Missing ?: ${noQmark}`);
