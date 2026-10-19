(function () {
  'use strict';

  // ============ 模式（2026-10-19 定：零基础 + 半开发者） ============
  var MODES = {
    dev: {
      label: '半开发者',
      note: '半开发者版：按你的需求动态出题；也可以生成一段给 DeepSeek 的提示词，让 AI 来问你。'
    },
    zero: {
      label: '零基础',
      note: '零基础版：只问 5 题，每题都有现成答案，最后给你一段话。'
    }
  };

  var DRAFT_KEY = 'reqclarify_v01_draft';
  var MODE_KEY = 'reqclarify_v02_mode';
  var FB_KEY = 'reqclarify_feedback_v1';

  var state = {
    idea: '',
    mode: 'dev',
    salt: 0,
    category: 'general',
    catLabel: '通用',
    qs: [],
    answers: {},
    index: 0,
    lastType: 'rules',
    fb: { overall: 3, votes: {}, stuck: '', suggest: '' }
  };

  function $(id) { return document.getElementById(id); }
  function hasText(v) { return !!(v && String(v).trim()); }
  function modeConf() { return MODES[state.mode]; }

  // ============ 出题（规则式个性化） ============
  function regenerate() {
    var r = REQ_BANK.build(state.idea, state.mode, state.salt);
    state.category = r.category;
    state.catLabel = r.label;
    state.qs = r.questions;
  }

  function catHintText() {
    if (!hasText(state.idea)) {
      return '写完我会先判断类型（PPT / 代码 / 文案 / 表格 / 学习 / 生活），再出对应的题。';
    }
    return '识别为「' + state.catLabel + '」· 预计问 ' + state.qs.length + ' 个问题。';
  }

  // ============ 模式切换 ============
  function applyMode(name, persist) {
    state.mode = MODES[name] ? name : 'dev';
    $('btnModeDev').classList.toggle('on', state.mode === 'dev');
    $('btnModeZero').classList.toggle('on', state.mode === 'zero');
    $('modeNote').textContent = modeConf().note;
    $('btnClarify').classList.toggle('hidden', state.mode === 'zero');
    regenerate();
    $('btnWizard').textContent = '开始（约 ' + state.qs.length + ' 个问题）';
    $('catHint').textContent = catHintText();
    if (persist) { try { localStorage.setItem(MODE_KEY, state.mode); } catch (e) { /* 忽略 */ } }
  }

  // ============ 草稿 ============
  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        idea: state.idea, answers: state.answers, mode: state.mode, salt: state.salt
      }));
    } catch (e) { /* 忽略 */ }
  }
  function loadDraft() {
    try {
      var m = localStorage.getItem(MODE_KEY);
      if (m && MODES[m]) state.mode = m;
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (!d) return;
      state.idea = d.idea || '';
      state.answers = d.answers || {};
      if (d.mode && MODES[d.mode]) state.mode = d.mode;
      if (typeof d.salt === 'number') state.salt = d.salt;
      $('idea').value = state.idea;
    } catch (e) { /* 忽略 */ }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* 忽略 */ } }

  // ============ 页面切换 ============
  function show(id) {
    ['start', 'wizard', 'result', 'feedback'].forEach(function (s) {
      $(s).classList.toggle('hidden', s !== id);
    });
  }

  // ============ 向导 ============
  function currentQ() { return state.qs[state.index]; }

  function renderStep() {
    if (!state.qs.length) regenerate();
    if (state.index >= state.qs.length) state.index = state.qs.length - 1;
    var q = currentQ();
    var ans = state.answers[q.key] || { choice: '', text: '' };

    $('bar').style.width = ((state.index + 1) / state.qs.length * 100) + '%';
    $('stepMeta').textContent = modeConf().label + '版 · 第 ' + (state.index + 1) + ' / ' + state.qs.length +
      ' 步 · 类型：' + state.catLabel + ' · ' + q.dim;
    $('qTitle').textContent = q.title;
    $('qHint').textContent = q.hint;
    $('qHint').className = 'hint';

    var box = $('options');
    box.innerHTML = '';
    q.options.forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (ans.choice === opt ? ' on' : '');
      b.textContent = opt;
      b.addEventListener('click', function () {
        var cur = state.answers[q.key] || { choice: '', text: '' };
        cur.choice = (cur.choice === opt) ? '' : opt;
        state.answers[q.key] = cur;
        renderStep();
        saveDraft();
      });
      box.appendChild(b);
    });

    $('answer').value = ans.text || '';
    $('counter').textContent = q.required ? '这一项必填' : '可跳过';
    $('btnPrev').style.visibility = (state.index === 0) ? 'hidden' : 'visible';
    $('btnNext').textContent = (state.index === state.qs.length - 1) ? '生成' : '下一步';

    var vote = state.fb.votes[q.key] || 0;
    $('btnUp').classList.toggle('on', vote === 1);
    $('btnDown').classList.toggle('on', vote === -1);
  }

  function collectAnswer() {
    var q = currentQ();
    var a = state.answers[q.key] || { choice: '', text: '' };
    a.text = ($('answer').value || '').trim();
    state.answers[q.key] = a;
    saveDraft();
    if (q.required && !hasText(a.choice) && !hasText(a.text)) {
      $('qHint').textContent = '这一项必须填：点一个上面的推荐答案，或者用自己的话写一句。';
      $('qHint').className = 'hint warn';
      return false;
    }
    return true;
  }

  // ============ 生成文本 ============
  function answerText(key) {
    var a = state.answers[key] || {};
    var parts = [];
    if (a.choice) parts.push(a.choice);
    if (a.text) parts.push(a.text);
    return parts.length ? parts.join('；') : '（未提供）';
  }

  function answered(key) {
    var a = state.answers[key] || {};
    return hasText(a.choice) || hasText(a.text);
  }

  function groupByDim() {
    var groups = [];
    state.qs.forEach(function (q) {
      var g = null;
      for (var i = 0; i < groups.length; i += 1) if (groups[i].dim === q.dim) g = groups[i];
      if (!g) { g = { dim: q.dim, items: [] }; groups.push(g); }
      g.items.push(q);
    });
    return groups;
  }

  function buildStructuredPrompt() {
    var lines = ['# 需求说明', '', '## 0. 我最初的想法', state.idea, '', '（类型：' + state.catLabel + '）'];
    groupByDim().forEach(function (g, gi) {
      lines.push('', '## ' + (gi + 1) + '. ' + g.dim);
      g.items.forEach(function (q) {
        lines.push('- ' + q.short + '：' + answerText(q.key));
      });
    });
    lines.push('', '# 执行要求',
      '1. 请严格按照以上需求完成。',
      '2. 完成后先逐条对照「怎么算做好」自检，把自检结果列出来，再输出最终结果。',
      '3. 任何信息不足的地方，先向我确认，不要自行假设。',
      '', '# 自检清单（交付前逐条打勾）',
      '- [ ] 交付物符合要求的格式和数量',
      '- [ ] 满足全部限制',
      '- [ ] 没有出现「明确不要」的内容',
      '- [ ] 「怎么算做好」每一条都能打勾');
    return lines.join('\n');
  }

  function buildPlainPrompt() {
    var parts = ['# 我想让 AI 帮我做的事', '', state.idea, ''];
    var wanted = { goal: 1, audience: 1, deliverable: 1, accept: 1 };
    state.qs.forEach(function (q) {
      if (wanted[q.key]) parts.push('## ' + q.short, answerText(q.key), '');
      else if (!q.required || hasText((state.answers[q.key] || {}).choice) || hasText((state.answers[q.key] || {}).text)) {
        parts.push('## ' + q.short, answerText(q.key), '');
      }
    });
    parts.push('# 请 AI 这样做',
      '1. 先把你的理解用一两句话复述给我，确认没理解错再开始。',
      '2. 做完之后，对照「怎么算做好」一条条检查，把检查结果告诉我。',
      '3. 有不清楚的地方先问我，不要自己猜。',
      '', '# 交付前自检（逐条打勾）',
      '- [ ] 拿到的东西就是我上面说的那样',
      '- [ ] 没有出现我明确不想要的内容',
      '- [ ] 「怎么算做好」每一条都能打勾');
    return parts.join('\n');
  }

  function buildOutput() {
    return state.mode === 'zero' ? buildPlainPrompt() : buildStructuredPrompt();
  }

  function buildClarifyPrompt() {
    var lines = [
      '你是我的需求澄清助手。我先给你一段很模糊的想法，你要在动手之前，帮我把需求问清楚。',
      '',
      '规则：',
      '1. 一次只问一个问题，等我回答完再问下一个，不要一次抛出一堆问题。',
      '2. 每个问题都给我 2-3 个现成的答案让我选，减少我的思考成本。',
      '3. 能从我上面的话里猜到的，先给一个默认答案让我确认，不要重复问。',
      '4. 下面这些要点没问清楚之前，不许开始干活；顺序可以按重要程度调整：',
      ''
    ];
    state.qs.forEach(function (q, i) {
      lines.push((i + 1) + '. ' + q.title);
      lines.push('   推荐答案参考：' + q.options.join(' / '));
    });
    lines.push(
      '',
      '5. 问完之后，严格按下面的格式给我一份「需求总结」，不要加别的内容：',
      '',
      '# 需求总结'
    );
    groupByDim().forEach(function (g) {
      lines.push('## ' + g.dim);
      g.items.forEach(function (q) { lines.push('### ' + q.short); });
    });
    lines.push(
      '',
      '我的想法是：',
      '"""',
      state.idea,
      '"""'
    );
    return lines.join('\n');
  }

  // ============ 结果页 ============
  function gapsText() {
    var missing = [];
    state.qs.forEach(function (q) { if (!answered(q.key)) missing.push(q.short); });
    if (!missing.length) return '这 ' + state.qs.length + ' 项都填了，AI 基本不用再追问。';
    return '已填 ' + (state.qs.length - missing.length) + ' / ' + state.qs.length +
      ' 项。AI 可能还会追问：' + missing.join('、') + '。';
  }

  function showResult(title, text, type) {
    state.lastType = type;
    $('resultTitle').textContent = title;
    $('gaps').textContent = type === 'rules' ? gapsText() : '';
    $('resultHint').textContent = type === 'clarify'
      ? '复制这段，粘给 DeepSeek（或豆包）网页版；它问完你之后，把它的「需求总结」贴回下面的框里。'
      : '复制后粘给豆包 / DeepSeek / 任何 AI 都行。';
    $('output').textContent = text;
    $('copyMsg').classList.add('hidden');
    $('pasteArea').classList.toggle('hidden', type !== 'clarify');
    $('btnReshuffle').classList.toggle('hidden', type !== 'clarify');
    $('btnEdit').classList.toggle('hidden', type !== 'rules');
    show('result');
  }

  function copyOutput() {
    var text = $('output').textContent || '';
    copyText(text, function () {
      $('copyMsg').classList.remove('hidden');
      setTimeout(function () { $('copyMsg').classList.add('hidden'); }, 1800);
    });
  }

  function copyText(text, ok) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { alert('复制失败，请手动选中复制。'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fallback);
    } else {
      fallback();
    }
  }

  function assembleFinal() {
    var pasted = ($('pasted').value || '').trim();
    if (!pasted) { alert('先把 DeepSeek 输出里的「需求总结」贴进来。'); $('pasted').focus(); return; }
    var final = [
      '# 需求说明（我是和 AI 一条条澄清过的）',
      '',
      pasted,
      '',
      '# 执行要求',
      '1. 请严格按照以上需求完成。',
      '2. 完成后先对照「怎么算做好了」逐条自检，把自检结果列出来，再输出最终结果。',
      '3. 信息不足的地方先问我，不要自行假设。',
      '',
      '# 最终自检清单（交付前逐条打勾）',
      '- [ ] 交付物符合格式和数量要求',
      '- [ ] 满足「必须遵守的限制」',
      '- [ ] 没有出现「明确不要」的内容',
      '- [ ] 「怎么算做好了」每一条都能打勾'
    ].join('\n');
    showResult('最终需求生成好了，复制给 AI 干活', final, 'final');
    $('pasted').value = '';
  }

  // ============ 反馈 ============
  function openFeedback() {
    renderFbList();
    state.fb.stuck = $('fbStuck').value || '';
    state.fb.suggest = $('fbSuggest').value || '';
    setOverall(state.fb.overall);
    $('fbMsg').classList.add('hidden');
    show('feedback');
  }

  function setOverall(v) {
    state.fb.overall = v;
    $('fbGood').classList.toggle('on', v === 3);
    $('fbMid').classList.toggle('on', v === 2);
    $('fbBad').classList.toggle('on', v === 1);
  }

  function renderFbList() {
    var box = $('fbqList');
    box.innerHTML = '';
    if (!state.qs.length) {
      var p = document.createElement('p');
      p.className = 'hint';
      p.textContent = '还没有生成过问题：先回首页写一句需求。';
      box.appendChild(p);
      return;
    }
    var title = document.createElement('p');
    title.className = 'label';
    title.textContent = '逐题反馈（这组问题共 ' + state.qs.length + ' 题）：';
    box.appendChild(title);
    state.qs.forEach(function (q) {
      var row = document.createElement('div');
      row.className = 'fbq-row';
      var span = document.createElement('span');
      span.className = 'fbq-title';
      span.textContent = q.title;
      row.appendChild(span);
      [-1, 1].forEach(function (v) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'vbtn' + (state.fb.votes[q.key] === v ? ' on' : '');
        b.textContent = v === 1 ? '👍' : '👎';
        b.addEventListener('click', function () {
          state.fb.votes[q.key] = (state.fb.votes[q.key] === v) ? 0 : v;
          renderFbList();
        });
        row.appendChild(b);
      });
      box.appendChild(row);
    });
  }

  function saveFeedback() {
    var votes = {};
    Object.keys(state.fb.votes).forEach(function (k) { if (state.fb.votes[k]) votes[k] = state.fb.votes[k]; });
    var record = {
      time: new Date().toISOString(),
      mode: state.mode,
      category: state.category,
      idea: state.idea,
      source: state.lastType,
      qcount: state.qs.length,
      questions: state.qs.map(function (q) { return q.title; }),
      overall: state.fb.overall,
      votes: votes,
      stuck: ($('fbStuck').value || '').trim(),
      suggest: ($('fbSuggest').value || '').trim()
    };
    var list = [];
    try { list = JSON.parse(localStorage.getItem(FB_KEY) || '[]'); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    list.push(record);
    try { localStorage.setItem(FB_KEY, JSON.stringify(list)); } catch (e) { /* 忽略 */ }
    $('fbMsg').textContent = '已保存 ✓ 本机共 ' + list.length + ' 条反馈（不会上传，可用「复制 / 导出」发我）';
    $('fbMsg').classList.remove('hidden');
  }

  function exportFeedback() {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(FB_KEY) || '[]'); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    var text = JSON.stringify(list, null, 2);
    var name = '需求澄清器-反馈-' + new Date().toISOString().slice(0, 10) + '.json';
    try {
      var blob = new Blob([text], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败，可以改用「复制反馈」。');
    }
  }

  function feedbackText() {
    var votes = [];
    state.qs.forEach(function (q) {
      var v = state.fb.votes[q.key];
      if (v) votes.push((v === 1 ? '👍 ' : '👎 ') + q.title);
    });
    return [
      '【需求澄清器反馈】',
      '模式：' + modeConf().label + ' ｜ 类型：' + state.catLabel + ' ｜ 题目数：' + state.qs.length,
      '我写的需求：' + (state.idea || '（空）'),
      '整体评价：' + ({ 3: '有用', 2: '一般', 1: '没用' })[state.fb.overall],
      votes.length ? '逐题：\n' + votes.join('\n') : '逐题：（没投）',
      '卡住的地方：' + (($('fbStuck').value || '').trim() || '（没写）'),
      '建议：' + (($('fbSuggest').value || '').trim() || '（没写）')
    ].join('\n');
  }

  function copyFeedback() {
    copyText(feedbackText(), function () {
      $('fbMsg').textContent = '反馈已复制 ✓ 粘到微信发我就行';
      $('fbMsg').classList.remove('hidden');
    });
  }

  // ============ 事件 ============
  function startWizard() {
    state.idea = ($('idea').value || '').trim();
    if (!state.idea) { alert('先在输入框写一句你要做的事，再开始。'); $('idea').focus(); return; }
    regenerate();
    state.index = 0;
    show('wizard');
    renderStep();
    saveDraft();
  }

  function startClarify() {
    state.idea = ($('idea').value || '').trim();
    if (!state.idea) { alert('先在输入框写一句你要做的事，再生成。'); $('idea').focus(); return; }
    regenerate();
    saveDraft();
    showResult('把这段提示词粘给 DeepSeek，让它来问你', buildClarifyPrompt(), 'clarify');
  }

  function nextStep() {
    if (!collectAnswer()) return;
    if (state.index === state.qs.length - 1) {
      var title = state.mode === 'zero' ? '生成好了，直接复制给 AI' : '生成好了，直接复制给 AI';
      showResult(title, buildOutput(), 'rules');
      return;
    }
    state.index += 1;
    renderStep();
    saveDraft();
  }

  function prevStep() {
    collectAnswer();
    if (state.index > 0) { state.index -= 1; renderStep(); }
  }

  function editResult() {
    state.index = state.qs.length - 1;
    renderStep();
    show('wizard');
  }

  function restart() {
    state.idea = '';
    state.answers = {};
    state.index = 0;
    $('idea').value = '';
    clearDraft();
    show('start');
    applyMode(state.mode, false);
  }

  function shuffle() {
    state.salt += 1;
    state.answers = {};
    regenerate();
    if (state.lastType === 'clarify' && !$('result').classList.contains('hidden')) {
      showResult('换了一种问法，再粘一次给 DeepSeek', buildClarifyPrompt(), 'clarify');
    } else {
      $('catHint').textContent = '已换一批问法。' + catHintText();
      $('btnWizard').textContent = '开始（约 ' + state.qs.length + ' 个问题）';
    }
    saveDraft();
  }

  function setVote(v) {
    var q = currentQ();
    state.fb.votes[q.key] = (state.fb.votes[q.key] === v) ? 0 : v;
    renderStep();
  }

  function init() {
    $('btnModeDev').addEventListener('click', function () { applyMode('dev', true); });
    $('btnModeZero').addEventListener('click', function () { applyMode('zero', true); });
    $('btnWizard').addEventListener('click', startWizard);
    $('btnClarify').addEventListener('click', startClarify);
    $('btnShuffle').addEventListener('click', shuffle);
    $('btnNext').addEventListener('click', nextStep);
    $('btnPrev').addEventListener('click', prevStep);
    $('btnCopy').addEventListener('click', copyOutput);
    $('btnReshuffle').addEventListener('click', shuffle);
    $('btnEdit').addEventListener('click', editResult);
    $('btnRestart').addEventListener('click', restart);
    $('btnAssemble').addEventListener('click', assembleFinal);
    $('btnFeedback').addEventListener('click', openFeedback);
    $('btnFeedbackFoot').addEventListener('click', openFeedback);
    $('btnUp').addEventListener('click', function () { setVote(1); });
    $('btnDown').addEventListener('click', function () { setVote(-1); });
    $('fbGood').addEventListener('click', function () { setOverall(3); });
    $('fbMid').addEventListener('click', function () { setOverall(2); });
    $('fbBad').addEventListener('click', function () { setOverall(1); });
    $('btnSaveFb').addEventListener('click', saveFeedback);
    $('btnCopyFb').addEventListener('click', copyFeedback);
    $('btnExportFb').addEventListener('click', exportFeedback);
    $('btnBackStart').addEventListener('click', function () { show('start'); });

    ['ex1', 'ex2', 'ex3'].forEach(function (id) {
      $(id).addEventListener('click', function () {
        state.idea = $(id).textContent;
        $('idea').value = state.idea;
        $('idea').focus();
        regenerate();
        $('catHint').textContent = catHintText();
        $('btnWizard').textContent = '开始（约 ' + state.qs.length + ' 个问题）';
        saveDraft();
      });
    });

    $('idea').addEventListener('input', function () {
      state.idea = ($('idea').value || '').trim();
      regenerate();
      $('catHint').textContent = catHintText();
      $('btnWizard').textContent = '开始（约 ' + state.qs.length + ' 个问题）';
    });

    loadDraft();
    applyMode(state.mode, false);
    $('idea').value = state.idea;
    regenerate();
    $('catHint').textContent = catHintText();
    $('btnWizard').textContent = '开始（约 ' + state.qs.length + ' 个问题）';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
