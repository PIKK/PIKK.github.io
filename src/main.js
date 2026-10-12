/**
 * 浏览器端交互：主题切换、阅读进度、回到顶部、代码复制。
 * 保持轻量，无第三方依赖。
 */
(function () {
  'use strict';

  /* --- 主题切换 ---------------------------------------------------------- */
  var root = document.documentElement;
  var toggle = document.querySelector('[data-theme-toggle]');

  function applyTheme(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      /* 隐私模式下忽略 */
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#17150f' : '#fbf8f2');
    }
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }

  /* --- 阅读进度 ---------------------------------------------------------- */
  var progress = document.querySelector('.progress');
  var toTop = document.querySelector('[data-to-top]');

  function onScroll() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;

    if (progress) {
      var ratio = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;
      progress.style.setProperty('--progress', ratio.toFixed(4));
    }

    if (toTop) {
      toTop.dataset.visible = scrollTop > 600 ? 'true' : 'false';
    }
  }

  var ticking = false;
  window.addEventListener(
    'scroll',
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        onScroll();
        ticking = false;
      });
    },
    { passive: true }
  );
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* --- 代码块复制 -------------------------------------------------------- */
  document.querySelectorAll('.prose pre').forEach(function (pre) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制代码');

    button.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = code ? code.innerText : '';

      function done(ok) {
        button.textContent = ok ? '已复制' : '复制失败';
        button.dataset.copied = 'true';
        setTimeout(function () {
          button.textContent = '复制';
          button.dataset.copied = 'false';
        }, 1600);
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(
          function () {
            done(true);
          },
          function () {
            done(false);
          }
        );
      } else {
        // 非安全上下文（如本地 file://）退回到选中文本
        var range = document.createRange();
        range.selectNodeContents(code || pre);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        done(true);
      }
    });

    pre.appendChild(button);
  });
})();
