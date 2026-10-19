// 需求澄清器 · 冒烟测试（v0.3）
// 零依赖：极简 DOM 模拟浏览器，加载 bank.js + app.js，走完主要流程。
// 运行：node tests/smoke.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bankCode = fs.readFileSync(path.join(repo, 'bank.js'), 'utf8');
const appCode = fs.readFileSync(path.join(repo, 'app.js'), 'utf8');

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
  fire(t, ev) { (this._listeners[t] || []).forEach((fn) => fn(ev || {})); }
  click() { this.fire('click'); }
  appendChild(c) { this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  select() {}
  focus() {}
}

const ids = [
  'start', 'wizard', 'result', 'feedback', 'idea', 'catHint', 'bar', 'stepMeta', 'qTitle', 'qHint',
  'options', 'answer', 'counter', 'btnPrev', 'btnNext', 'btnWizard', 'btnClarify', 'btnShuffle',
  'btnModeDev', 'btnModeZero', 'modeNote', 'resultTitle', 'gaps', 'resultHint', 'output', 'pasteArea',
  'pasted', 'btnAssemble', 'btnCopy', 'btnReshuffle', 'btnEdit', 'btnRestart', 'copyMsg', 'btnFeedback',
  'fbOverall', 'fbGood', 'fbMid', 'fbBad', 'fbqList', 'fbStuck', 'fbSuggest', 'btnSaveFb', 'btnCopyFb',
  'btnExportFb', 'btnBackStart', 'fbMsg', 'btnFeedbackFoot', 'btnUp', 'btnDown', 'ex1', 'ex2', 'ex3'
];
const els = {};
ids.forEach((id) => { els[id] = new El('div', id); });
['wizard', 'result', 'feedback', 'pasteArea', 'btnReshuffle', 'copyMsg', 'fbMsg'].forEach((id) => els[id]._classes.add('hidden'));

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
  addEventListener: () => {},
  execCommand: () => true
};

const copied = [];
const navigatorMock = { clipboard: { writeText: (t) => { copied.push(t); return Promise.resolve(); } } };
const urlMock = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
class BlobMock { constructor(parts) { this.parts = parts; } }

const sandbox = {
  document: documentMock,
  localStorage,
  navigator: navigatorMock,
  alert: (m) => alerts.push(m),
  setTimeout,
  console,
  window: {},
  URL: urlMock,
  Blob: BlobMock
};
const ctx = vm.createContext(sandbox);
vm.runInContext(bankCode, ctx);
vm.runInContext(appCode, ctx);

const el = (id) => els[id];
const pickFirstAndNext = () => { els.options.children[0].click(); el('btnNext').click(); };
const typeIdea = (text) => { el('idea').value = text; el('idea').fire('input'); };

// ---------- 1. 初始状态 ----------
check('默认模式 = 半开发者', el('btnModeDev').classList.contains('on'));
check('主按钮显示约 8 个问题', el('btnWizard').textContent.includes('约 8 个问题'));

// ---------- 2. 空输入拦截 ----------
el('btnWizard').click();
check('空输入被拦截', alerts.length === 1 && el('wizard').classList.contains('hidden'));

// ---------- 3. 类型识别 ----------
typeIdea('做个介绍贵州的 PPT，给同学看');
check('PPT 类型被识别', el('catHint').textContent.includes('PPT 或汇报'));
typeIdea('写个能跑的 Python 爬虫');
check('代码类型被识别', el('catHint').textContent.includes('代码或工具'));
typeIdea('帮我写一条请假申请');
check('生活类型被识别', el('catHint').textContent.includes('生活或沟通'));
typeIdea('做个介绍贵州的 PPT，给同学看');

// ---------- 4. 半开发者规则版：8 步走完 ----------
el('btnWizard').click();
check('进入向导', !el('wizard').classList.contains('hidden'));
check('第 1 / 8 步', el('stepMeta').textContent.includes('第 1 / 8 步'));
check('步骤里带类型', el('stepMeta').textContent.includes('PPT 或汇报'));
check('第 1 题是大白话', el('qTitle').textContent.includes('做完这件事，你想拿到什么'));
el('btnUp').click();
for (let i = 0; i < 7; i += 1) pickFirstAndNext();
check('第 8 / 8 步', el('stepMeta').textContent.includes('第 8 / 8 步'));
pickFirstAndNext();
check('结果页出现', !el('result').classList.contains('hidden'));
check('结构化输出', el('output').textContent.includes('# 需求说明'));
check('输出带类型', el('output').textContent.includes('PPT 或汇报'));
check('完整度提示：都填了', el('gaps').textContent.includes('都填了'));
check('反馈入口存在', el('btnFeedback') !== null);

