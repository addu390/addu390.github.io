document.addEventListener("DOMContentLoaded", function() {
    var gooshiSound = document.getElementById('gooshiSound');

    gooshiSound.volume = 0.6;
    let timeoutIds = [];
    
    const gooshi = document.getElementById("gooshi");
    const gooshisMessage = document.getElementById("gooshi-says-hi");

    firstGreeting();

    gooshi.addEventListener('click', function () {
        timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
        
        if (soundEnabled && soundEnabled !== null && soundEnabled === 'true') {
            gooshiSound.currentTime = 0; 
            gooshiSound.play();
        }
        startGreeting();
    });

    function startGreeting() {
        timeoutIds.push(setTimeout(() => {
            gooshi.src = "../assets/img/profile/gooshi-looking-away.png";
            gooshisMessage.src = "../assets/img/profile/gooshi.svg";
        }, 0));

        firstGreeting();
    }

    function firstGreeting() {
        timeoutIds.push(setTimeout(() => {
            gooshi.src = "../assets/img/profile/gooshi-love.png";
            gooshisMessage.src = "../assets/img/profile/have-a-nice-day.svg";
        }, 2500)); 
    
        timeoutIds.push(setTimeout(() => {
            gooshi.src = "../assets/img/profile/gooshi-love.png";
            gooshisMessage.src = "../assets/img/profile/okay-bye.svg";
        }, 5000));
    }
});
