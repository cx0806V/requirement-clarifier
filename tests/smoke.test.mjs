// 需求澄清器 · 冒烟测试
// 零依赖：用极简 DOM 模拟浏览器，直接加载 app.js，走完两个模式的完整流程。
// 运行：node tests/smoke.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = fs.readFileSync(path.join(repo, 'app.js'), 'utf8');

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) { pass += 1; console.log('PASS  ' + name); }
  else { fail += 1; console.log('FAIL  ' + name); }
}

// ---------- 极简 DOM ----------
class El {
  constructor(tag, id) {
    this.tag = tag;
    this.id = id || '';
    this._text = '';
    this._html = '';
    this.className = '';
    this.style = {};
    this.value = '';
    this.children = [];
    this._listeners = {};
    this.attrs = {};
    this._classes = new Set();
  }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); if (v === '') this.children = []; }
  get classList() {
    const self = this;
    return {
      add(c) { self._classes.add(c); },
      remove(c) { self._classes.delete(c); },
      contains(c) { return self._classes.has(c); },
      toggle(c, on) {
        const want = (on === undefined) ? !self._classes.has(c) : !!on;
        if (want) self._classes.add(c); else self._classes.delete(c);
        return want;
      }
    };
  }
  addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); }
  click() { (this._listeners.click || []).forEach((fn) => fn({})); }
  appendChild(c) { this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  select() {}
  focus() {}
}

const ids = [
  'start', 'wizard', 'result', 'idea', 'bar', 'stepMeta', 'qTitle', 'qHint', 'options',
  'answer', 'counter', 'btnPrev', 'btnNext', 'btnWizard', 'btnClarify', 'btnCopy',
  'btnEdit', 'btnRestart', 'copyMsg', 'output', 'resultTitle', 'gaps', 'modeNote', 'modes', 'examples'
];
const els = {};
ids.forEach((id) => { els[id] = new El('div', id); });
// 对应 index.html 里的初始 class
els.wizard._classes.add('hidden');
els.result._classes.add('hidden');
els.copyMsg._classes.add('hidden');

const devBtn = new El('button');
devBtn.setAttribute('data-mode', 'dev');
const zeroBtn = new El('button');
zeroBtn.setAttribute('data-mode', 'zero');
els.modes.children.push(devBtn, zeroBtn);

const exTexts = ['做个介绍贵州的 PPT', '帮我写一条请假申请', '写个能跑的 Python 爬虫'];
exTexts.forEach((t) => {
  const b = new El('button');
  b.textContent = t;
  els.examples.children.push(b);
});

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

const alerts = [];
const documentMock = {
  readyState: 'complete',
  body: new El('body'),
  getElementById: (id) => els[id] || null,
  createElement: (tag) => new El(tag),
  querySelectorAll: (sel) => {
    if (sel === '#modes .mode') return els.modes.children;
    if (sel === '#examples .ex') return els.examples.children;
    return [];
  },
  addEventListener: () => {},
  execCommand: () => true
};

const navigatorMock = { clipboard: { writeText: () => Promise.resolve() } };

vm.runInNewContext(code, {
  document: documentMock,
  localStorage,
  navigator: navigatorMock,
  alert: (m) => alerts.push(m),
  setTimeout,
  console,
  window: {}
});

const el = (id) => els[id];
const pickFirstAndNext = () => { els.options.children[0].click(); el('btnNext').click(); };

// ---------- 1. 初始状态 ----------
check('默认模式 = 半开发者', devBtn.classList.contains('on'));
check('主按钮显示 8 个问题', el('btnWizard').textContent.includes('8 个问题'));
check('模式说明存在', el('modeNote').textContent.includes('半开发者'));

// ---------- 2. 空输入拦截 ----------
el('btnWizard').click();
check('空输入被拦截', alerts.length === 1 && el('wizard').classList.contains('hidden'));

// ---------- 3. 半开发者：8 步走完 ----------
el('idea').value = '做个介绍贵州的 PPT';
el('btnWizard').click();
check('进入向导', !el('wizard').classList.contains('hidden'));
check('第 1 / 8 步', el('stepMeta').textContent.includes('第 1 / 8 步'));
check('第 1 题是大白话', el('qTitle').textContent.includes('做完这件事，你想拿到什么'));
for (let i = 0; i < 7; i += 1) pickFirstAndNext();
check('第 8 / 8 步', el('stepMeta').textContent.includes('第 8 / 8 步'));
pickFirstAndNext();
check('结果页出现', !el('result').classList.contains('hidden'));
check('结构化输出', el('output').textContent.includes('# 需求说明'));
check('输出带自检清单', el('output').textContent.includes('自检清单'));
check('完整度提示：都填了', el('gaps').textContent.includes('都填了'));

// ---------- 4. 返回修改 + 重新开始 ----------
el('btnEdit').click();
check('返回修改回到向导', !el('wizard').classList.contains('hidden') && el('stepMeta').textContent.includes('第 8 / 8 步'));
el('btnRestart').click();
check('重新开始回到首屏', !el('start').classList.contains('hidden'));
check('输入框已清空', el('idea').value === '');

// ---------- 5. 零基础：5 步走完 ----------
zeroBtn.click();
check('切到零基础', zeroBtn.classList.contains('on') && !devBtn.classList.contains('on'));
check('按钮显示 5 个问题', el('btnWizard').textContent.includes('5 个问题'));
check('记住上次模式', localStorage.getItem('reqclarify_v02_mode') === 'zero');
el('idea').value = '帮我写一条请假申请';
el('btnWizard').click();
check('零基础第 1 / 5 步', el('stepMeta').textContent.includes('第 1 / 5 步'));
for (let i = 0; i < 4; i += 1) pickFirstAndNext();
check('零基础第 5 / 5 步', el('stepMeta').textContent.includes('第 5 / 5 步'));
pickFirstAndNext();
check('零基础结果页', !el('result').classList.contains('hidden'));
check('一段话输出', el('output').textContent.includes('# 我想让 AI 帮我做的事'));
check('零基础不输出结构化版', !el('output').textContent.includes('# 需求说明'));

// ---------- 6. 必填拦截 ----------
el('btnRestart').click();
zeroBtn.click();
el('idea').value = '做一个网页';
el('btnWizard').click();
el('btnNext').click();
check('必填项拦截', el('qHint').className.includes('warn') && el('stepMeta').textContent.includes('第 1 / 5 步'));

// ---------- 7. 让 AI 来问我 ----------
el('idea').value = '做个 PPT';
el('btnClarify').click();
check('澄清提示词结果页', !el('result').classList.contains('hidden'));
check('零基础澄清 = 5 件事', el('output').textContent.includes('要问的 5 件事'));
check('澄清页无完整度提示', el('gaps').textContent === '');

// ---------- 8. 复制提示 ----------
await new Promise((resolve) => setTimeout(resolve, 10));
el('btnCopy').click();
await new Promise((resolve) => setTimeout(resolve, 10));
check('复制提示出现', !el('copyMsg').classList.contains('hidden'));

// ---------- 9. 示例按钮 ----------
el('btnRestart').click();
els.examples.children[0].click();
check('示例填入输入框', el('idea').value.includes('贵州'));

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
