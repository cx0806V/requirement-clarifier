(function () {
  'use strict';

  // ============ 8 项追问（产品核心：一次一问 + 每题给推荐答案） ============
  var QUESTIONS = [
    {
      id: 1, dim: '可执行', required: true,
      title: '目标：这件事做完，你要拿到什么？',
      hint: '一句话说清。例：做一份介绍贵州的 10 页 PPT，给同学看。',
      options: ['写一份能直接交的文档', '做出能跑的代码/工具', '做一个别人能点开的页面', '整理一份能直接发出去的材料']
    },
    {
      id: 2, dim: '可执行', required: false,
      title: '受众：给谁看、谁会用？',
      hint: '受众决定语言、深度和语气。',
      options: ['老师/评委', '同学/朋友', '客户/老板', '就我自己用', '不确定，按最常见情况定']
    },
    {
      id: 3, dim: '可执行', required: false,
      title: '输入：你手上已经有哪些材料？',
      hint: '说「没有」也可以，但 AI 会更容易编。',
      options: ['没有，全靠 AI 生成', '我有零散的想法/笔记', '我有参考资料或链接', '我有现成的数据/文件', '我有旧版本，要改']
    },
    {
      id: 4, dim: '可执行', required: true,
      title: '交付物：要什么形式、多少量？',
      hint: '格式 + 数量越具体，AI 越不会跑偏。',
      options: ['PPT（写清页数）', '一段文案（写清字数）', '代码（写清语言和文件）', '表格/清单', '一段可以直接粘给 AI 的提示词']
    },
    {
      id: 5, dim: '可执行', required: false,
      title: '硬约束：有哪些不能违反的边界？',
      hint: '长度、时间、平台、工具、预算，能想到的都写上。',
      options: ['字数/页数有限制', '时间很紧（今晚/明天要）', '只能在手机上做', '必须离线/本地运行', '没有特别限制']
    },
    {
      id: 6, dim: '可验收', required: false,
      title: '反例：你最讨厌的失败长什么样？',
      hint: '反例比正例更能管住 AI。',
      options: ['空话套话、没有具体内容', '太长、太多页', '不是我要的格式', '编造事实/数据', '直接套模板，没有我的信息']
    },
    {
      id: 7, dim: '可验收', required: true,
      title: '验收标准：怎么算做好了？',
      hint: '写 3 条能打勾的判定。例：① 翻一遍不超过 3 分钟 ② 每个数字都有来源 ③ 能直接粘进 PPT',
      options: ['能直接交/直接发出去', '给 3 个人看，不用解释也看得懂', '每条内容都能找到出处', '运行一遍不报错', '不超过规定的长度']
    },
    {
      id: 8, dim: '可迭代', required: false,
      title: '迭代计划：第一版做到哪一步？',
      hint: '先说清「这次不做什么」，比说清「要做什么」更重要。',
      options: ['先做能交的 60 分版本，之后再说', '第一版就要 90 分，我时间够', '先做核心的一页，够用再加', '不知道，先给我一个最小版本']
    }
  ];

  var KEY = 'reqclarify_v01_draft';

  var state = { idea: '', answers: {}, index: 0, mode: 'wizard' };

  function $(id) { return document.getElementById(id); }

  // ============ 草稿保存 ============
  function saveDraft() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ idea: state.idea, answers: state.answers }));
    } catch (e) { /* 忽略 */ }
  }
  function loadDraft() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (!d) return;
      state.idea = d.idea || '';
      state.answers = d.answers || {};
      $('idea').value = state.idea;
    } catch (e) { /* 忽略 */ }
  }
  function clearDraft() {
    try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ }
  }

  // ============ 关键词智能提示 ============
  function keywordTip() {
    var s = (state.idea || '').toLowerCase();
    if (/ppt|幻灯片|演示|汇报/.test(s)) return '提示：检测到「PPT」——交付物记得写清页数和讲给谁。';
    if (/代码|程序|脚本|网页|工具|功能|bug/.test(s)) return '提示：检测到「代码」——硬约束建议写清语言、运行环境、哪些不能改。';
    if (/文案|文章|笔记|推文|公众号|小红书/.test(s)) return '提示：检测到「文案」——硬约束建议写清平台和字数。';
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
    var q = QUESTIONS[state.index];
    var ans = state.answers[q.id] || { choice: '', text: '' };

    $('bar').style.width = ((state.index + 1) / QUESTIONS.length * 100) + '%';
    $('stepMeta').textContent = '第 ' + (state.index + 1) + ' / ' + QUESTIONS.length + ' 步 · ' + q.dim;
    $('qTitle').textContent = q.title;

    var tip = '';
    if (state.index === 3 || state.index === 4) tip = keywordTip();
    var hint = q.hint + (tip ? ' ' + tip : '');
    $('qHint').textContent = hint;
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
    $('counter').textContent = q.required ? '这一项必填' : '可跳过';
    $('btnPrev').style.visibility = (state.index === 0) ? 'hidden' : 'visible';
    $('btnNext').textContent = (state.index === QUESTIONS.length - 1) ? '生成需求提示词' : '下一步';
  }

  function collectAnswer() {
    var q = QUESTIONS[state.index];
    var a = state.answers[q.id] || { choice: '', text: '' };
    a.text = ($('answer').value || '').trim();
    state.answers[q.id] = a;
    saveDraft();
    var has = (a.choice && a.choice.trim()) || (a.text && a.text.trim());
    if (q.required && !has) {
      $('qHint').textContent = '这一项是必填的：点一个推荐答案，或者用自己的话写。';
      $('qHint').className = 'hint warn';
      return false;
    }
    return true;
  }

  // ============ 生成「需求提示词」 ============
  function answerText(id) {
    var a = state.answers[id] || {};
    var parts = [];
    if (a.choice) parts.push(a.choice);
    if (a.text) parts.push(a.text);
    return parts.length ? parts.join('；') : '（未提供）';
  }

  function buildDemandPrompt() {
    return [
      '# 需求说明',
      '',
      '## 0. 我最初的想法',
      state.idea,
      '',
      '## 1. 目标',
      answerText(1),
      '',
      '## 2. 受众与使用场景',
      answerText(2),
      '',
      '## 3. 输入材料',
      answerText(3),
      '',
      '## 4. 交付物（格式 + 数量）',
      answerText(4),
      '',
      '## 5. 硬约束',
      answerText(5),
      '',
      '## 6. 明确不要（反例）',
      answerText(6),
      '',
      '## 7. 验收标准',
      answerText(7),
      '',
      '## 8. 迭代计划',
      answerText(8),
      '',
      '# 执行要求',
      '1. 请严格按照以上需求完成。',
      '2. 完成后先逐条对照「验收标准」自检，把自检结果列出来，再输出最终结果。',
      '3. 任何信息不足的地方，先向我确认，不要自行假设。',
      '',
      '# 自检清单（交付前逐条打勾）',
      '- [ ] 交付物符合第 4 项要求的格式和数量',
      '- [ ] 满足第 5 项里的全部硬约束',
      '- [ ] 没有出现第 6 项里明确不要的内容',
      '- [ ] 第 7 项验收标准每一条都能打勾'
    ].join('\n');
  }

  // ============ 生成「让 AI 来问我」的澄清提示词 ============
  function buildClarifyPrompt() {
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

  // ============ 结果显示 ============
  function showResult(title, text) {
    $('resultTitle').textContent = title;
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
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fallback);
    } else {
      fallback();
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
  }

  // ============ 事件绑定 ============
  function startWizard() {
    state.idea = ($('idea').value || '').trim();
    if (!state.idea) { alert('先在输入框写一句你要做的事，再开始。'); $('idea').focus(); return; }
    state.index = 0;
    state.mode = 'wizard';
    show('wizard');
    renderStep();
    saveDraft();
  }

  function startClarify() {
    state.idea = ($('idea').value || '').trim();
    if (!state.idea) { alert('先在输入框写一句你要做的事，再生成。'); $('idea').focus(); return; }
    saveDraft();
    showResult('让 AI 来问你的「澄清提示词」', buildClarifyPrompt());
    show('result');
  }

  function nextStep() {
    if (!collectAnswer()) return;
    if (state.index === QUESTIONS.length - 1) {
      showResult('你的需求提示词', buildDemandPrompt());
      show('result');
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

  function restart() {
    state.idea = '';
    state.answers = {};
    state.index = 0;
    $('idea').value = '';
    clearDraft();
    show('start');
  }

  // ============ 初始化 ============
  function init() {
    $('btnWizard').addEventListener('click', startWizard);
    $('btnClarify').addEventListener('click', startClarify);
    $('btnNext').addEventListener('click', nextStep);
    $('btnPrev').addEventListener('click', prevStep);
    $('btnCopy').addEventListener('click', copyOutput);
    $('btnRestart').addEventListener('click', restart);
    loadDraft();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
