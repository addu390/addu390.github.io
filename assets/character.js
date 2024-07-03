document.addEventListener("DOMContentLoaded", function() {
    var gooshiSound = document.getElementById('gooshiSound');
    var isInProgress = false;
    gooshiSound.volume = 0.6;
    
    const gooshi = document.getElementById("gooshi");
    const gooshisMessage = document.getElementById("gooshi-says-hi");

    firstGreeting();

    gooshi.addEventListener('click', function () {
        if (isInProgress) {
            return;
        }
        if (soundEnabled && soundEnabled !== null && soundEnabled === 'true') {
            gooshiSound.currentTime = 0; 
            gooshiSound.play();
        }
        startGreeting();
    });

    function startGreeting() {
        disableClickOnGooshi();
        
        setTimeout(() => {
            gooshi.src = "../assets/img/profile/gooshi-looking-away.png";
            gooshisMessage.src = "../assets/img/profile/gooshi.svg";
        }, 0);

        firstGreeting();
    }

    function firstGreeting() {
        disableClickOnGooshi();
        
        setTimeout(() => {
            gooshi.src = "../assets/img/profile/gooshi-love.png";
            gooshisMessage.src = "../assets/img/profile/have-a-nice-day.svg";
        }, 3000); 
    
        setTimeout(() => {
            gooshi.src = "../assets/img/profile/gooshi-love.png";
            gooshisMessage.src = "../assets/img/profile/okay-bye.svg";
            gooshi.classList.remove('disabled');
            isInProgress = false;
        }, 6000);
    }

    function disableClickOnGooshi() {
        isInProgress = true;
        gooshi.classList.add('disabled');
    }
});
