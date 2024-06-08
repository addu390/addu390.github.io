document.getElementById('notification-icon').addEventListener('click', function() {
    var dropdown = document.getElementById('notification-dropdown');
    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'unset';
    } else {
        dropdown.style.display = 'none';
    }
});

// Close the dropdown if clicked outside
window.onclick = function(event) {
    if (!event.target.matches('.notification-icon') && !event.target.closest('.notification-icon')) {
        var dropdown = document.getElementById('notification-dropdown');
        if (dropdown.style.display === 'unset') {
            dropdown.style.display = 'none';
        }
    }
}
