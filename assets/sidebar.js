document.getElementById('profile-toggle-icon').addEventListener('click', function() {
    var gif = document.getElementById('profile-gif');
    var icon = document.getElementById('profile-toggle-icon');
    
    if (gif.src.includes('3.gif')) {
        gif.src = '../assets/img/profile/3.png'; // Path to your still image
        icon.src = '../assets/img/common/play.svg'; // Path to your play icon
    } else {
        gif.src = '../assets/img/profile/3.gif'; // Path to your animated GIF
        icon.src = '../assets/img/common/pause.svg'; // Path to your pause icon
    }
});

document.getElementById('showerButton').addEventListener('click', function() {
    startWatermelonShower();
});

function startWatermelonShower() {
    const duration = 5000; // Shower duration in milliseconds
    const interval = 100; // Interval between watermelon creation in milliseconds

    const showerInterval = setInterval(() => {
        createWatermelon();
    }, interval);

    setTimeout(() => {
        clearInterval(showerInterval);
    }, duration);
}

function createWatermelon() {
    const watermelon = document.createElement('div');
    watermelon.classList.add('watermelon');
    watermelon.style.left = `${Math.random() * 100}vw`;
    document.getElementById('showerContainer').appendChild(watermelon);

    setTimeout(() => {
        watermelon.remove();
    }, 3000); // Remove the watermelon after the animation ends
}
