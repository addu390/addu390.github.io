document.addEventListener('DOMContentLoaded', function () {
    const toc = document.getElementById('toc');
    const headers = document.querySelectorAll('.content summary, .content h2, .content h3');

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
  });
  