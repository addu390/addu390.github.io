(function () {
  'use strict';

  function flyAway(svg) {
    if (svg.getAttribute('data-flying')) return;
    svg.setAttribute('data-flying', '1');

    var box = svg.getBoundingClientRect();

    var overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:99999;';
    document.body.appendChild(overlay);

    var clone = svg.cloneNode(true);
    clone.removeAttribute('data-flying');
    clone.style.cssText =
      'position:absolute;will-change:transform,opacity;' +
      'left:' + box.left + 'px;top:' + box.top + 'px;' +
      'width:' + box.width + 'px;height:' + box.height + 'px;' +
      'transform-origin:50% 70%;';
    overlay.appendChild(clone);

    var dir = Math.random() < 0.5 ? -1 : 1;
    var sway = 26 + Math.random() * 18;
    var drift = dir * (40 + Math.random() * 40);
    var dy = -(box.top + box.height + 140 + Math.random() * 160);
    var tilt = 5 + Math.random() * 5;
    var scale = 1.25 + Math.random() * 0.35;
    var dur = 5200 + Math.random() * 1800;

    clone.animate(
      [
        { transform: 'translate(0px,0px) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
        {
          transform: 'translate(' + (drift * 0.25 + dir * sway).toFixed(1) + 'px,' + (dy * 0.22).toFixed(1) +
            'px) scale(' + (1 + (scale - 1) * 0.25).toFixed(2) + ') rotate(' + (dir * tilt).toFixed(1) + 'deg)',
          opacity: 1, offset: 0.28
        },
        {
          transform: 'translate(' + (drift * 0.5 - dir * sway).toFixed(1) + 'px,' + (dy * 0.5).toFixed(1) +
            'px) scale(' + (1 + (scale - 1) * 0.5).toFixed(2) + ') rotate(' + (-dir * tilt).toFixed(1) + 'deg)',
          opacity: 1, offset: 0.55
        },
        {
          transform: 'translate(' + (drift * 0.78 + dir * sway * 0.7).toFixed(1) + 'px,' + (dy * 0.78).toFixed(1) +
            'px) scale(' + (1 + (scale - 1) * 0.78).toFixed(2) + ') rotate(' + (dir * tilt * 0.6).toFixed(1) + 'deg)',
          opacity: 1, offset: 0.82
        },
        {
          transform: 'translate(' + drift.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' +
            scale.toFixed(2) + ') rotate(' + (-dir * tilt * 0.4).toFixed(1) + 'deg)',
          opacity: 0, offset: 1
        }
      ],
      { duration: dur, easing: 'cubic-bezier(.37,0,.63,1)', fill: 'forwards' }
    );

    svg.style.opacity = '0';

    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, dur + 300);
    setTimeout(function () {
      svg.style.opacity = '';
      svg.removeAttribute('data-flying');
    }, dur + 500);
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