// ---------- 5. 换一批问法 ----------
el('btnRestart').click();
typeIdea('做个介绍贵州的 PPT');
const beforeCount = el('btnWizard').textContent;
el('btnShuffle').click();
check('换一批后仍可开始', el('btnWizard').textContent.includes('约'));
check('换一批提示出现', el('catHint').textContent.includes('已换一批问法'));
check('换一批后题目数仍是 5–8', /约 [5-8] 个问题/.test(el('btnWizard').textContent));

// ---------- 6. 两段式：生成 DeepSeek 提示词 ----------
typeIdea('帮我写一条请假申请');
el('btnClarify').click();
check('澄清提示词结果页', !el('result').classList.contains('hidden'));
check('提示词里有一次一问', el('output').textContent.includes('一次只问一个问题'));
check('提示词里有推荐答案', el('output').textContent.includes('推荐答案参考'));
check('提示词里有需求总结格式', el('output').textContent.includes('# 需求总结'));
check('贴回框出现', !el('pasteArea').classList.contains('hidden'));
check('换一批按钮出现（两段式）', !el('btnReshuffle').classList.contains('hidden'));
check('返回修改隐藏（两段式）', el('btnEdit').classList.contains('hidden'));
const clarifyBefore = el('output').textContent;
el('btnReshuffle').click();
check('两段式换一批后文本变化', el('output').textContent !== clarifyBefore);

// ---------- 7. 贴回来 → 组装最终需求 ----------
el('pasted').value = '# 需求总结\n## 目标\n写一条请假申请\n## 怎么算做好\n老师能直接批';
el('btnAssemble').click();
check('最终需求生成', el('resultTitle').textContent.includes('最终需求'));
check('最终需求含自检清单', el('output').textContent.includes('最终自检清单'));
check('最终需求保留贴回内容', el('output').textContent.includes('写一条请假申请'));

// ---------- 8. 反馈（C：逐题 + 问题反馈 + 记录） ----------
el('btnFeedback').click();
check('进入反馈页', !el('feedback').classList.contains('hidden'));
check('反馈页有逐题列表', el('fbqList').children.length > 1);
el('fbMid').click();
el('fbStuck').value = '第 3 题不知道选什么';
el('fbSuggest').value = '希望能自己加问题';
el('btnSaveFb').click();
const fbRaw = localStorage.getItem('reqclarify_feedback_v1');
let fbList = [];
try { fbList = JSON.parse(fbRaw || '[]'); } catch (e) { fbList = []; }
check('反馈已保存到本机', Array.isArray(fbList) && fbList.length === 1);
check('反馈内容完整', fbList[0] && fbList[0].stuck.includes('第 3 题') && fbList[0].overall === 2);
check('反馈含题目列表', fbList[0] && Array.isArray(fbList[0].questions) && fbList[0].questions.length > 0);
el('btnCopyFb').click();
await new Promise((resolve) => setTimeout(resolve, 10));
check('复制反馈可用', copied.length > 0 && copied[copied.length - 1].includes('【需求澄清器反馈】'));
el('btnBackStart').click();
check('反馈页可回首页', !el('start').classList.contains('hidden'));

// ---------- 9. 零基础模式：5 题 ----------
el('btnModeZero').click();
check('切到零基础', el('btnModeZero').classList.contains('on'));
check('零基础隐藏 DeepSeek 入口', el('btnClarify').classList.contains('hidden'));
check('零基础记住模式', localStorage.getItem('reqclarify_v02_mode') === 'zero');
typeIdea('帮我写一条请假申请');
check('零基础 5 题', el('btnWizard').textContent.includes('约 5 个问题'));
el('btnWizard').click();
check('零基础第 1 / 5 步', el('stepMeta').textContent.includes('第 1 / 5 步'));
for (let i = 0; i < 4; i += 1) pickFirstAndNext();
check('零基础第 5 / 5 步', el('stepMeta').textContent.includes('第 5 / 5 步'));
pickFirstAndNext();
check('零基础结果一段话', el('output').textContent.includes('# 我想让 AI 帮我做的事'));
check('零基础不输出结构化版', !el('output').textContent.includes('# 需求说明'));

// ---------- 10. 必填拦截 ----------
el('btnRestart').click();
typeIdea('做一个网页');
el('btnWizard').click();
el('btnNext').click();
check('必填项拦截', el('qHint').className.includes('warn') && el('stepMeta').textContent.includes('第 1 / 5 步'));

// ---------- 11. 草稿保存 ----------
check('草稿已保存', !!localStorage.getItem('reqclarify_v01_draft'));

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
