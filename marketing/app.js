/* Sentinel marketing page. No dependencies, no build step. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ======================================================== Video autoplay
     Autoplay gets refused in plenty of situations (background tab, power
     saving, engagement heuristics). Retry on a timer and on the first user
     gesture; always re-assert muted first, since an unmuted element is
     refused outright. play() rejects rather than throwing, so swallow it.
     ===================================================================== */
  var videos = Array.prototype.slice.call(document.querySelectorAll('video'));

  function attempt() {
    videos.forEach(function (v) {
      if (!v.paused) return;
      v.muted = true;
      var p = v.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    });
  }

  if (videos.length) {
    attempt();
    var retry = window.setInterval(attempt, 1000);

    // Stop the timer once everything is running, so it doesn't loop forever
    var watchdog = window.setInterval(function () {
      if (videos.every(function (v) { return !v.paused; })) {
        window.clearInterval(retry);
        window.clearInterval(watchdog);
      }
    }, 3000);

    ['click', 'touchstart'].forEach(function (evt) {
      document.addEventListener(evt, attempt, { once: true, passive: true });
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) attempt();
    });
  }

  /* ============================================================ Mobile menu */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobile-menu');

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  var BREAKPOINT = 700;
  var resizeTimer;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (window.innerWidth > BREAKPOINT && menu) {
        menu.classList.remove('open');
        if (burger) burger.setAttribute('aria-expanded', 'false');
      }
    }, 150);
  });

  /* ========================================================= 3D parallax
     Writes --mx / --my (-1…1) on <html>; CSS decides what each layer does
     with them, scaled by its own depth. Coalesced into one rAF so a burst
     of mousemove events costs a single style write per frame.
     ===================================================================== */
  var root = document.documentElement;
  var pending = false;
  var mx = 0;
  var my = 0;

  function applyParallax() {
    pending = false;
    root.style.setProperty('--mx', mx.toFixed(3));
    root.style.setProperty('--my', my.toFixed(3));
  }

  function onMove(e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
    if (!pending) {
      pending = true;
      window.requestAnimationFrame(applyParallax);
    }
  }

  function enableParallax(on) {
    if (on) {
      window.addEventListener('mousemove', onMove, { passive: true });
    } else {
      window.removeEventListener('mousemove', onMove);
      root.style.setProperty('--mx', '0');
      root.style.setProperty('--my', '0');
    }
  }

  // Skip on touch: no hover pointer to track, so the listener is pure drain
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  enableParallax(finePointer && !reduceMotion.matches);

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function (e) {
      enableParallax(finePointer && !e.matches);
    });
  }

  /* ===================================================== Back-to-top ring
     The ring's stroke-dashoffset encodes how far through the page the
     viewer is — full offset (empty ring) at the top, zero offset (full
     ring) at the bottom. Scroll handling is throttled to one rAF at a
     time, same pattern as the parallax listener above.
     ===================================================================== */
  var scrollBtn = document.getElementById('scrolltop');
  var progressRing = document.getElementById('scrolltop-progress');
  var RING_CIRCUMFERENCE = 119.4; // 2 * PI * r, r=19 — matches styles.css
  var SHOW_AFTER_PX = 320;

  if (scrollBtn && progressRing) {
    var scrollPending = false;

    function updateScrollProgress() {
      scrollPending = false;
      var doc = document.documentElement;
      var scrollTop = window.scrollY || doc.scrollTop;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var fraction = scrollable > 0 ? Math.min(1, Math.max(0, scrollTop / scrollable)) : 0;

      progressRing.style.strokeDashoffset = (RING_CIRCUMFERENCE * (1 - fraction)).toFixed(2);
      scrollBtn.classList.toggle('is-visible', scrollTop > SHOW_AFTER_PX);
    }

    window.addEventListener(
      'scroll',
      function () {
        if (!scrollPending) {
          scrollPending = true;
          window.requestAnimationFrame(updateScrollProgress);
        }
      },
      { passive: true }
    );

    scrollBtn.hidden = false; // becomes visible via .is-visible once scrolled
    updateScrollProgress(); // correct state on load if the page opens mid-scroll (e.g. a hash link)

    scrollBtn.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion.matches ? 'auto' : 'smooth',
      });
    });
  }

  /* ============================================================== Contact */
  var API_BASE =
    window.SENTINEL_API || window.location.protocol + '//' + window.location.hostname + ':5001';
  var EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;

  var form = document.getElementById('contact-form');
  if (!form) return;

  var success = document.getElementById('contact-success');
  var successText = document.getElementById('success-text');
  var alertBox = document.getElementById('form-alert');
  var submitBtn = document.getElementById('submit-btn');
  var resetBtn = document.getElementById('reset-btn');

  var fields = {
    email: { input: document.getElementById('email'), err: document.getElementById('email-err') },
    message: { input: document.getElementById('message'), err: document.getElementById('message-err') },
  };

  function setError(key, msg) {
    var f = fields[key];
    f.err.textContent = msg || '';
    if (msg) f.input.setAttribute('aria-invalid', 'true');
    else f.input.removeAttribute('aria-invalid');
  }

  Object.keys(fields).forEach(function (key) {
    fields[key].input.addEventListener('input', function () {
      if (fields[key].err.textContent) setError(key, '');
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    alertBox.hidden = true;

    var values = {
      name: document.getElementById('name').value.trim(),
      company: document.getElementById('company').value.trim(),
      email: fields.email.input.value.trim(),
      message: fields.message.input.value.trim(),
    };

    setError('email', '');
    setError('message', '');

    var ok = true;
    if (!EMAIL_RE.test(values.email)) { setError('email', 'Enter a valid email address.'); ok = false; }
    if (!values.message) { setError('message', 'Tell us a little about your use case.'); ok = false; }

    if (!ok) {
      // Move focus to the first problem so keyboard users aren't stranded
      (fields.email.err.textContent ? fields.email.input : fields.message.input).focus();
      return;
    }

    submitBtn.disabled = true;
    var originalLabel = submitBtn.innerHTML;
    submitBtn.textContent = 'Sending…';

    fetch(API_BASE + '/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
      .then(function (res) {
        return res.json().then(function (body) { return { ok: res.ok, body: body }; });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.body.error || 'Something went wrong. Please try again.');
        successText.textContent = values.name
          ? 'Thanks, ' + values.name.split(' ')[0] + " — we'll reply to " + values.email + ' shortly.'
          : "We'll reply to " + values.email + ' shortly.';
        form.hidden = true;
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function (err) {
        alertBox.textContent =
          err && err.message && err.message !== 'Failed to fetch'
            ? err.message
            : 'Could not reach the service. Make sure the Sentinel backend is running on port 5001.';
        alertBox.hidden = false;
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
      });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      setError('email', '');
      setError('message', '');
      success.hidden = true;
      form.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
})();
