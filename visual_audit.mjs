import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9300 + Math.floor(Math.random() * 500);
const URL = 'http://127.0.0.1:4173/?visualAudit=1';

const viewports = [
  { name: 'desktop', width: 1366, height: 768, mobile: false },
  { name: 'tablet', width: 768, height: 1024, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];

const userDataDir = path.join(os.tmpdir(), `stella-edge-visual-audit-${Date.now()}`);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForJson(url, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (_) {}
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function makeCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };

  return new Promise((resolve, reject) => {
    ws.onerror = reject;
    ws.onopen = () => {
      resolve({
        send(method, params = {}) {
          const callId = ++id;
          ws.send(JSON.stringify({ id: callId, method, params }));
          return new Promise((res, rej) => pending.set(callId, { resolve: res, reject: rej }));
        },
        close() {
          ws.close();
        },
      });
    };
  });
}

async function evaluate(cdp, expression, returnByValue = true) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue,
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime evaluation failed';
    throw new Error(detail);
  }
  return result.result.value;
}

const inspectExpression = `
(() => {
  const pageEls = [...document.querySelectorAll('.book-page')];
  const issues = [];
  const activeSlides = [...document.querySelectorAll('#left-slot > .slide.gift-article.active.in-page, #right-slot > .slide.gift-article.active.in-page')];
  const slideCount = document.querySelectorAll('#swipe-container > .slide.gift-article, #left-slot > .slide.gift-article, #right-slot > .slide.gift-article').length;
  const counter = document.querySelector('#top-indicator')?.textContent?.trim() || '';
  const spreadText = activeSlides.map(slide => (slide.querySelector('h1,h2')?.textContent || '').trim().replace(/\\s+/g, ' '));

  for (const page of pageEls) {
    const pageRect = page.getBoundingClientRect();
    const slide = page.querySelector('.slide.gift-article.active.in-page');
    if (!slide) continue;
    const slideRect = slide.getBoundingClientRect();
    if (slide.scrollHeight > slide.clientHeight + 2) {
      issues.push({
        type: 'slide_vertical_overflow',
        page: page.id,
        overflow: Math.round(slide.scrollHeight - slide.clientHeight),
        title: (slide.querySelector('h1,h2')?.textContent || '').trim().replace(/\\s+/g, ' '),
      });
    }
    if (slide.scrollWidth > slide.clientWidth + 2) {
      issues.push({
        type: 'slide_horizontal_overflow',
        page: page.id,
        overflow: Math.round(slide.scrollWidth - slide.clientWidth),
        title: (slide.querySelector('h1,h2')?.textContent || '').trim().replace(/\\s+/g, ' '),
      });
    }
    for (const el of slide.querySelectorAll('h1,h2,p,.text-to-sound,.peek-hint,.gift-img')) {
      const rect = el.getBoundingClientRect();
      const label = el.matches('.gift-img') ? 'media' : el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 90);
      if (rect.left < pageRect.left - 1 || rect.right > pageRect.right + 1) {
        issues.push({
          type: 'element_horizontal_escape',
          page: page.id,
          label,
          left: Math.round(rect.left - pageRect.left),
          right: Math.round(rect.right - pageRect.right),
          title: (slide.querySelector('h1,h2')?.textContent || '').trim().replace(/\\s+/g, ' '),
        });
      }
      if (rect.top < pageRect.top - 1 || rect.bottom > pageRect.bottom + 1) {
        issues.push({
          type: 'element_vertical_escape',
          page: page.id,
          label,
          top: Math.round(rect.top - pageRect.top),
          bottom: Math.round(rect.bottom - pageRect.bottom),
          title: (slide.querySelector('h1,h2')?.textContent || '').trim().replace(/\\s+/g, ' '),
        });
      }
    }
  }
  return { counter, spreadText, slideCount, issues };
})()
`;

async function runViewport(cdp, vp) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: 1,
    mobile: vp.mobile,
  });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await cdp.send('Page.navigate', { url: URL });
  for (let i = 0; i < 50; i++) {
    const href = await evaluate(cdp, 'location.href').catch(() => '');
    if (href.startsWith(URL)) break;
    await delay(100);
  }
  await delay(700);

  await evaluate(cdp, `localStorage.setItem('stella_bday_unlocked', '1'); localStorage.removeItem('stella_bday_bookmark');`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await delay(900);

  const allIssues = [];
  let lastState = null;
  let count = 0;
  for (let i = 0; i < 50; i++) {
    count = await evaluate(cdp, `window.__STELLA_VISUAL_AUDIT__?.count?.() || 0`).catch(() => 0);
    if (count) break;
    await delay(100);
  }
  if (!count) {
    const diag = await evaluate(cdp, `({
      href: location.href,
      readyState: document.readyState,
      title: document.title,
      slides: document.querySelectorAll('.slide.gift-article').length,
      hasHook: !!window.__STELLA_VISUAL_AUDIT__,
      body: document.body?.innerText?.slice(0, 200)
    })`).catch(error => ({ error: String(error) }));
    throw new Error(`Visual audit hook did not initialize: ${JSON.stringify(diag)}`);
  }
  const steps = vp.mobile
    ? Array.from({ length: count }, (_, i) => i)
    : [0, ...Array.from({ length: Math.ceil((count - 1) / 2) }, (_, i) => i * 2 + 1)];

  for (let step = 0; step < steps.length; step++) {
    await evaluate(cdp, `window.__STELLA_VISUAL_AUDIT__.jump(${steps[step]})`);
    await delay(40);
    const state = await evaluate(cdp, inspectExpression);
    lastState = state;
    for (const issue of state.issues) allIssues.push({ viewport: vp.name, step, counter: state.counter, ...issue });

  }

  const navState = await evaluate(cdp, `({
    nextDisabled: document.getElementById('next-page')?.disabled,
    prevDisabled: document.getElementById('prev-page')?.disabled,
    bodyClass: document.body.className,
    active: [...document.querySelectorAll('#left-slot > .slide.gift-article.active.in-page, #right-slot > .slide.gift-article.active.in-page')].map(s => (s.querySelector('h1,h2')?.textContent || '').trim().replace(/\\s+/g, ' '))
  })`);
  return { viewport: vp.name, states: steps.length, lastState, navState, issues: allIssues };
}

await fs.rm(userDataDir, { recursive: true, force: true });
const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--disable-gpu',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

try {
  const tabs = await waitForJson(`http://127.0.0.1:${PORT}/json`);
  const pageTarget = tabs.find(tab => tab.type === 'page' && tab.webSocketDebuggerUrl);
  if (!pageTarget) throw new Error('No debuggable page target found');
  const cdp = await makeCdp(pageTarget.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const results = [];
  for (const viewport of viewports) {
    results.push(await runViewport(cdp, viewport));
  }

  cdp.close();
  console.log(JSON.stringify(results, null, 2));
} finally {
  edge.kill();
}
