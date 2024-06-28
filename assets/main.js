let enabled = localStorage.getItem('dark-mode');
if (enabled !== null && enabled === 'true') {
    enable();
}

document.addEventListener('DOMContentLoaded', () => {
    const iconDark = document.getElementById('icon-dark');
    const iconLight = document.getElementById('icon-light');

    if (enabled !== null && enabled === 'true') {
        enableOnLoad();
    }

    iconDark.addEventListener('click', function () {
        enable();
        enableOnLoad();
    });

    iconLight.addEventListener('click', function () {
        disable();
        disableOnLoad();
    });

    function enableOnLoad() {
        iconDark.style.display = 'none';
        iconLight.style.display = 'inline';
        applyFilterToClass('svg-icon', 'invert(70%)');
        loadCommentsScript('github-dark');
        addWhiteBgToSvg();
    }

    function disableOnLoad() {
        iconDark.style.display = 'inline';
        iconLight.style.display = 'none';
        applyFilterToClass('svg-icon', 'invert(0%)');
        loadCommentsScript('github-light');
    }
});

function enable() {
    DarkReader.setFetchMethod(window.fetch)
    DarkReader.enable();
    localStorage.setItem('dark-mode', 'true');
}

function disable() {
    DarkReader.disable();
    localStorage.setItem('dark-mode', 'false');
}

function applyFilterToClass(className, filter) {
    const elements = document.querySelectorAll(`.${className}`);
    elements.forEach(element => {
        if (element.style.filter !== filter) {
            element.style.filter = filter;
        }
    });
}

function addWhiteBgToSvg() {
    const root = document.documentElement;
    root.style.setProperty('--bg-color', 'white');
    root.style.setProperty('--darkreader-bg--bg-color', 'white');
}

function loadCommentsScript(theme) {
    const existingScript = document.getElementById('comments-script');
    if (existingScript) {
        existingScript.innerHTML = '';
        const script = document.createElement('script');
        script.id = 'comments-script';
        script.src = 'https://utteranc.es/client.js'; // Replace with your actual script source
        script.setAttribute('theme', theme);
        script.setAttribute('repo', 'addu390/addu390.github.io');
        script.setAttribute('issue-term', 'pathname');
        script.setAttribute('crossorigin', 'anonymous');
        script.async = true;
        document.getElementById('comments-script').appendChild(script);
    }
}


