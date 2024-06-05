document.addEventListener('DOMContentLoaded', () => {
    const tableName = "pyBlogSavedPosts";
    const saveButtons = document.querySelectorAll('.save-button');
    const sidebarReadingList = document.getElementById('sidebar-reading-list');
    const clearButton = document.getElementById('clear-reading-list');

    clearButton.addEventListener('click', () => {
        localStorage.removeItem(tableName);
        updateSidebar();
        updateSaveButtons();
    });

    function updateSaveButtons() {
        saveButtons.forEach(button => {
            const postId = button.parentElement.getAttribute('data-id');
            const icon = button.querySelector('i');
            if (isPostSaved(postId)) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
            }
        });
    }

    function updateSidebar() {
        const savedPosts = JSON.parse(localStorage.getItem(tableName)) || [];
        sidebarReadingList.innerHTML = '';

        savedPosts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.innerHTML = `<hr class="post-hr"><p class="clickable-sidebar-div"><a href="${post.url}">${post.title}</a></p>`
            sidebarReadingList.appendChild(postElement);
        });

        if (savedPosts.length === 0) {
            clearButton.style.display = 'none';
            const noPostElement = document.createElement('div');
            noPostElement.innerHTML = `<hr class="post-hr"><p class='figure-header'>No saved posts</p>`;
            sidebarReadingList.appendChild(noPostElement);
        } else {
            clearButton.style.display = 'block';
        }
    }

    saveButtons.forEach(button => {
        const postId = button.parentElement.getAttribute('data-id');
        const postTitle = button.parentElement.getAttribute('data-title');
        const postUrl = button.parentElement.getAttribute('data-url');
        const icon = button.querySelector('i');
        if (isPostSaved(postId)) {
            icon.classList.remove('far');
            icon.classList.add('fas');
        }

        button.addEventListener('click', () => {
            if (isPostSaved(postId)) {
                unsavePost(postId);
                icon.classList.remove('fas');
                icon.classList.add('far');
            } else {
                savePost(postId, postTitle, postUrl);
                icon.classList.remove('far');
                icon.classList.add('fas');
            }
            updateSidebar();
        });
    });

    function isPostSaved(postId) {
        const savedPosts = JSON.parse(localStorage.getItem(tableName)) || [];
        return savedPosts.some(post => post.id === postId);
    }

    function savePost(postId, postTitle, postUrl) {
        let savedPosts = JSON.parse(localStorage.getItem(tableName)) || [];
        savedPosts.push({ id: postId, title: postTitle, url: postUrl });
        localStorage.setItem(tableName, JSON.stringify(savedPosts));
    }

    function unsavePost(postId) {
        let savedPosts = JSON.parse(localStorage.getItem(tableName)) || [];
        savedPosts = savedPosts.filter(post => post.id !== postId);
        localStorage.setItem(tableName, JSON.stringify(savedPosts));
    }

    updateSidebar();
    updateSaveButtons();
});
