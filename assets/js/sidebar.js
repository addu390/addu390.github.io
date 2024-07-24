document.getElementById('profile-gif').addEventListener('click', function() {
    var gif = document.getElementById('profile-gif');
    
    if (gif.src.includes('3.gif')) {
        gif.src = '../assets/img/profile/3.png';
    } else {
        gif.src = '../assets/img/profile/3.gif';
    }
});