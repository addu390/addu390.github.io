document.addEventListener("DOMContentLoaded", function() {
    const gooshi = document.getElementById("gooshi");
    const gooshisMessage = document.getElementById("gooshi-says-hi");

    setTimeout(() => {
        gooshi.src = "../assets/img/profile/gooshi-looking-at-you.png";
        gooshisMessage.src = "../assets/img/profile/have-a-nice-day.svg";
    }, 4000); 

    setTimeout(() => {
        gooshi.src = "../assets/img/profile/gooshi-love.png";
        gooshisMessage.src = "../assets/img/profile/okay-bye.svg";
    }, 8000);
});
