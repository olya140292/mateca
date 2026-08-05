/* ═══════════════════════════════════════════════════════════════
   Школа Седы Каспаровой — интеракции
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse  = matchMedia('(hover: none)').matches;

  /* ─────────────────────────────────────────────────────────────
     1. Инерционный скролл (lerp)
     ───────────────────────────────────────────────────────────── */
  const wrap    = document.getElementById('smooth-wrap');
  const content = document.getElementById('smooth-content');

  let target = 0;      // куда скроллит браузер
  let current = 0;     // где реально стоит контент
  let smooth = false;

  function setBodyHeight() {
    wrap.style.height = content.getBoundingClientRect().height + 'px';
  }

  function initSmooth() {
    if (reduced || coarse) return;
    smooth = true;
    document.body.classList.add('smooth');
    setBodyHeight();
    current = target = window.scrollY;
    content.style.transform = `translate3d(0, ${-current}px, 0)`;
    new ResizeObserver(setBodyHeight).observe(content);
  }

  let lastY = null;

  function raf() {
    if (smooth) {
      target = window.scrollY;
      // 0.085 — «тяжесть» скролла: сглаживает ступенчатые тики колеса
      current += (target - current) * 0.085;
      if (Math.abs(target - current) < 0.03) current = target;
      const y = Math.round(current * 100) / 100;
      if (y !== lastY) {
        lastY = y;
        content.style.transform = `translate3d(0, ${-y}px, 0)`;
      }
    }
    onScrollFrame(smooth ? current : window.scrollY);
    requestAnimationFrame(raf);
  }

  /* ─────────────────────────────────────────────────────────────
     2. Хедер → плавающая «таблетка»
     ───────────────────────────────────────────────────────────── */
  const header = document.getElementById('header');
  const inner  = document.getElementById('hdrInner');
  let pillOn = false;

  function measurePill() {
    const mark = inner.querySelector('.hdr-mark');
    const nav  = inner.querySelector('.hdr-nav');
    const cta  = inner.querySelector('.hdr-cta > *');
    if (!mark || !nav || !cta) return;

    const navW  = nav.offsetWidth;
    const btnW  = cta.offsetWidth + 8;   // в таблетке padding 18→22
    const MARK  = 22.3;                  // уменьшенный знак
    const AIR   = 22;                    // воздух вокруг меню
    const PAD_L = 18, PAD_R = 8;

    const navLeft = PAD_L + MARK + AIR;                       // отступ меню в таблетке
    const pillW   = navLeft + navW + AIR + btnW + PAD_R;

    header.style.setProperty('--pill-w', pillW + 'px');
    header.style.setProperty('--nav-ml', (-navW / 2) + 'px'); // по центру полосы
    header.style.setProperty('--nav-ml-pill', (navLeft - pillW / 2) + 'px');
  }

  function updateHeader(y) {
    const next = y > 120;
    if (next !== pillOn) {
      pillOn = next;
      header.classList.toggle('is-pill', next);
    }
  }

  /* ─────────────────────────────────────────────────────────────
     3. Появление блоков
     ───────────────────────────────────────────────────────────── */
  let pending = [];

  function initReveal() {
    const items = [...document.querySelectorAll('.reveal')];
    if (reduced) { items.forEach(el => el.classList.add('in')); return; }
    pending = items;

    // первый экран — по загрузке, без ожидания скролла
    requestAnimationFrame(() => {
      document.querySelectorAll('.hero-anim').forEach(el => el.classList.add('in'));
    });
  }

  /* Считаем в общем rAF: IntersectionObserver вычисляет пересечение по
     реальному вьюпорту, а контент сдвинут трансформом плавного скролла —
     из-за отставания лерпа блоки проявлялись с запозданием и рывком. */
  function updateReveal() {
    if (!pending.length) return;
    const trigger = innerHeight * 0.9;
    let alive = null;
    for (let i = 0; i < pending.length; i++) {
      const el = pending[i];
      if (el.getBoundingClientRect().top < trigger) el.classList.add('in');
      else (alive || (alive = [])).push(el);
    }
    pending = alive || [];
  }

  /* ─────────────────────────────────────────────────────────────
     4. Миссия: посимвольная заливка серый → чёрный по скроллу
     ───────────────────────────────────────────────────────────── */
  const missionEl = document.getElementById('missionText');

  function splitMission() {
    if (!missionEl) return;
    let i = 0;
    const frag = document.createDocumentFragment();

    const addChars = (str) => {
      const words = str.split(/(\s+)/);
      words.forEach((chunk) => {
        if (!chunk) return;
        const holder = /^\s+$/.test(chunk) ? frag : document.createElement('span');
        if (holder !== frag) holder.className = 'w';
        for (const ch of chunk) {
          const c = document.createElement('span');
          c.className = 'c';
          c.style.setProperty('--i', i++);
          c.textContent = ch;
          holder.appendChild(c);
        }
        if (holder !== frag) frag.appendChild(holder);
      });
    };

    // сохраняем жёсткие переносы строк из макета
    [...missionEl.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) addChars(node.textContent);
      else if (node.nodeName === 'BR') frag.appendChild(document.createElement('br'));
    });

    missionEl.textContent = '';
    missionEl.appendChild(frag);
    missionEl.style.setProperty('--n', String(i));
    // узкая кромка — заливка читается как чистая волна, а не как размазанный градиент
    missionEl.style.setProperty('--spread', '9');
  }

  /* Бесшовная лента логотипов — дублируем последовательность */
  function initMarquee() {
    document.querySelectorAll('.marquee-track').forEach((track) => {
      const seq = track.querySelector('.marquee-seq');
      if (!seq) return;
      const copy = seq.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      track.appendChild(copy);
    });
  }

  /* Карточки стартуют дугой. Когда секция входит в кадр, они плавно
     выстраиваются и запускают медленную бесшовную прокрутку. */
  let updateAwardsCarousel = () => {};

  function initAwardsCarousel() {
    const carousel = document.querySelector('.awards-carousel');
    const track = carousel?.querySelector('.awards-track');
    if (!carousel || !track) return;

    const originalCards = [...track.querySelectorAll('.award-card')];
    if (!originalCards.length) return;

    const copies = originalCards.map((card) => {
      const copy = card.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      track.appendChild(copy);
      return copy;
    });

    let sequenceWidth = 0;
    // Ставим карточку 2024 в центр дуги до запуска автопрокрутки.
    let offset = 150;
    let startOffset = 0;
    let pointerStart = 0;
    let aligned = reduced;
    let hovering = false;
    let dragging = false;
    let frame = 0;
    let lastTime = performance.now();

    const measure = () => {
      sequenceWidth = copies[0].offsetLeft - originalCards[0].offsetLeft;
    };
    const normalize = () => {
      if (!sequenceWidth) return;
      while (offset >= sequenceWidth) offset -= sequenceWidth;
      while (offset < 0) offset += sequenceWidth;
    };
    const paint = () => {
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    };
    const tick = (now) => {
      if (aligned && !reduced && !hovering && !dragging && sequenceWidth) {
        offset += (now - lastTime) * .018;
        normalize();
        paint();
      }
      lastTime = now;
      frame = requestAnimationFrame(tick);
    };
    const align = () => {
      if (aligned) return;
      aligned = true;
      carousel.classList.add('is-aligned');
      lastTime = performance.now();
    };

    requestAnimationFrame(() => {
      measure();
      paint();
      if (aligned) carousel.classList.add('is-aligned');
      frame = requestAnimationFrame(tick);
    });

    updateAwardsCarousel = () => {
      if (aligned) return;
      const rect = carousel.getBoundingClientRect();
      if (rect.top < innerHeight * .84 && rect.bottom > innerHeight * .16) align();
    };

    carousel.addEventListener('pointerenter', () => {
      if (aligned) hovering = true;
    });
    carousel.addEventListener('pointerleave', () => {
      hovering = false;
      if (!dragging) return;
      dragging = false;
      carousel.classList.remove('is-dragging');
    });
    carousel.addEventListener('pointerdown', (event) => {
      if (!aligned || (event.pointerType === 'mouse' && event.button !== 0)) return;
      dragging = true;
      hovering = true;
      pointerStart = event.clientX;
      startOffset = offset;
      carousel.classList.add('is-dragging');
      carousel.setPointerCapture?.(event.pointerId);
    });
    carousel.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      offset = startOffset - (event.clientX - pointerStart);
      normalize();
      paint();
    });
    const release = (event) => {
      if (!dragging) return;
      dragging = false;
      carousel.classList.remove('is-dragging');
      if (carousel.hasPointerCapture?.(event.pointerId)) carousel.releasePointerCapture(event.pointerId);
      if (event.pointerType !== 'mouse') hovering = false;
      lastTime = performance.now();
    };
    carousel.addEventListener('pointerup', release);
    carousel.addEventListener('pointercancel', release);

    new ResizeObserver(() => {
      measure();
      normalize();
      paint();
    }).observe(track);
  }

  let lastP = -1;
  function updateMission() {
    if (!missionEl) return;
    if (reduced) { missionEl.style.setProperty('--p', '1'); return; }

    // считаем прямо от вьюпорта — не зависит от трансформа плавного скролла
    const r = missionEl.getBoundingClientRect();
    const START = innerHeight * 0.88;   // верх блока на 88% экрана → 0
    const END   = innerHeight * 0.58;   // низ блока на 58% экрана  → 1 (текст по центру)
    const span  = Math.max(1, (START - END) + r.height);

    let p = (START - r.top) / span;
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    p = Math.round(p * 500) / 500;

    if (p !== lastP) {
      lastP = p;
      missionEl.style.setProperty('--p', String(p));
    }
  }

  /* ─────────────────────────────────────────────────────────────
     5b. Ротатор подзаголовка в герое
     ───────────────────────────────────────────────────────────── */
  function initHeroSub() {
    const box = document.getElementById('heroSub');
    if (!box) return;
    const lines = [...box.querySelectorAll('.hero-sub-line')];
    if (lines.length < 2 || reduced) return;

    let i = 0;
    // транзишены включаем со второго кадра, иначе стартовая строка
    // выедет снизу прямо на загрузке
    requestAnimationFrame(() => box.classList.add('is-ready'));

    setInterval(() => {
      const cur  = lines[i];
      const next = lines[(i + 1) % lines.length];

      cur.classList.remove('is-current');
      cur.classList.add('is-leaving');
      next.classList.add('is-current');

      // ушедшую строку возвращаем под низ мгновенно: иначе на следующем
      // круге она проедет обратно через кадр сверху вниз
      setTimeout(() => {
        cur.classList.add('no-anim');
        cur.classList.remove('is-leaving');
        void cur.offsetWidth;
        cur.classList.remove('no-anim');
      }, 800);

      i = (i + 1) % lines.length;
    }, 3600);
  }

  /* ─────────────────────────────────────────────────────────────
     6. Кадр
     ───────────────────────────────────────────────────────────── */
  function onScrollFrame(y) {
    updateHeader(y);
    updateReveal();
    updateMission();
    updateAwardsCarousel();
  }

  /* ─────────────────────────────────────────────────────────────
     6. Форма — заглушка (бэкенда в макете нет)
     ───────────────────────────────────────────────────────────── */
  function initForm() {
    const form = document.getElementById('form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('.btn-blue');
      const label = btn.textContent;
      btn.textContent = 'Отправлено';
      btn.disabled = true;
      setTimeout(() => { btn.textContent = label; btn.disabled = false; }, 2400);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     Boot
     ───────────────────────────────────────────────────────────── */
  function boot() {
    splitMission();
    initMarquee();
    initAwardsCarousel();
    initSmooth();
    initReveal();
    initHeroSub();
    initForm();
    measurePill();
    onScrollFrame(smooth ? current : window.scrollY);
    requestAnimationFrame(raf);
  }

  window.addEventListener('resize', () => {
    measurePill();
    if (smooth) setBodyHeight();
  });

  // во вкладке в фоне rAF не идёт — при возврате снимаем накопившийся рассинхрон
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !smooth) return;
    current = target = window.scrollY;
    content.style.transform = `translate3d(0, ${-current}px, 0)`;
    onScrollFrame(current);
  });

  // после подгрузки шрифтов пересчитываем геометрию
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { measurePill(); });
  }
  window.addEventListener('load', () => { measurePill(); if (smooth) setBodyHeight(); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
