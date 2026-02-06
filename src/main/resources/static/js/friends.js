class FriendsApp {
    constructor() {
        this.allFriends = [];
        this.filteredFriends = [];
        this.currentPage = 1;
        this.pageSize = 12;
        this.currentSort = {
            column: 'name',
            direction: 'asc'
        };
        this.searchTimeout = null;
        this.deletingFriendId = null;
        this.editingFriendId = null;
        this.imageChanged = false;

        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onPageLoad());
        } else {
            this.onPageLoad();
        }
    }

    async onPageLoad() {
        this.initElements();
        this.setupEventListeners();
        this.loadFriends();
    }

    initElements() {
        this.friendsTableBody = document.getElementById('friendsTableBody');
        this.searchInput = document.getElementById('searchInput');
        this.pageSizeSelect = document.getElementById('pageSizeSelect');
        this.prevPageBtn = document.getElementById('prevPage');
        this.nextPageBtn = document.getElementById('nextPage');
        this.paginationPages = document.getElementById('paginationPages');
        this.emptyState = document.getElementById('emptyState');
        this.paginationContainer = document.getElementById('paginationContainer');
        this.totalFriendsCount = document.getElementById('totalFriendsCount');
        this.upcomingBirthdaysCount = document.getElementById('upcomingBirthdaysCount');
        this.todayBirthdaysCount = document.getElementById('todayBirthdaysCount');
        this.shownCount = document.getElementById('shownCount');
        this.totalCount = document.getElementById('totalCount');
    }

    setupEventListeners() {
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => this.sortTable(header.getAttribute('data-sort')));
        });

        this.searchInput.addEventListener('input', (e) => {
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            this.searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value.trim());
            }, 300);
        });

        this.pageSizeSelect.addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1;
            this.applySortingAndPagination();
            this.updatePaginationControls();
        });

        this.prevPageBtn.addEventListener('click', () => this.changePage(-1));
        this.nextPageBtn.addEventListener('click', () => this.changePage(1));

        document.getElementById('friendForm').addEventListener('submit', (e) => this.handleFormSubmit(e));

        document.getElementById('image').addEventListener('change', (e) => this.handleImageUpload(e));

        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());

        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    async loadFriends() {
        try {
            this.friendsTableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="5">
                        <div class="loading-spinner"></div>
                        <span>Загрузка данных...</span>
                    </td>
                </tr>
            `;

            const response = await fetch('/api/friends/upcoming?page=1&size=1000');
            if (!response.ok) throw new Error('Ошибка загрузки данных');

            const data = await response.json();
            let friends = [];

            if (data.content && Array.isArray(data.content)) {
                friends = data.content;
            } else if (data.friends && Array.isArray(data.friends)) {
                friends = data.friends;
            }

            this.allFriends = friends.map(friend => ({
                id: friend.id,
                fio: friend.fio || friend.name || 'Неизвестно',
                email: friend.email || '',
                birthDate: friend.birthDate,
                age: this.calculateAge(this.parseDate(friend.birthDate)),
                imageUrl: friend.imageUrl
            }));

            this.filteredFriends = [...this.allFriends];
            this.updateStats();
            this.applySortingAndPagination();
            this.updatePaginationControls();
            this.checkPaginationNeeded();
            this.checkEmptyState();
        } catch (error) {
            console.error('Error loading friends:', error);
            this.friendsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--danger-color); padding: 40px;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Не удалось загрузить данные</p>
                        <button class="retry-btn" onclick="app.loadFriends()">
                            Повторить
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    updateStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingBirthdays = this.allFriends.filter(friend => {
            const birthDate = this.parseDate(friend.birthDate);
            if (!birthDate) return false;

            const nextBirthday = this.getNextBirthday(birthDate);
            const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
            return daysUntil <= 7;
        });

        const todayBirthdays = this.allFriends.filter(friend => {
            const birthDate = this.parseDate(friend.birthDate);
            if (!birthDate) return false;

            const nextBirthday = this.getNextBirthday(birthDate);
            const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
            return daysUntil === 0;
        });

        this.totalFriendsCount.textContent = this.allFriends.length;
        this.upcomingBirthdaysCount.textContent = upcomingBirthdays.length;
        this.todayBirthdaysCount.textContent = todayBirthdays.length;
    }

    performSearch(searchTerm) {
        if (searchTerm === '') {
            this.filteredFriends = [...this.allFriends];
        } else {
            const searchLower = searchTerm.toLowerCase();
            this.filteredFriends = this.allFriends.filter(friend =>
                friend.fio.toLowerCase().includes(searchLower) ||
                (friend.email && friend.email.toLowerCase().includes(searchLower))
            );
        }

        this.currentPage = 1;
        this.applySortingAndPagination();
        this.updatePaginationControls();
        this.checkPaginationNeeded();
        this.checkEmptyState();
    }

    sortTable(column) {
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }

        this.applySortingAndPagination();
        this.updateSortIndicators(column);
    }

    updateSortIndicators(activeColumn) {
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (header.getAttribute('data-sort') === activeColumn) {
                header.classList.add(`sort-${this.currentSort.direction}`);
            }
        });
    }

    sortFriends(friends) {
        return [...friends].sort((a, b) => {
            const aValue = this.getFriendValue(a, this.currentSort.column);
            const bValue = this.getFriendValue(b, this.currentSort.column);

            if (this.currentSort.column === 'age') {
                return this.currentSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }

            if (this.currentSort.direction === 'asc') {
                return String(aValue).localeCompare(String(bValue));
            } else {
                return String(bValue).localeCompare(String(aValue));
            }
        });
    }

    getFriendValue(friend, column) {
        switch (column) {
            case 'name':
                return friend.fio;
            case 'email':
                return friend.email || '';
            case 'birthDate':
                return friend.birthDate;
            case 'age':
                return friend.age;
            default:
                return '';
        }
    }

    applySortingAndPagination() {
        const sortedFriends = this.sortFriends(this.filteredFriends);
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const paginatedFriends = sortedFriends.slice(startIndex, endIndex);

        this.renderFriendsTable(paginatedFriends);
        this.updatePaginationInfo();
    }

    renderFriendsTable(friends) {
        let html = '';

        friends.forEach(friend => {
            const birthDate = this.parseDate(friend.birthDate);
            const formattedDate = birthDate ? this.formatDateShort(birthDate) : 'Неизвестно';

            html += `
                <tr data-friend-id="${friend.id}">
                    <td class="avatar-cell">
                        <div class="friend-name-with-avatar">
                            ${friend.imageUrl ? `
                                <img src="${friend.imageUrl}"
                                     alt="${this.escapeHtml(friend.fio)}"
                                     class="avatar-table"
                                     onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex'">
                            ` : ''}
                            <div class="avatar-placeholder-table" ${friend.imageUrl ? 'style="display: none;"' : ''}>
                                <i class="fas fa-user"></i>
                            </div>
                            <span>${this.escapeHtml(friend.fio)}</span>
                        </div>
                    </td>
                    <td>${friend.email ? this.escapeHtml(friend.email) : '—'}</td>
                    <td>${formattedDate}</td>
                    <td>${friend.age} лет</td>
                    <td class="actions-cell">
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" onclick="app.editFriend(${friend.id})" title="Редактировать">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="app.deleteFriend(${friend.id})" title="Удалить">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        this.friendsTableBody.innerHTML = html || `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-light);">
                    <i class="fas fa-search"></i>
                    <p>Друзья не найдены</p>
                </td>
            </tr>
        `;
    }

    updatePaginationInfo() {
        const startIndex = (this.currentPage - 1) * this.pageSize + 1;
        const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredFriends.length);

        this.shownCount.textContent = this.filteredFriends.length > 0 ? `${startIndex}-${endIndex}` : '0';
        this.totalCount.textContent = this.filteredFriends.length;
    }

    updatePaginationControls() {
        const totalPages = Math.ceil(this.filteredFriends.length / this.pageSize);

        this.prevPageBtn.disabled = this.currentPage === 1;
        this.nextPageBtn.disabled = this.currentPage === totalPages || totalPages === 0;

        this.paginationPages.innerHTML = '';

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                this.addPageButton(i);
            }
        } else {
            this.addPageButton(1);

            if (this.currentPage > 3) {
                this.addEllipsis();
            }

            const startPage = Math.max(2, this.currentPage - 1);
            const endPage = Math.min(totalPages - 1, this.currentPage + 1);

            for (let i = startPage; i <= endPage; i++) {
                this.addPageButton(i);
            }

            if (this.currentPage < totalPages - 2) {
                this.addEllipsis();
            }

            this.addPageButton(totalPages);
        }
    }

    addPageButton(pageNumber) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-page ${pageNumber === this.currentPage ? 'active' : ''}`;
        pageBtn.textContent = pageNumber;
        pageBtn.addEventListener('click', () => {
            this.currentPage = pageNumber;
            this.applySortingAndPagination();
            this.updatePaginationControls();
        });
        this.paginationPages.appendChild(pageBtn);
    }

    addEllipsis() {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        this.paginationPages.appendChild(ellipsis);
    }

    changePage(delta) {
        const newPage = this.currentPage + delta;
        const totalPages = Math.ceil(this.filteredFriends.length / this.pageSize);

        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.applySortingAndPagination();
            this.updatePaginationControls();
        }
    }

    checkPaginationNeeded() {
        if (this.filteredFriends.length > this.pageSize) {
            this.paginationContainer.style.display = 'flex';
        } else {
            this.paginationContainer.style.display = 'none';
        }
    }

    checkEmptyState() {
        if (this.filteredFriends.length === 0 && this.allFriends.length === 0) {
            this.emptyState.style.display = 'block';
        } else {
            this.emptyState.style.display = 'none';
        }
    }

    openCreateModal() {
        this.editingFriendId = null;
        this.imageChanged = false;

        document.getElementById('modalTitle').textContent = 'Добавить запись';
        document.getElementById('friendForm').reset();
        document.getElementById('friendId').value = '';

        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('currentImage').style.display = 'none';
        document.getElementById('fileInfo').textContent = 'Файл не выбран';

        this.clearFormErrors();

        document.getElementById('friendModal').classList.add('active');
        document.getElementById('fio').focus();
    }

    async editFriend(friendId) {
        try {
            const response = await fetch(`/api/friends/${friendId}`);
            if (!response.ok) throw new Error('Ошибка загрузки данных');

            const friend = await response.json();
            this.editingFriendId = friendId;
            this.imageChanged = false;

            document.getElementById('modalTitle').textContent = 'Редактировать запись';
            document.getElementById('friendId').value = friend.id;
            document.getElementById('fio').value = friend.fio || '';
            document.getElementById('email').value = friend.email || '';

            if (friend.birthDate) {
                const date = this.parseDate(friend.birthDate);
                if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    document.getElementById('dateOfBirth').value = `${year}-${month}-${day}`;
                }
            }

            document.getElementById('description').value = friend.description || '';

            this.clearFormErrors();

            const currentImage = document.getElementById('currentImage');
            const currentImageSrc = document.getElementById('currentImageSrc');
            const imagePreview = document.getElementById('imagePreview');

            if (friend.imageUrl) {
                currentImageSrc.src = friend.imageUrl;
                currentImage.style.display = 'block';
                imagePreview.style.display = 'none';
            } else {
                currentImage.style.display = 'none';
                imagePreview.style.display = 'none';
            }

            document.getElementById('fileInfo').textContent = 'Файл не выбран';

            document.getElementById('friendModal').classList.add('active');
            document.getElementById('fio').focus();

        } catch (error) {
            console.error('Error loading friend:', error);
            this.showNotification('Ошибка загрузки данных друга', 'error');
        }
    }

    deleteFriend(friendId) {
        this.deletingFriendId = friendId;
        document.getElementById('deleteModal').classList.add('active');
    }

    async confirmDelete() {
        if (!this.deletingFriendId) return;

        const friendId = this.deletingFriendId;
        const csrfToken = this.getCsrfToken();
        const csrfHeader = this.getCsrfHeaderName();

        if (!csrfToken) {
            this.showNotification('Ошибка безопасности', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/friends/delete/${friendId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    [csrfHeader]: csrfToken
                }
            });

            if (response.ok) {
                this.showNotification('Запись успешно удалёна', 'success');
                this.closeDeleteModal();
                await this.loadFriends();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error deleting friend:', error);
            this.showNotification('Ошибка удаления записи', 'error');
        }
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('active');
        this.deletingFriendId = null;
    }

    closeModal() {
        document.getElementById('friendModal').classList.remove('active');
        this.editingFriendId = null;
        this.imageChanged = false;
    }

    clearFormErrors() {
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        if (!this.validateForm()) {
            return;
        }

        const form = e.target;
        const formData = new FormData(form);

        if (this.editingFriendId) {
            formData.append('id', this.editingFriendId);
        }

        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

        try {
            const csrfToken = this.getCsrfToken();
            const csrfHeader = this.getCsrfHeaderName();

            if (!csrfToken) {
                throw new Error('CSRF token not found');
            }

            const url = this.editingFriendId ? '/api/friends/update' : '/api/friends/create';

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    [csrfHeader]: csrfToken
                },
                body: formData
            });

            if (response.status === 201 || response.ok) {
                this.showNotification(
                    this.editingFriendId ? 'Запись успешно обновлена' : 'Запись успешно добавлена',
                    'success'
                );

                this.closeModal();
                await this.loadFriends();

            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);

                try {
                    const errorData = JSON.parse(errorText);
                    this.displayValidationErrors(errorData);
                } catch {
                    throw new Error(errorText || 'Ошибка сервера');
                }
            }
        } catch (error) {
            console.error('Error saving friend:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    validateForm() {
        let isValid = true;
        this.clearFormErrors();

        const fio = document.getElementById('fio').value.trim();
        if (fio.length < 4) {
            document.getElementById('fioError').textContent = 'ФИО должно содержать минимум 4 символа';
            document.getElementById('fio').classList.add('error');
            isValid = false;
        }

        const email = document.getElementById('email').value.trim();
        if (email && !this.isValidEmail(email)) {
            document.getElementById('emailError').textContent = 'Неверный формат email';
            document.getElementById('email').classList.add('error');
            isValid = false;
        }

        const dateOfBirth = document.getElementById('dateOfBirth').value;
        if (!dateOfBirth) {
            document.getElementById('dateOfBirthError').textContent = 'Дата рождения обязательна';
            document.getElementById('dateOfBirth').classList.add('error');
            isValid = false;
        } else {
            const date = new Date(dateOfBirth);
            const today = new Date();
            if (date > today) {
                document.getElementById('dateOfBirthError').textContent = 'Дата рождения не может быть в будущем';
                document.getElementById('dateOfBirth').classList.add('error');
                isValid = false;
            }
        }

        return isValid;
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    displayValidationErrors(errorData) {
        this.clearFormErrors();

        if (errorData.errors) {
            errorData.errors.forEach(error => {
                const field = error.field.toLowerCase();
                const errorElement = document.getElementById(`${field}Error`);
                if (errorElement) {
                    errorElement.textContent = error.message;
                    const inputElement = document.getElementById(field);
                    if (inputElement) {
                        inputElement.classList.add('error');
                    }
                }
            });
        }
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            document.getElementById('imageError').textContent = 'Размер файла превышает 10MB';
            e.target.value = '';
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            document.getElementById('imageError').textContent = 'Поддерживаются только изображения (JPG, PNG, GIF, WEBP)';
            e.target.value = '';
            return;
        }

        document.getElementById('fileInfo').textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        document.getElementById('imageError').textContent = '';

        const reader = new FileReader();
        reader.onload = (event) => {
            const previewImage = document.getElementById('previewImage');
            const imagePreview = document.getElementById('imagePreview');
            const currentImage = document.getElementById('currentImage');

            previewImage.src = event.target.result;
            imagePreview.style.display = 'block';
            currentImage.style.display = 'none';
        };
        reader.readAsDataURL(file);

        this.imageChanged = true;
    }

    removeImage() {
        document.getElementById('image').value = '';
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('fileInfo').textContent = 'Файл не выбран';
        this.imageChanged = true;

        if (this.editingFriendId) {
            const currentImage = document.getElementById('currentImage');
            currentImage.style.display = 'block';
        }
    }

    showNotification(message, type = 'success') {
        const oldNotifications = document.querySelectorAll('.notification');
        oldNotifications.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        });
    }

    getCsrfToken() {
        return document.querySelector('meta[name="_csrf"]')?.content;
    }

    getCsrfHeaderName() {
        return document.querySelector('meta[name="_csrf_header"]')?.content || 'X-CSRF-TOKEN';
    }

    parseDate(dateString) {
        if (!dateString) return null;

        const formats = [
            dateString => {
                const match = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                if (match) {
                    return new Date(match[1], match[2] - 1, match[3]);
                }
                return null;
            },
            dateString => {
                const match = dateString.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
                if (match) {
                    return new Date(match[3], match[2] - 1, match[1]);
                }
                return null;
            },
            dateString => {
                try {
                    const date = new Date(dateString);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                } catch (e) {
                    return null;
                }
                return null;
            }
        ];

        for (const format of formats) {
            const result = format(dateString);
            if (result) {
                result.setHours(0, 0, 0, 0);
                return result;
            }
        }

        return null;
    }

    getNextBirthday(birthDate) {
        if (!birthDate) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentYear = today.getFullYear();
        const birthdayThisYear = new Date(
            currentYear,
            birthDate.getMonth(),
            birthDate.getDate()
        );

        if (birthdayThisYear >= today) {
            return birthdayThisYear;
        } else {
            return new Date(
                currentYear + 1,
                birthDate.getMonth(),
                birthDate.getDate()
            );
        }
    }

    calculateAge(birthDate, referenceDate = new Date()) {
        if (!birthDate) return 0;

        const age = referenceDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
            return age - 1;
        }

        return age;
    }

    formatDateShort(date) {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FriendsApp();
    window.app = app;

    window.openCreateModal = () => app.openCreateModal();
    window.closeModal = () => app.closeModal();
    window.closeDeleteModal = () => app.closeDeleteModal();
});