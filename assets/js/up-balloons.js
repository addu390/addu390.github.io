(function () {
  'use strict';

  // Easter egg: clicking the little house detaches the balloons, which drift
  // up and off the top of the screen, growing as they go.
  function flyAway(svg) {
    var balloons = svg.querySelector('.up-balloons');
    if (!balloons || balloons.getAttribute('data-flying')) return;
    balloons.setAttribute('data-flying', '1');

    var strings = svg.querySelector('.up-strings');
    var circles = svg.querySelectorAll('.up-balloons circle');

    var overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:99999;';
    document.body.appendChild(overlay);

    var maxLife = 0;

    Array.prototype.forEach.call(circles, function (c) {
      var box = c.getBoundingClientRect();
      var size = box.width;
      var fill = c.getAttribute('fill') || '#ccc';
      var strLen = size * (1.3 + Math.random() * 0.7); // short, cut "baby" string
      var strW = Math.max(1, size * 0.12);

      // wrapper holds the balloon + its trailing string so they move together
      var wrap = document.createElement('div');
      wrap.style.cssText =
        'position:absolute;will-change:transform,opacity;' +
        'left:' + box.left + 'px;top:' + box.top + 'px;' +
        'width:' + size + 'px;height:' + (size + strLen) + 'px;' +
        'transform-origin:50% ' + (size / 2).toFixed(1) + 'px;';

      var ball = document.createElement('div');
      ball.style.cssText =
        'position:absolute;left:0;top:0;width:' + size + 'px;height:' + size + 'px;' +
        'border-radius:50% 50% 49% 49%;background:' + fill + ';' +
        'box-shadow:inset -' + (size * 0.16).toFixed(1) + 'px -' + (size * 0.16).toFixed(1) +
        'px ' + (size * 0.28).toFixed(1) + 'px rgba(0,0,0,.12);';

      var str = document.createElement('div');
      str.style.cssText =
        'position:absolute;left:50%;top:' + (size - 1).toFixed(1) + 'px;' +
        'width:' + strW.toFixed(1) + 'px;height:' + strLen.toFixed(1) + 'px;' +
        'background:#8A8D91;opacity:.55;border-radius:' + strW.toFixed(1) + 'px;' +
        'transform:translateX(-50%);';

      wrap.appendChild(ball);
      wrap.appendChild(str);
      overlay.appendChild(wrap);

      var dx = (Math.random() * 2 - 1) * 130;        // gentle horizontal drift
      var sway = (Math.random() * 2 - 1) * 36;        // side-to-side wobble
      var dy = -(box.top + box.height + 130 + Math.random() * 180); // just clears the top
      var rot = (Math.random() * 2 - 1) * 20;         // gentle tilt
      var scale = 1.4 + Math.random() * 0.5;           // slight, visible growth
      var dur = 5000 + Math.random() * 2600;           // slow helium rise
      var delay = Math.random() * 600;
      if (dur + delay > maxLife) maxLife = dur + delay;

      wrap.animate(
        [
          { transform: 'translate(0px,0px) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
          {
            transform: 'translate(' + (dx * 0.35 + sway).toFixed(1) + 'px,' + (dy * 0.32).toFixed(1) +
              'px) scale(' + (1 + (scale - 1) * 0.38).toFixed(2) + ') rotate(' + (rot * 0.7).toFixed(1) + 'deg)',
            opacity: 1, offset: 0.45
          },
          {
            transform: 'translate(' + (dx * 0.7 - sway).toFixed(1) + 'px,' + (dy * 0.7).toFixed(1) +
              'px) scale(' + (1 + (scale - 1) * 0.72).toFixed(2) + ') rotate(' + (-rot * 0.5).toFixed(1) + 'deg)',
            opacity: 1, offset: 0.8
          },
          {
            transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' +
              scale.toFixed(2) + ') rotate(' + rot.toFixed(1) + 'deg)',
            opacity: 0, offset: 1
          }
        ],
        { duration: dur, delay: delay, easing: 'cubic-bezier(.42,0,.58,1)', fill: 'forwards' }
      );
    });

    balloons.style.opacity = '0';
    if (strings) strings.style.opacity = '0';

    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, maxLife + 400);
    // Re-inflate after they've drifted off, so the egg can be triggered again.
    setTimeout(function () {
      balloons.style.opacity = '';
      if (strings) strings.style.opacity = '';
      balloons.removeAttribute('data-flying');
    }, maxLife + 700);
  }

  function closestSvg(node) {
    if (node.closest) return node.closest('svg.icon-up');
    while (node && (!node.tagName || node.tagName.toLowerCase() !== 'svg')) {
      node = node.parentNode;
    }
    return node;
  }

  function attach() {
    var houses = document.querySelectorAll('svg.icon-up .up-house');
    Array.prototype.forEach.call(houses, function (house) {
      if (house.getAttribute('data-egg')) return;
      house.setAttribute('data-egg', '1');
      house.style.cursor = 'pointer';
      house.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var svg = closestSvg(house);
        if (svg) flyAway(svg);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
