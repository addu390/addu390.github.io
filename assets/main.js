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

    onSoundforDarkMode.volume = 0.2;
    offSoundForDarkMode.volume = 0.2;
    
    onSoundforSoundMode.volume = 0.2;
    offSoundForSoundMode.volume = 0.2;

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
        loadCommentsScript('github-dark');
        addWhiteBgToSvg();
    }

    function disableDarkModeOnLoad() {
        iconLight.style.display = 'inline';
        iconDark.style.display = 'none';
        applyFilterToClass('svg-icon', 'invert(0%)');
        applyFilterToClass('dark-invert', 'invert(0%)');
        loadCommentsScript('github-light');
    }
});

function enableDarkMode() {
    DarkReader.setFetchMethod(window.fetch)
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
        script.src = 'https://utteranc.es/client.js'; // Replace with your actual script source
        script.setAttribute('theme', theme);
        script.setAttribute('repo', 'addu390/addu390.github.io');
        script.setAttribute('issue-term', 'pathname');
        script.setAttribute('crossorigin', 'anonymous');
        script.async = true;
        document.getElementById('comments-script').appendChild(script);
    }
}


