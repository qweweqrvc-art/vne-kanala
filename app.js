'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/* ---------- toast ---------- */
let toastTimer = null;

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-show'), 3200);
}

/* ---------- reveal on scroll ---------- */
(function setupReveal() {
  const elements = $$('[data-reveal]');
  if (!elements.length) return;

  if (!('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  elements.forEach((el) => observer.observe(el));
})();

/* ---------- sticky header ---------- */
const topbar = $('.topbar');

function updateTopbar() {
  if (!topbar) return;
  topbar.classList.toggle('is-scrolled', window.scrollY > 12);
}

window.addEventListener('scroll', updateTopbar, { passive: true });
updateTopbar();

/* ---------- mobile nav ---------- */
const nav = $('#siteNav');
const navToggle = $('#navToggle');

function closeNav() {
  if (!nav || !navToggle) return;
  nav.classList.remove('is-open');
  navToggle.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
}

if (nav && navToggle) {
  navToggle.addEventListener('click', () => {
    const isOpen = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', isOpen);
    navToggle.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('nav-open', isOpen);
  });

  $$('a', nav).forEach((link) => link.addEventListener('click', closeNav));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNav();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeNav();
  });
}

/* ---------- copy helper ---------- */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    } catch (fallbackError) {
      return false;
    }
  }
}

/* ---------- quiz ---------- */
const quizQuestions = [
  'Я проверяю закрытый канал чаще, чем личные сообщения.',
  'Мне важно знать, что обсуждают «свои», даже если это меня не касается.',
  'Я пересылал(а) чужие сообщения или скриншоты «только для своих».',
  'После чтения канала я чаще чувствую тревогу или раздражение, чем спокойствие.',
  'Я обсуждаю людей в канале, но не сказал(а) бы им это лично.',
  'Мне страшно выйти из канала, потому что я потеряю доступ к важному.'
];

const quizForm = $('#quizForm');
const quizResult = $('#quizResult');
const quizSubmit = quizForm ? $('.quiz__submit', quizForm) : null;

function showQuizResult(score) {
  const total = quizQuestions.length;
  quizForm.hidden = true;
  quizResult.hidden = false;

  const scoreEl = $('#quizScore');
  if (scoreEl) scoreEl.textContent = `${score} / ${total}`;

  const bar = $('#quizBar');
  if (bar) {
    bar.style.width = '0%';
    requestAnimationFrame(() => {
      bar.style.width = `${(score / total) * 100}%`;
    });
  }

  let title = '';
  let text = '';

  if (score <= 1) {
    title = 'Канал пока у тебя под контролем.';
    text = 'Ты заходишь туда, а не живёшь там. Но привычка растёт незаметно: проверь, зачем ты возвращаешься.';
  } else if (score <= 3) {
    title = 'Есть зона риска.';
    text = 'Ты ещё выбираешь, но канал уже тянет одеяло на себя. Попробуй неделю без уведомлений — и посмотри, что изменится.';
  } else {
    title = 'Похоже, канал стал твоей средой.';
    text = 'Это не приговор. Начни с малого: 48 часов тишины, один личный разговор вместо обсуждения и один вопрос к себе: «мне здесь правда важно?»';
  }

  const titleEl = $('#quizVerdictTitle');
  const textEl = $('#quizVerdictText');
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;

  quizResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

if (quizForm && quizResult && quizSubmit) {
  quizQuestions.forEach((questionText, index) => {
    const row = document.createElement('div');
    row.className = 'q';

    const question = document.createElement('span');
    question.className = 'q__text';
    question.textContent = `${index + 1}. ${questionText}`;

    const options = document.createElement('span');
    options.className = 'q__opts';

    [['1', 'да'], ['0', 'нет']].forEach(([value, label]) => {
      const option = document.createElement('label');
      option.className = 'opt';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `q${index}`;
      input.value = value;

      const ui = document.createElement('span');
      ui.textContent = label;

      option.append(input, ui);
      options.append(option);
    });

    row.append(question, options);
    quizForm.insertBefore(row, quizSubmit);
  });

  quizForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const answers = [];
    const rows = $$('.q', quizForm);
    let firstMissing = null;

    for (let index = 0; index < quizQuestions.length; index += 1) {
      const checked = quizForm.querySelector(`input[name="q${index}"]:checked`);

      if (!checked) {
        const row = rows[index];
        row.classList.add('is-missing');
        if (!firstMissing) firstMissing = row;
        setTimeout(() => row.classList.remove('is-missing'), 900);
      } else {
        answers.push(Number(checked.value));
      }
    }

    if (firstMissing) {
      toast('Ответь на все вопросы — это займёт минуту');
      firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const score = answers.reduce((sum, value) => sum + value, 0);
    showQuizResult(score);
  });

  const retry = $('#quizRetry');
  if (retry) {
    retry.addEventListener('click', () => {
      quizForm.reset();
      quizForm.hidden = false;
      quizResult.hidden = true;
      const bar = $('#quizBar');
      if (bar) bar.style.width = '0%';
      quizForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

/* ---------- checklist ---------- */
const CHECKLIST_KEY = 'vne-kanala/checklist/v1';
const checkboxes = $$('#checklist input[type="checkbox"]');

function readChecklist() {
  try {
    return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function saveChecklist() {
  const data = {};
  checkboxes.forEach((box) => {
    data[box.dataset.check] = box.checked;
  });
  try {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(data));
  } catch (error) {
    /* localStorage может быть недоступен — сайт продолжит работать без сохранения */
  }
}

function updateChecklist() {
  if (!checkboxes.length) return;

  const done = checkboxes.filter((box) => box.checked).length;
  const total = checkboxes.length;

  const bar = $('#checklistBar');
  if (bar) bar.style.width = `${(done / total) * 100}%`;

  const count = $('#checklistCount');
  if (count) count.textContent = `${done} из ${total}`;

  saveChecklist();
}

if (checkboxes.length) {
  const saved = readChecklist();
  checkboxes.forEach((box) => {
    box.checked = Boolean(saved[box.dataset.check]);
    box.addEventListener('change', updateChecklist);
  });
  updateChecklist();

  const copyButton = $('#copyChecklist');
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const lines = ['Чек-лист «неделя вне шёпота»', ''];
      checkboxes.forEach((box, index) => {
        const label = box.closest('label');
        const text = label ? label.querySelector('.txt')?.textContent.trim() : '';
        lines.push(`${box.checked ? '[x]' : '[ ]'} ${index + 1}. ${text}`);
      });
      const copied = await copyText(lines.join('\n'));
      toast(copied ? 'Чек-лист скопирован' : 'Не удалось скопировать — выдели текст вручную');
    });
  }

  const resetButton = $('#resetChecklist');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      checkboxes.forEach((box) => { box.checked = false; });
      updateChecklist();
      toast('Чек-лист сброшен');
    });
  }
}

/* ---------- share ---------- */
const shareButton = $('#shareBtn');

if (shareButton) {
  shareButton.addEventListener('click', async () => {
    const data = {
      title: 'Вне канала',
      text: 'Закрытый канал не делает тебя избранным. Он делает тебя изолированным.',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }

    const copied = await copyText(window.location.href);
    toast(copied ? 'Ссылка скопирована' : 'Скопируй адрес из строки браузера');
  });
}
