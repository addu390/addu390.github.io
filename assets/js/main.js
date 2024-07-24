let darkModeEnabled = localStorage.getItem('dark-mode');
let soundEnabled = localStorage.getItem('sound-enabled');
if (darkModeEnabled !== null && darkModeEnabled === 'true') {
    enableDarkMode();
}

document.addEventListener('DOMContentLoaded', () => {
    const iconSoundOn = document.getElementById('icon-sound-on');
    const iconSoundOff = document.getElementById('icon-sound-off');

    const iconDark = document.getElementById('icon-dark');
    const iconLight = document.getElementById('icon-light');

    var onSoundforDarkMode = document.getElementById('darkModeOn');
    var offSoundForDarkMode = document.getElementById('darkModeOff');

    var onSoundforSoundMode = document.getElementById('soundModeOn');
    var offSoundForSoundMode = document.getElementById('soundModeOff');

    onSoundforDarkMode.volume = 0.6;
    offSoundForDarkMode.volume = 0.6;
    
    onSoundforSoundMode.volume = 0.6;
    offSoundForSoundMode.volume = 0.6;

    if (darkModeEnabled !== null && darkModeEnabled === 'true') {
        enableDarkModeOnLoad();
    }

    if (soundEnabled !== null && soundEnabled === 'true') {
        enableSoundModeOnLoad();
    }

    iconSoundOn.addEventListener('click', function () {
        disableSoundModeOnLoad();
        offSoundForSoundMode.currentTime = 0; 
        offSoundForSoundMode.play();
    });

    iconSoundOff.addEventListener('click', function () {
        enableSoundModeOnLoad();
        onSoundforSoundMode.currentTime = 0; 
        onSoundforSoundMode.play();
    });

    iconDark.addEventListener('click', function () {
        disableDarkMode();
        disableDarkModeOnLoad();
        if (soundEnabled !== null && soundEnabled === 'true') {
            offSoundForDarkMode.currentTime = 0; 
            offSoundForDarkMode.play();
        }
    });

    iconLight.addEventListener('click', function () {
        enableDarkMode();
        enableDarkModeOnLoad();
        if (soundEnabled !== null && soundEnabled === 'true') {
            onSoundforDarkMode.currentTime = 0; 
            onSoundforDarkMode.play();
        }
    });

    function enableSoundModeOnLoad() {
        soundEnabled = 'true';
        localStorage.setItem('sound-enabled', 'true');
        iconSoundOn.style.display = 'inline';
        iconSoundOff.style.display = 'none';
    }

    function disableSoundModeOnLoad() {
        soundEnabled = 'false';
        localStorage.setItem('sound-enabled', 'false');
        iconSoundOn.style.display = 'none';
        iconSoundOff.style.display = 'inline';
    }

    function enableDarkModeOnLoad() {
        iconLight.style.display = 'none';
        iconDark.style.display = 'inline';
        applyFilterToClass('svg-icon', 'invert(77%)');
        loadCommentsScript('transparent_dark');
        addWhiteBgToSvg();
    }

    function disableDarkModeOnLoad() {
        iconLight.style.display = 'inline';
        iconDark.style.display = 'none';
        applyFilterToClass('svg-icon', 'invert(0%)');
        applyFilterToClass('dark-invert', 'invert(0%)');
        loadCommentsScript('light');
    }
});

function enableDarkMode() {
    DarkReader.setFetchMethod((url) => {
        if (url.includes('https://assets.mailerlite.com/css/universal.css')) {
            return Promise.resolve(new Response('', {
                status: 200,
                statusText: 'OK'
            }));
        }
        return fetch(url);
    });
    DarkReader.enable();
    localStorage.setItem('dark-mode', 'true');
}

function disableDarkMode() {
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
    applyFilterToClass("dark-invert", "invert(90%)");
}

function loadCommentsScript(theme) {
    const existingScript = document.getElementById('comments-script');
    if (existingScript) {
        existingScript.innerHTML = '';
        const script = document.createElement('script');
        script.id = 'comments-script';
        script.src = 'https://giscus.app/client.js';
        script.setAttribute('data-repo', "addu390/addu390.github.io");
        script.setAttribute('data-repo-id', "MDEwOlJlcG9zaXRvcnkyOTk0MDg4NDY=");
        script.setAttribute('data-category', "Q&A");
        script.setAttribute('data-category-id', "DIC_kwDOEdidzs4ChB1Z");
        script.setAttribute('data-mapping', "pathname");
        script.setAttribute('data-strict', "0");
        script.setAttribute('data-reactions-enabled', "1");
        script.setAttribute('data-emit-metadata', "0");
        script.setAttribute('data-input-position', "top");
        script.setAttribute('data-theme', theme);
        script.setAttribute('data-lang', "en");
        script.setAttribute('data-loading', "lazy");
        script.setAttribute('crossorigin', "anonymous");
        script.async = true;
        document.getElementById('comments-script').appendChild(script);
    }
}

