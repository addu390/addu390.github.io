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