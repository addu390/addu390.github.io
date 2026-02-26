document.addEventListener('DOMContentLoaded', function () {
  const toc = document.getElementById('toc');
  const tocContainer = toc.parentElement;
  const headers = Array.from(document.querySelectorAll('.content summary, .content h2, .content h3, .content .header'))
    .filter(el => !el.textContent.includes('Relevant Packages and Classes'));

  const headersToInclude = Array.from(headers).slice(0, -1);

  headersToInclude.forEach(header => {
    const id = header.id || header.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!id) {
      id = `header-${index}`;
    }
    header.id = id;

    const li = document.createElement('p');
    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = header.textContent;

    li.appendChild(a);
    toc.appendChild(li);
  });

  let isUserScrolling = false;
  let scrollTimeout;

  tocContainer.addEventListener('scroll', () => {
    isUserScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isUserScrolling = false;
    }, 100);
  });

  // Function to underline the index heading based on the position on the screen
  function underlineCurrentHeading() {
    let current = null;
    let currentPosition = window.innerHeight;

    headersToInclude.forEach(header => {
      const rect = header.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < currentPosition) {
        current = header;
        currentPosition = rect.top;
      }
    });

    document.querySelectorAll('#toc a').forEach(a => {
      a.classList.remove('underline');
    });

    if (current) {
      const currentLink = document.querySelector(`#toc a[href="#${current.id}"]`);
      if (currentLink) {
        currentLink.classList.add('underline');
        // Scroll the parent container to keep the current link in view
        const parentRect = tocContainer.getBoundingClientRect();
        const linkRect = currentLink.getBoundingClientRect();
        if (linkRect.top < parentRect.top || linkRect.bottom > parentRect.bottom) {
          tocContainer.scrollTop += linkRect.top - parentRect.top - tocContainer.clientHeight / 2 + linkRect.height / 2;
        }
      }
    }
  }

  // Add the underline class on scroll
  window.addEventListener("scroll", function () {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(underlineCurrentHeading, 100);
  }, true)
  underlineCurrentHeading();
});
