(function () {
    const GRADES = ['light', 'dim', 'dark', 'darker'];
    const GISCUS_THEME = {
        light: 'light',
        dim: 'dark_dimmed',
        dark: 'dark',
        darker: 'transparent_dark'
    };

    function getGrade() {
        const stored = localStorage.getItem('theme-grade');
        if (stored && GRADES.indexOf(stored) !== -1) {
            return stored;
        }
        return localStorage.getItem('dark-mode') === 'true' ? 'dark' : 'light';
    }

    function applyTheme(grade) {
        document.documentElement.setAttribute('data-theme', grade);
    }

    applyTheme(getGrade());

    function setGrade(grade, options) {
        if (GRADES.indexOf(grade) === -1) {
            grade = 'light';
        }
        applyTheme(grade);
        localStorage.setItem('theme-grade', grade);
        localStorage.setItem('dark-mode', grade === 'light' ? 'false' : 'true');
        updateThemeUI(grade);
        if (options && options.sound) {
            playThemeSound(grade !== 'light');
        }
    }

    function smileyFor(grade) {
        return '/assets/img/emoji/smiley-' + grade + '.svg';
    }

    function updateThemeUI(grade) {
        const src = smileyFor(grade);
        ['theme-smiley', 'm-theme-smiley'].forEach((id) => {
            const img = document.getElementById(id);
            if (img) {
                img.src = src;
            }
        });

        document.querySelectorAll('.theme-grade-menu button[data-grade]').forEach((button) => {
            button.classList.toggle('active', button.getAttribute('data-grade') === grade);
        });

        loadCommentsScript(GISCUS_THEME[grade] || 'light');
    }

    function playThemeSound(isDark) {
        if (localStorage.getItem('sound-enabled') !== 'true') {
            return;
        }
        const audio = document.getElementById(isDark ? 'darkModeOn' : 'darkModeOff');
        if (audio) {
            audio.currentTime = 0;
            audio.play();
        }
    }

    function loadCommentsScript(theme) {
        const container = document.getElementById('comments-script');
        if (!container) {
            return;
        }
        container.innerHTML = '';
        const script = document.createElement('script');
        script.src = 'https://giscus.app/client.js';
        script.setAttribute('data-repo', 'addu390/addu390.github.io');
        script.setAttribute('data-repo-id', 'MDEwOlJlcG9zaXRvcnkyOTk0MDg4NDY=');
        script.setAttribute('data-category', 'Q&A');
        script.setAttribute('data-category-id', 'DIC_kwDOEdidzs4ChB1Z');
        script.setAttribute('data-mapping', 'pathname');
        script.setAttribute('data-strict', '0');
        script.setAttribute('data-reactions-enabled', '1');
        script.setAttribute('data-emit-metadata', '0');
        script.setAttribute('data-input-position', 'top');
        script.setAttribute('data-theme', theme);
        script.setAttribute('data-lang', 'en');
        script.setAttribute('data-loading', 'lazy');
        script.setAttribute('crossorigin', 'anonymous');
        script.async = true;
        container.appendChild(script);
    }

    function closeMenus(except) {
        document.querySelectorAll('.theme-grade').forEach((wrapper) => {
            const menu = wrapper.querySelector('.theme-grade-menu');
            const trigger = wrapper.querySelector('.theme-trigger');
            if (!menu) {
                return;
            }
            if (wrapper !== except) {
                menu.hidden = true;
                if (trigger) {
                    trigger.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }

    window.PyTheme = { get: getGrade, set: setGrade };

    document.addEventListener('DOMContentLoaded', () => {
        updateThemeUI(getGrade());

        document.querySelectorAll('.theme-grade').forEach((wrapper) => {
            const trigger = wrapper.querySelector('.theme-trigger');
            const menu = wrapper.querySelector('.theme-grade-menu');
            if (!trigger || !menu) {
                return;
            }

            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const willOpen = menu.hidden;
                closeMenus(willOpen ? wrapper : null);
                menu.hidden = !willOpen;
                trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            });

            menu.querySelectorAll('button[data-grade]').forEach((button) => {
                button.addEventListener('click', (event) => {
                    event.stopPropagation();
                    setGrade(button.getAttribute('data-grade'), { sound: true });
                    closeMenus();
                });
            });
        });

        document.addEventListener('click', () => closeMenus());
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeMenus();
            }
        });

        const iconSoundOn = document.getElementById('icon-sound-on');
        const iconSoundOff = document.getElementById('icon-sound-off');
        const onSoundForSoundMode = document.getElementById('soundModeOn');
        const offSoundForSoundMode = document.getElementById('soundModeOff');
        const onSoundForDarkMode = document.getElementById('darkModeOn');
        const offSoundForDarkMode = document.getElementById('darkModeOff');

        [onSoundForSoundMode, offSoundForSoundMode, onSoundForDarkMode, offSoundForDarkMode].forEach((audio) => {
            if (audio) {
                audio.volume = 0.6;
            }
        });

        function setSoundMode(enabled) {
            localStorage.setItem('sound-enabled', enabled ? 'true' : 'false');
            if (iconSoundOn) {
                iconSoundOn.style.display = enabled ? 'inline' : 'none';
            }
            if (iconSoundOff) {
                iconSoundOff.style.display = enabled ? 'none' : 'inline';
            }
        }

        if (localStorage.getItem('sound-enabled') === 'true') {
            setSoundMode(true);
        }

        if (iconSoundOn) {
            iconSoundOn.addEventListener('click', () => {
                setSoundMode(false);
                if (offSoundForSoundMode) {
                    offSoundForSoundMode.currentTime = 0;
                    offSoundForSoundMode.play();
                }
            });
        }

        if (iconSoundOff) {
            iconSoundOff.addEventListener('click', () => {
                setSoundMode(true);
                if (onSoundForSoundMode) {
                    onSoundForSoundMode.currentTime = 0;
                    onSoundForSoundMode.play();
                }
            });
        }
    });
})();
