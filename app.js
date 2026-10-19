(function () {
  'use strict';

  // ============ 8 项追问（2026-10-19 全部改成大白话） ============
  var QUESTIONS = [
    {
      id: 1, dim: '先定目标', short: '目标', required: true,
      title: '做完这件事，你想拿到什么？',
      hint: '一句话说清。例：做一份介绍贵州的 10 页 PPT，给同学看。',
      options: ['写一份能直接交的文档', '做出能跑的代码或工具', '做一个别人能点开的网页', '整理一份能直接发出去的材料']
    },
    {
      id: 2, dim: '先定目标', short: '给谁看', required: false,
      title: '做出来给谁看？谁会用？',
      hint: '给谁看，决定了 AI 用什么语气、说多深。',
      options: ['老师 / 评委', '同学 / 朋友', '客户 / 老板', '就我自己用', '不确定，按最常见的来']
    },
    {
      id: 3, dim: '先定目标', short: '现有材料', required: false,
      title: '你手上现在有什么材料？',
      hint: '说「没有」也行，但 AI 更容易乱编。',
      options: ['没有，全靠 AI 生成', '我有零散的想法或笔记', '我有参考资料或链接', '我有现成的数据或文件', '我有旧版本，要改']
    },
    {
      id: 4, dim: '要什么东西', short: '交付物', required: true,
      title: '最后要拿到什么？多少？',
      hint: '格式、数量越具体，AI 越不容易跑偏。',
      options: ['PPT（写清几页）', '一段文字（写清多少字）', '代码（写清用什么语言）', '表格 / 清单', '一段能直接发给 AI 的话']
    },
    {
      id: 5, dim: '要什么东西', short: '限制', required: false,
      title: '有什么限制不能违反？',
      hint: '字数、页数、时间、平台、预算，想到的都写上。',
      options: ['字数或页数有上限', '今晚 / 明天就要', '只能在手机上做', '必须离线用', '没有特别限制']
    },
    {
      id: 6, dim: '怎么算做好', short: '最怕的', required: false,
      title: '你最怕 AI 做成什么样？',
      hint: '说清最怕的，比说清想要的更管用。',
      options: ['全是空话，没有干货', '太长 / 页数太多', '不是我要的格式', '编数据、胡说', '套模板，没有我的信息']
    },
    {
      id: 7, dim: '怎么算做好', short: '算好的标准', required: true,
      title: '怎么算做好了？',
      hint: '写 3 条能打勾的。例：① 3 分钟能看完 ② 每个数字都有出处 ③ 能直接粘进 PPT',
      options: ['能直接交 / 直接发出去', '给 3 个人看，不用解释也懂', '每条内容都能找到出处', '跑一遍不报错', '不超过规定的长度']
    },
    {
      id: 8, dim: '分几步', short: '第一版', required: false,
      title: '第一版先做到哪一步？',
      hint: '先说清「这次不做什么」，比说清「要做什么」更重要。',
      options: ['先做能交的 60 分版本', '第一版就要 90 分，时间够', '先做核心的一页，够用再加', '不知道，先给我个最小版本']
    }
  ];

  // ============ 两种模式（2026-10-19 定：零基础 + 半开发者） ============
  var MODES = {
    dev: {
      label: '半开发者',
      qids: [1, 2, 3, 4, 5, 6, 7, 8],
      required: [1, 4, 7],
      output: 'structured',
      note: '半开发者版：问 8 个问题，最后给你一份结构化需求。'
    },
    zero: {
      label: '零基础',
      qids: [1, 2, 4, 6, 7],
      required: [1, 4, 7],
      output: 'plain',
      note: '零基础版：只问 5 个问题，每题都有现成答案，最后给你一段话。'
    }
  };

  var DRAFT_KEY = 'reqclarify_v01_draft';
  var MODE_KEY = 'reqclarify_v02_mode';

  var state = { idea: '', answers: {}, index: 0, mode: 'dev' };

  function $(id) { return document.getElementById(id); }
  function mode() { return MODES[state.mode]; }

  function qlist() {
    var out = [];
    mode().qids.forEach(function (id) {
      for (var i = 0; i < QUESTIONS.length; i++) {
        if (QUESTIONS[i].id === id) { out.push(QUESTIONS[i]); break; }
      }
    });
    return out;
  }

  function isRequired(q) { return mode().required.indexOf(q.id) !== -1; }

  // ============ 模式切换 ============
  function applyMode(name, persist) {
    state.mode = MODES[name] ? name : 'dev';
    var nodes = document.querySelectorAll('#modes .mode');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('on', nodes[i].getAttribute('data-mode') === state.mode);
    }
    $('modeNote').textContent = mode().note;
    $('btnWizard').textContent = '开始（一共 ' + mode().qids.length + ' 个问题）';
    if (persist) {
      try { localStorage.setItem(MODE_KEY, state.mode); } catch (e) { /* 忽略 */ }
    }
  }

  // ============ 草稿保存 ============
  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        idea: state.idea, answers: state.answers, mode: state.mode
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
      $('idea').value = state.idea;
    } catch (e) { /* 忽略 */ }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* 忽略 */ }
  }

  // ============ 关键词提示 ============
  function keywordTip() {
    var s = (state.idea || '').toLowerCase();
    if (/ppt|幻灯片|演示|汇报/.test(s)) return '提醒：这像是做 PPT——第 4 题记得写清几页、给谁看。';
    if (/代码|程序|脚本|网页|工具|功能|bug/.test(s)) return '提醒：这像是写代码——第 4 题记得写清用什么语言、要几个文件。';
    if (/文案|文章|笔记|推文|公众号|小红书/.test(s)) return '提醒：这像是写文案——第 4 题记得写清发在哪、多少字。';
    return '';
  }

  // ============ 页面切换 ============
  function show(id) {
    ['start', 'wizard', 'result'].forEach(function (s) {
      $(s).classList.toggle('hidden', s !== id);
    });
  }

  // ============ 向导渲染 ============
  function renderStep() {
    var list = qlist();
    var q = list[state.index];
    if (!q) { state.index = 0; q = list[0]; }
    var ans = state.answers[q.id] || { choice: '', text: '' };

    $('bar').style.width = ((state.index + 1) / list.length * 100) + '%';
    $('stepMeta').textContent = mode().label + '版 · 第 ' + (state.index + 1) + ' / ' + list.length + ' 步 · ' + q.dim;
    $('qTitle').textContent = q.title;

    var tip = (q.id === 4) ? keywordTip() : '';
    $('qHint').textContent = q.hint + (tip ? ' ' + tip : '');
    $('qHint').className = 'hint' + (tip ? ' tip' : '');

    var box = $('options');
    box.innerHTML = '';
    q.options.forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (ans.choice === opt ? ' on' : '');
      b.textContent = opt;
      b.addEventListener('click', function () {
        var cur = state.answers[q.id] || { choice: '', text: '' };
        cur.choice = (cur.choice === opt) ? '' : opt;
        state.answers[q.id] = cur;
        renderStep();
        saveDraft();
      });
      box.appendChild(b);
    });

    $('answer').value = ans.text || '';
    $('counter').textContent = isRequired(q) ? '这一项必填' : '可跳过';
    $('btnPrev').style.visibility = (state.index === 0) ? 'hidden' : 'visible';
    $('btnNext').textContent = (state.index === list.length - 1) ? '生成' : '下一步';
  }

  function collectAnswer() {
    var list = qlist();
    var q = list[state.index];
    var a = state.answers[q.id] || { choice: '', text: '' };
    a.text = ($('answer').value || '').trim();
    state.answers[q.id] = a;
    saveDraft();
    var has = (a.choice && a.choice.trim()) || (a.text && a.text.trim());
    if (isRequired(q) && !has) {
      $('qHint').textContent = '这一项必须填：点一个上面的推荐答案，或者用自己的话写一句。';
      $('qHint').className = 'hint warn';
      return false;
    }
    return true;
  }

  // ============ 生成内容 ============
  function answerText(id) {
    var a = state.answers[id] || {};
    var parts = [];
    if (a.choice) parts.push(a.choice);
    if (a.text) parts.push(a.text);
    return parts.length ? parts.join('；') : '（未提供）';
  }

  function answered(id) {
    var a = state.answers[id] || {};
    var hasChoice = !!(a.choice && a.choice.trim());
    var hasText = !!(a.text && a.text.trim());
    return hasChoice || hasText;
  }

  function buildStructuredPrompt() {
    return [
      '# 需求说明',
      '',
      '## 0. 我最初的想法',
      state.idea,
      '',
      '## 1. 目标',
      answerText(1),
      '',
      '## 2. 给谁看、谁会用',
      answerText(2),
      '',
      '## 3. 手上已有的材料',
      answerText(3),
      '',
      '## 4. 交付物（形式 + 数量）',
      answerText(4),
      '',
      '## 5. 不能违反的限制',
      answerText(5),
      '',
      '## 6. 明确不要（我最怕的）',
      answerText(6),
      '',
      '## 7. 怎样算做好了',
      answerText(7),
      '',
      '## 8. 第一版做到哪一步',
      answerText(8),
      '',
      '# 执行要求',
      '1. 请严格按照以上需求完成。',
      '2. 完成后先逐条对照「怎样算做好了」自检，把自检结果列出来，再输出最终结果。',
      '3. 任何信息不足的地方，先向我确认，不要自行假设。',
      '',
      '# 自检清单（交付前逐条打勾）',
      '- [ ] 交付物符合第 4 项要求的格式和数量',
      '- [ ] 满足第 5 项里的全部限制',
      '- [ ] 没有出现第 6 项里明确不要的内容',
      '- [ ] 第 7 项「怎样算做好了」每一条都能打勾'
    ].join('\n');
  }

  function buildPlainPrompt() {
    return [
      '# 我想让 AI 帮我做的事',
      '',
      state.idea,
      '',
      '## 具体一点',
      answerText(1),
      '',
      '## 做出来给谁看',
      answerText(2),
      '',
      '## 最后我要拿到什么',
      answerText(4),
      '',
      '## 我最不想要的结果',
      answerText(6),
      '',
      '## 怎样算做好了',
      answerText(7),
      '',
      '# 请 AI 这样做',
      '1. 先把你的理解用一两句话复述给我，确认没理解错再开始。',
      '2. 做完之后，对照上面「怎样算做好了」一条条检查，把检查结果告诉我。',
      '3. 有不清楚的地方先问我，不要自己猜。',
      '',
      '# 交付前自检（逐条打勾）',
      '- [ ] 拿到的东西就是我上面说的那样',
      '- [ ] 没有出现我明确不想要的内容',
      '- [ ] 「怎样算做好了」每一条都能打勾'
    ].join('\n');
  }

  function buildOutput() {
    return mode().output === 'plain' ? buildPlainPrompt() : buildStructuredPrompt();
  }

  function buildClarifyPrompt() {
    if (state.mode === 'zero') {
      return [
        '你是我的需求澄清助手。我先给你一段很模糊的想法，你要在动手之前，帮我把需求问清楚。',
        '',
        '规则：',
        '1. 一次只问一个问题，等我回答完再问下一个，不要一次问一堆。',
        '2. 每个问题都直接给我 2-3 个现成的答案让我选，我不想自己想。',
        '3. 能从我上面的话里猜出来的，先给个默认答案让我确认，不要重复问。',
        '4. 下面这 5 件事没问清楚之前，不许开始干活。',
        '',
        '要问的 5 件事：',
        '1. 做完之后你想拿到什么？',
        '2. 做出来给谁看？',
        '3. 最后要拿到什么形式的东西？要多少？',
        '4. 你最不想要的结果是什么？',
        '5. 怎样算做好了？请给我 3 条能打勾的标准，让我确认。',
        '',
        '问完之后，把答案整理成一段话给我确认，再开始做。',
        '',
        '我的想法是：',
        '"""',
        state.idea,
        '"""'
      ].join('\n');
    }
    return [
      '你是我的需求澄清助手。我先给你一段很模糊的想法，你要在动手之前，帮我把需求问清楚。',
      '',
      '规则：',
      '1. 一次只问一个问题，等我回答完再问下一个，不要一次抛出多个问题。',
      '2. 每个问题都给我 2-3 个推荐答案，让我点选或补充。',
      '3. 能从我上面的话里推断出来的，先给默认值让我确认，不要重复问。',
      '4. 第 1、4、7 项没问清楚之前，不许开始干活。',
      '',
      '按这 8 项依次问我：',
      '1. 目标：做完之后我要拿到什么？',
      '2. 受众：给谁看、谁会用？',
      '3. 输入：我手上有哪些材料？',
      '4. 交付物：要什么形式、多少量？',
      '5. 硬约束：长度、时间、平台有什么限制？',
      '6. 反例：我最讨厌的失败长什么样？',
      '7. 验收标准：怎么算做好了？写 3 条能打勾的。',
      '8. 迭代计划：第一版先做到哪一步，下一版改什么？',
      '',
      '问完之后，把答案整理成一段结构化的需求提示词给我，并附上验收自检清单；',
      '任何信息不足的地方，先问我，不要自行假设。',
      '',
      '我的想法是：',
      '"""',
      state.idea,
      '"""'
    ].join('\n');
  }

  // ============ 结果页 ============
  function gapsText() {
    var list = qlist();
    var missing = [];
    list.forEach(function (q) { if (!answered(q.id)) missing.push(q.short); });
    if (!missing.length) return '这 ' + list.length + ' 项都填了，AI 基本不用再追问。';
    return '已填 ' + (list.length - missing.length) + ' / ' + list.length + ' 项。AI 可能还会追问：' + missing.join('、') + '。';
  }

  function showResult(title, text, withGaps) {
    $('resultTitle').textContent = title;
    $('gaps').textContent = withGaps ? gapsText() : '';
    $('output').textContent = text;
    $('copyMsg').classList.add('hidden');
    show('result');
  }

  function copyOutput() {
    var text = $('output').textContent || '';
    function ok() {
      $('copyMsg').classList.remove('hidden');
      setTimeout(function () { $('copyMsg').classList.add('hidden'); }, 1800);
    }
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

  // ============ 事件绑定 ============
  function startWizard() {
    state.idea = ($('idea').value || '').trim();
    if (!state.idea) { alert('先在输入框写一句你要做的事，再开始。'); $('idea').focus(); return; }
    state.index = 0;
    show('wizard');
    renderStep();
    saveDraft();
  }

  function startClarify() {
    state.idea = ($('idea').value || '').trim();
    if (!state.idea) { alert('先在输入框写一句你要做的事，再生成。'); $('idea').focus(); return; }
    saveDraft();
    showResult('让 AI 来问你（复制给豆包 / DeepSeek）', buildClarifyPrompt(), false);
  }

  function nextStep() {
    if (!collectAnswer()) return;
    var list = qlist();
    if (state.index === list.length - 1) {
      showResult('生成好了，直接复制给 AI', buildOutput(), true);
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
    state.index = qlist().length - 1;
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

  // ============ 初始化 ============
  function init() {
    var modeBtns = document.querySelectorAll('#modes .mode');
    for (var i = 0; i < modeBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          applyMode(btn.getAttribute('data-mode'), true);
        });
      })(modeBtns[i]);
    }

    var exBtns = document.querySelectorAll('#examples .ex');
    for (var j = 0; j < exBtns.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          state.idea = btn.textContent;
          $('idea').value = state.idea;
          $('idea').focus();
          saveDraft();
        });
      })(exBtns[j]);
    }

    $('btnWizard').addEventListener('click', startWizard);
    $('btnClarify').addEventListener('click', startClarify);
    $('btnNext').addEventListener('click', nextStep);
    $('btnPrev').addEventListener('click', prevStep);
    $('btnCopy').addEventListener('click', copyOutput);
    $('btnEdit').addEventListener('click', editResult);
    $('btnRestart').addEventListener('click', restart);

    loadDraft();
    applyMode(state.mode, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
