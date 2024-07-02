document.addEventListener("DOMContentLoaded", function() {
    const character2 = document.getElementById("character2");
    const character2Text = document.getElementById("character2-text");

    character2.addEventListener('click', function () {
        character2.classList.remove("visible");
    });

    setTimeout(() => {
        character2.classList.add("visible");
    }, 1000);

    setTimeout(() => {
        character2Text.src = "../assets/img/profile/okay-bye.svg";
    }, 4000); 

    setTimeout(() => {
        character2.classList.remove("visible");
    }, 8000); 
});
