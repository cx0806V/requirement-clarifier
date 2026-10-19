// 需求澄清器 · 题库（v0.3）
// 规则式个性化：按需求类型组装问题；以后接大模型时，只需要替换这里的 build()。
var REQ_BANK = (function () {
  'use strict';

  var CATEGORIES = [
    { key: 'ppt', label: 'PPT 或汇报', kw: /ppt|幻灯片|演示|汇报|答辩|演讲|路演|讲义/i },
    { key: 'code', label: '代码或工具', kw: /代码|程序|脚本|爬虫|网页|网站|工具|接口|数据库|算法|bug|python|java|javascript|html|css/i },
    { key: 'copy', label: '文案或内容', kw: /文案|文章|笔记|推文|公众号|小红书|抖音|标题|朋友圈|作文|宣传|口播|脚本/i },
    { key: 'table', label: '表格或数据', kw: /表格|excel|数据|清单|汇总|统计|报表|图表/i },
    { key: 'study', label: '学习或计划', kw: /学习|复习|计划|考试|课程|资料|雅思|英语|备考|书单|安排/i },
    { key: 'life', label: '生活或沟通', kw: /请假|申请|通知|消息|回复|邮件|简历|介绍|发言|总结|报告|道歉|邀请/i }
  ];
  var GENERAL = { key: 'general', label: '通用' };

  function detect(text) {
    var s = String(text || '');
    for (var i = 0; i < CATEGORIES.length; i += 1) {
      if (CATEGORIES[i].kw.test(s)) return CATEGORIES[i].key;
    }
    return 'general';
  }

  function labelOf(key) {
    if (key === 'general') return GENERAL.label;
    for (var i = 0; i < CATEGORIES.length; i += 1) {
      if (CATEGORIES[i].key === key) return CATEGORIES[i].label;
    }
    return GENERAL.label;
  }

  function clone(q) {
    return {
      key: q.key, dim: q.dim, short: q.short, required: !!q.required,
      title: q.title, hint: q.hint, options: q.options.slice()
    };
  }

  // salt 变化 = 换一批问法
  function variant(q, salt) {
    var out = clone(q);
    if (salt % 2 === 1 && q.alt) {
      if (q.alt.title) out.title = q.alt.title;
      if (q.alt.hint) out.hint = q.alt.hint;
      if (q.alt.options) out.options = q.alt.options.slice();
    }
    return out;
  }

  // ---------- 基础题（所有需求都有） ----------
  var BASE = [
    {
      key: 'goal', dim: '先定目标', short: '目标', required: true,
      title: '做完这件事，你想拿到什么？',
      hint: '一句话说清。例：做一份介绍贵州的 10 页 PPT，给同学看。',
      options: ['写一份能直接交的文档', '做出能跑的代码或工具', '做一个别人能点开的网页', '整理一份能直接发出去的材料'],
      alt: {
        title: '这件事做完，你手里会多出什么？',
        options: ['一份能交的东西', '一个能用的工具', '一份能发出去的稿子', '还没想好，先帮我理清']
      }
    },
    {
      key: 'audience', dim: '先定目标', short: '给谁看', required: false,
      title: '做出来给谁看？谁会用？',
      hint: '给谁看，决定了 AI 用什么语气、说多深。',
      options: ['老师 / 评委', '同学 / 朋友', '客户 / 老板', '就我自己用', '不确定，按最常见的来'],
      alt: {
        title: '这东西最后会落到谁手里？',
        options: ['交作业 / 比赛那边', '群里的人', '要给我以外的人用', '自己用', '没想好']
      }
    },
    {
      key: 'deliverable', dim: '要什么东西', short: '交付物', required: true,
      title: '最后要拿到什么？多少？',
      hint: '格式、数量越具体，AI 越不容易跑偏。',
      options: ['一段文字（写清多少字）', 'PPT（写清几页）', '代码（写清用什么语言）', '表格 / 清单', '一段能直接发给 AI 的话'],
      alt: {
        title: '你要的成品长什么样？',
        options: ['文档 / 文字', 'PPT / 演示', '能跑的程序', '表格 / 清单', '还没想好']
      }
    }
  ];

  var ANTI = {
    key: 'anti', dim: '怎么算做好', short: '最怕的', required: false,
    title: '你最怕 AI 做成什么样？',
    hint: '说清最怕的，比说清想要的更管用。',
    options: ['全是空话，没有干货', '太长 / 页数太多', '不是我要的格式', '编数据、胡说', '套模板，没有我的信息'],
    alt: {
      title: '最不想看到哪种结果？',
      options: ['空洞没内容', '又长又啰嗦', '格式不对', '乱编事实', '一看就是模板']
    }
  };

  var ACCEPT = {
    key: 'accept', dim: '怎么算做好', short: '算好的标准', required: true,
    title: '怎么算做好了？',
    hint: '写 3 条能打勾的。例：① 3 分钟能看完 ② 每个数字都有出处 ③ 能直接粘进 PPT',
    options: ['能直接交 / 直接发出去', '给 3 个人看，不用解释也懂', '每条内容都能找到出处', '跑一遍不报错', '不超过规定的长度'],
    alt: {
      title: '拿到的成果，怎么判断合格？',
      options: ['能直接用，不用再改', '别人一看就懂', '关键说法都有依据', '能正常运行', '长度/篇幅正好']
    }
  };

  var ITER = {
    key: 'iter', dim: '分几步', short: '第一版', required: false,
    title: '第一版先做到哪一步？',
    hint: '先说清「这次不做什么」，比说清「要做什么」更重要。',
    options: ['先做能交的 60 分版本', '第一版就要 90 分，时间够', '先做核心的一页，够用再加', '不知道，先给我个最小版本'],
    alt: {
      title: '这次先做到什么程度？',
      options: ['能交就先交', '一次做到位', '先做核心部分', '你按最快的来']
    }
  };

  // ---------- 类别专属题（2–3 个，带换一批的备选问法） ----------
  var CAT = {
    ppt: [
      {
        key: 'ppt_pages', dim: '要什么东西', short: '页数', required: false,
        title: 'PPT 大概要做多少页？要讲几分钟？',
        hint: '页数决定信息密度。',
        options: ['5–8 页，讲 3–5 分钟', '10 页左右，讲 8–10 分钟', '15–20 页，讲 15 分钟以上', '没定，按内容来'],
        alt: { title: '这份 PPT 要讲多久、多少页合适？', options: ['3 分钟以内，3–5 页', '5–8 分钟，8–10 页', '10 分钟以上，15 页+', '没定，你建议'] }
      },
      {
        key: 'ppt_style', dim: '要什么东西', short: '风格', required: false,
        title: '想要什么风格？有没有参考？',
        hint: '例：简洁蓝色系 / 学校模板 / 一个参考链接。',
        options: ['简洁、字少图多', '正式、学术一点', '活泼、适合给同学看', '用学校 / 比赛指定模板', '没想法，你定'],
        alt: { title: '有没有喜欢的模板或风格？', options: ['清爽简洁风', '商务正式风', '活泼创意风', '没有，你推荐'] }
      },
      {
        key: 'ppt_data', dim: '要什么东西', short: '数据/例子', required: false,
        title: '要不要放数据、图表或真实案例？',
        hint: '先说清有没有现成数据，避免 AI 编。',
        options: ['没有数据，别硬编', '我有数据，会另外提供', '放几个公开数据就行', '不需要数据和案例'],
        alt: { title: '内容里要不要数据 / 图表 / 案例？', options: ['不用', '要，用公开数据', '要，我提供数据', '你看着办'] }
      }
    ],
    code: [
      {
        key: 'code_lang', dim: '要什么东西', short: '语言/环境', required: false,
        title: '用什么语言、什么环境跑？',
        hint: '例：Python 3.12 / 浏览器网页 / 安卓手机。',
        options: ['Python 脚本', '网页（HTML/CSS/JS）', 'Java / C++ 作业', '不限制，能用就行'],
        alt: { title: '代码跑在哪儿？', options: ['本机命令行', '浏览器网页', '手机 App', '你挑一个简单的'] }
      },
      {
        key: 'code_io', dim: '要什么东西', short: '输入输出', required: false,
        title: '输入和输出分别是什么？',
        hint: '例：读一个 CSV → 输出统计图。',
        options: ['从文件 / 表格读数据', '从网页抓取内容', '用户手动输入', '没有输入，直接生成'],
        alt: { title: '它要处理什么数据？', options: ['本地文件', '网络数据', '手动输入', '我不确定'] }
      },
      {
        key: 'code_accept', dim: '要什么东西', short: '怎么算跑通', required: false,
        title: '怎么算跑通了？',
        hint: '例：运行不报错 + 输出符合预期 + 有 README。',
        options: ['能跑，不报错', '能跑 + 输出对', '能跑 + 有说明文档', '能装到别人电脑上运行'],
        alt: { title: '交付时要能做到哪一步？', options: ['命令行能跑', '双击能运行', '发给别人也能跑', '能演示就行'] }
      }
    ],
    copy: [
      {
        key: 'copy_platform', dim: '要什么东西', short: '平台/字数', required: false,
        title: '发在哪个平台？大概多少字？',
        hint: '平台决定风格和篇幅。',
        options: ['公众号 / 长文（800 字+）', '小红书 / 抖音（短、口语）', '朋友圈 / 群消息（几句话）', '作业 / 比赛稿件', '还没定'],
        alt: { title: '这段文字最后发在哪？', options: ['长文平台', '短视频文案', '群 / 朋友圈', '交作业', '没定'] }
      },
      {
        key: 'copy_tone', dim: '要什么东西', short: '语气', required: false,
        title: '想要什么语气？',
        hint: '不同的语气，差别很大。',
        options: ['正式、书面', '轻松、像聊天', '有感染力、带情绪', '中性、客观'],
        alt: { title: '希望读起来是什么感觉？', options: ['专业可信', '亲切好读', '有情绪、有共鸣', '平实客观'] }
      },
      {
        key: 'copy_target', dim: '要什么东西', short: '读者', required: false,
        title: '写给谁看、希望他们看完做什么？',
        hint: '「让人愿意看完」和「让人下单」是两种写法。',
        options: ['让老师 / 评委认可', '让同学愿意看完', '让客户下单 / 联系', '让陌生人转发', '没想好'],
        alt: { title: '这篇东西想达成什么效果？', options: ['通过 / 拿分', '有人看完', '带来客户', '被转发', '没想好'] }
      }
    ],
    table: [
      {
        key: 'table_fields', dim: '要什么东西', short: '字段', required: false,
        title: '表格要哪些列（字段）？',
        hint: '例：日期 / 金额 / 备注。写在下面也可以。',
        options: ['我列一下（写在下面）', '按常见的来', '不知道，你建议', '只要汇总结果'],
        alt: { title: '这张表要有哪些信息？', options: ['我会写在下面', '你按常见的设计', '不确定', '只要结果数字'] }
      },
      {
        key: 'table_source', dim: '要什么东西', short: '数据来源', required: false,
        title: '数据从哪来？',
        hint: '没有数据就让 AI 造样例，别让它编成真的。',
        options: ['我有现成数据，会粘贴 / 上传', '要 AI 造示例数据', '从网上找公开数据', '手动填几行'],
        alt: { title: '表格里的数据怎么来？', options: ['我有数据', '让 AI 编示例', '网上找', '我自己填'] }
      }
    ],
    study: [
      {
        key: 'study_goal', dim: '要什么东西', short: '学到什么程度', required: false,
        title: '想达到什么程度？',
        hint: '「看过」和「能讲出来」是完全不同的要求。',
        options: ['看完 / 了解就行', '能讲清楚给别人听', '能通过考试 / 测试', '能动手做出来'],
        alt: { title: '学完要能做到什么？', options: ['知道大概', '能讲出来', '能考过', '能动手做'] }
      },
      {
        key: 'study_time', dim: '要什么东西', short: '时间', required: false,
        title: '什么时候要用？每天能花多少时间？',
        hint: '时间决定计划的密度。',
        options: ['这周就要', '一个月内', '长期（3 个月+）', '没定'],
        alt: { title: '这个计划要在多久内完成？', options: ['几天内', '几周内', '几个月', '没定'] }
      }
    ],
    life: [
      {
        key: 'life_target', dim: '要什么东西', short: '发给谁', required: false,
        title: '这条消息 / 申请是发给谁的？',
        hint: '对象决定称呼和正式程度。',
        options: ['老师', '领导 / 同事', '家人', '朋友 / 同学', '不特定的人'],
        alt: { title: '要写给谁？', options: ['学校老师', '工作上的', '家里长辈', '朋友', '陌生人'] }
      },
      {
        key: 'life_tone', dim: '要什么东西', short: '语气', required: false,
        title: '要什么语气、大概多长？',
        hint: '例：客气正式、300 字以内。',
        options: ['客气正式', '简单直接', '恳切一点', '轻松口语'],
        alt: { title: '希望对方看完是什么感受？', options: ['正式得体', '干脆不啰嗦', '诚恳', '轻松'] }
      }
    ],
    general: [
      {
        key: 'gen_constraint', dim: '要什么东西', short: '限制', required: false,
        title: '有什么限制不能违反？',
        hint: '字数、页数、时间、平台、预算。',
        options: ['字数或页数有上限', '时间很紧（今晚 / 明天要）', '只能在手机上做', '没有特别限制'],
        alt: { title: '有什么硬性条件？', options: ['篇幅有限', '时间很急', '设备有限', '没什么限制'] }
      },
      {
        key: 'gen_example', dim: '要什么东西', short: '参考例子', required: false,
        title: '有没有参考例子或旧版本？',
        hint: '有参考就贴给他，AI 会更像你要的。',
        options: ['没有，全靠 AI 想', '有参考链接 / 图片', '有旧版本，要改', '有样品 / 模板'],
        alt: { title: '手上有能参考的东西吗？', options: ['没有', '有链接', '有旧版', '有模板'] }
      }
    ]
  };

  // ---------- 组装 ----------
  function build(idea, mode, salt) {
    salt = salt || 0;
    var cat = detect(idea);
    var catQs = (CAT[cat] || CAT.general).map(function (q) { return variant(q, salt); });
    var qs = [];
    var zero = mode === 'zero';
    qs.push(variant(BASE[0], salt), variant(BASE[1], salt));
    qs.push(variant(BASE[2], salt));
    if (zero) {
      if (catQs.length) qs.push(catQs[salt % catQs.length]);
      qs.push(variant(ACCEPT, salt));
      qs = qs.slice(0, 5);
    } else {
      var take = Math.min(2, catQs.length);
      var start = salt % catQs.length;
      for (var i = 0; i < take; i += 1) qs.push(catQs[(start + i) % catQs.length]);
      qs.push(variant(ANTI, salt), variant(ACCEPT, salt));
      if (qs.length < 8) qs.push(variant(ITER, salt));
      if (qs.length > 8) qs = qs.slice(0, 8);
    }
    qs.forEach(function (q, i) { q.idx = i; });
    return { category: cat, label: labelOf(cat), questions: qs };
  }

  return { detect: detect, labelOf: labelOf, build: build, CATEGORIES: CATEGORIES };
})();

if (typeof window !== 'undefined') { window.ReqBank = REQ_BANK; }
