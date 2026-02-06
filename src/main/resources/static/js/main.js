class MainApp {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.selectedDate.setHours(0, 0, 0, 0);

        this.today = new Date();
        this.today.setHours(0, 0, 0, 0);

        this.currentPage = 1;
        this.itemsPerPage = 5;
        this.totalPages = 1;

        this.calendarData = new Map();
        this.selectedDateFriends = [];

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
        this.updateSelectedDateDisplay();

        await this.loadFriendsForSelectedDate();

        await Promise.all([
            this.generateCalendar(),
            this.loadUpcomingBirthdays()
        ]);
    }

    initElements() {
        this.calendarDays = document.getElementById('calendar-days');
        this.currentMonthYear = document.getElementById('current-month-year');
        this.selectedDateTitle = document.getElementById('selected-date-title');
        this.selectedDateFriendsElement = document.getElementById('selected-date-friends');
        this.upcomingBirthdaysList = document.getElementById('upcoming-birthdays-list');
    }

    setupEventListeners() {
        document.getElementById('prev-month').addEventListener('click', async () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            await this.generateCalendar();
        });

        document.getElementById('next-month').addEventListener('click', async () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            await this.generateCalendar();
        });

        document.getElementById('today-btn').addEventListener('click', async () => {
            this.currentDate = new Date();
            this.selectedDate = new Date();
            this.selectedDate.setHours(0, 0, 0, 0);
            await this.generateCalendar();
            this.updateSelectedDateDisplay();
            await this.loadFriendsForSelectedDate();
        });

        document.getElementById('prev-page').addEventListener('click', () => this.changePage(-1));
        document.getElementById('next-page').addEventListener('click', () => this.changePage(1));
    }

    updateSelectedDateDisplay() {
        document.querySelector('.date-display').textContent = this.formatDate(this.selectedDate);
    }

    async generateCalendar() {
        this.calendarDays.innerHTML = '';
        this.updateMonthYearDisplay();

        const firstDayOfMonth = new Date(
            this.currentDate.getFullYear(),
            this.currentDate.getMonth(),
            1
        );

        let firstDayIndex = firstDayOfMonth.getDay();
        firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

        const firstCalendarDate = new Date(firstDayOfMonth);
        firstCalendarDate.setDate(firstCalendarDate.getDate() - firstDayIndex);

        const lastCalendarDate = new Date(firstCalendarDate);
        lastCalendarDate.setDate(firstCalendarDate.getDate() + 41);

        await this.loadCalendarData(firstCalendarDate, lastCalendarDate);

        const todayStr = this.today.toISOString().split('T')[0];
        const selectedDateStr = this.selectedDate.toISOString().split('T')[0];
        const currentMonth = this.currentDate.getMonth();
        const currentYear = this.currentDate.getFullYear();

        for (let i = 0; i < 42; i++) {
            const date = new Date(firstCalendarDate);
            date.setDate(firstCalendarDate.getDate() + i);

            const adjustedDate = new Date(date);
            adjustedDate.setDate(date.getDate() + 1);
            const dateStr = adjustedDate.toISOString().split('T')[0];

            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            dayElement.textContent = date.getDate();
            dayElement.dataset.date = dateStr;

            const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;

            if (!isCurrentMonth) {
                dayElement.classList.add('other-month');
            }

            if (dateStr === this.adjustDateForApi(this.today).toISOString().split('T')[0]) {
                dayElement.classList.add('today');
            }

            if (dateStr === this.adjustDateForApi(this.selectedDate).toISOString().split('T')[0]) {
                dayElement.classList.add('selected-date');
            }

            this.applyDayStyle(dayElement, dateStr);

            if (isCurrentMonth) {
                dayElement.addEventListener('click', () => this.handleDayClick(date, dayElement));
            }

            this.calendarDays.appendChild(dayElement);
        }
    }

    adjustDateForApi(date) {
        const adjusted = new Date(date);
        adjusted.setDate(date.getDate() + 1);
        return adjusted;
    }

    async loadCalendarData(startDate, endDate) {
        const startStr = this.adjustDateForApi(startDate).toISOString().split('T')[0];
        const endStr = this.adjustDateForApi(endDate).toISOString().split('T')[0];

        try {
            const response = await fetch(`/api/calendar/day-data?startDate=${startStr}&endDate=${endStr}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            this.calendarData.clear();

            const friendData = {};
            if (data.keysFriends && Array.isArray(data.keysFriends) &&
                data.required && Array.isArray(data.required)) {
                data.keysFriends.forEach((dateStr, index) => {
                    friendData[dateStr] = {
                        friends: Number(data.required[index]) || 0
                    };
                });
            }

            if (data.keysCong && Array.isArray(data.keysCong) &&
                data.greet && Array.isArray(data.greet)) {
                data.keysCong.forEach((dateStr, index) => {
                    if (friendData[dateStr]) {
                        friendData[dateStr].congrats = Number(data.greet[index]) || 0;
                    } else {
                        friendData[dateStr] = {
                            friends: 0,
                            congrats: Number(data.greet[index]) || 0
                        };
                    }
                });
            }

            Object.keys(friendData).forEach(dateStr => {
                this.calendarData.set(dateStr, friendData[dateStr]);
            });

        } catch (error) {
            console.error('Error loading calendar data:', error);
        }
    }

    applyDayStyle(element, dateStr) {
        const data = this.calendarData.get(dateStr);

        element.classList.remove(
            'no-congratulations',
            'partial-congratulations',
            'all-congratulated',
            'no-friends'
        );

        if (data) {
            if (data.friends > 0) {
                if (data.congrats >= data.friends) {
                    element.classList.add('all-congratulated');
                } else if (data.congrats > 0) {
                    element.classList.add('partial-congratulations');
                } else {
                    element.classList.add('no-congratulations');
                }
            } else {
                element.classList.add('no-friends');
            }
        } else {
            element.classList.add('no-friends');
        }
    }

    async handleDayClick(date, element) {
        const allDayElements = document.querySelectorAll('.day');
        allDayElements.forEach(dayElement => {
            dayElement.classList.remove('selected-date');
        });

        this.selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        this.selectedDate.setHours(0, 0, 0, 0);

        element.classList.add('selected-date');
        this.updateSelectedDateDisplay();
        await this.loadFriendsForSelectedDate();
    }

    async loadFriendsForSelectedDate() {
        const adjustedDate = this.adjustDateForApi(this.selectedDate);
        const dateStr = adjustedDate.toISOString().split('T')[0];

        if (this.selectedDateFriendsElement.children.length === 1 ||
            this.selectedDateFriendsElement.querySelector('.empty-state')) {
            this.selectedDateFriendsElement.innerHTML = `
                <div class="empty-state">
                    <div class="loading-spinner"></div>
                    <span>Загрузка данных...</span>
                </div>
            `;
        }

        try {
            const response = await fetch(`/api/friends/by-date?date=${dateStr}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.selectedDateFriends = await response.json();
            this.renderFriendsList();
        } catch (error) {
            console.error('Error loading friends:', error);
            this.selectedDateFriendsElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Не удалось загрузить данные</p>
                    <button class="retry-btn" onclick="app.loadFriendsForSelectedDate()">
                        Повторить
                    </button>
                </div>
            `;
        }
    }

    async sendCongratulation(friendId, friendName) {
        try {
            const todayAdjusted = this.adjustDateForApi(this.today);
            const requestData = {
                congratulationDate: todayAdjusted.toISOString().split('T')[0],
                friendId: friendId
            };

            const csrfToken = document.querySelector('meta[name="_csrf"]')?.content;
            const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content || 'X-CSRF-TOKEN';

            const getCsrfTokenFromCookies = () => {
                const name = 'XSRF-TOKEN';
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
                return null;
            };

            const token = csrfToken || getCsrfTokenFromCookies();

            if (!token) {
                console.error('CSRF token not found');
                this.showNotification(`Ошибка: CSRF токен не найден`, 'error');
                return false;
            }

            const response = await fetch('/api/congratulation/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [csrfHeader]: token
                },
                credentials: 'same-origin',
                body: JSON.stringify(requestData)
            });

            if (response.status === 201) {
                this.showNotification(`Поздравление для ${friendName} отправлено!`, 'success');

                const isTodaySelected = this.selectedDate.toDateString() === this.today.toDateString();
                if (isTodaySelected) {
                    await this.loadFriendsForSelectedDate();
                }

                await this.generateCalendar();

                return true;
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                this.showNotification(`Ошибка отправки поздравления для ${friendName} (${response.status})`, 'error');
                return false;
            }
        } catch (error) {
            console.error('Error sending congratulation:', error);
            this.showNotification(`Ошибка отправки поздравления для ${friendName}`, 'error');
            return false;
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

    async loadUpcomingBirthdays() {
        try {
            const response = await fetch(`/api/friends/upcoming?page=${this.currentPage}&size=${this.itemsPerPage}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            let friends = [];
            let totalPages = 1;

            if (data.content && Array.isArray(data.content)) {
                friends = data.content;
                totalPages = data.totalPages || 1;
            } else if (Array.isArray(data)) {
                friends = data;
            } else if (data.friends && Array.isArray(data.friends)) {
                friends = data.friends;
                totalPages = Math.ceil((data.total || friends.length) / this.itemsPerPage);
            }

            this.renderUpcomingBirthdays(friends);
            this.setupPagination(totalPages);

        } catch (error) {
            console.error('Error loading upcoming birthdays:', error);
            this.upcomingBirthdaysList.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle"></i>
                        Не удалось загрузить данные
                        <button class="retry-btn" onclick="app.loadUpcomingBirthdays()" style="margin-left: 10px;">
                            Повторить
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    renderFriendsList() {
        if (!this.selectedDateFriends || this.selectedDateFriends.length === 0) {
            this.selectedDateFriendsElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>На эту дату нет дней рождений</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.selectedDateFriends.forEach(friend => {
            const birthDate = this.parseDate(friend.birthDate);
            const age = this.calculateAge(birthDate);
            const displayName = friend.fio || 'Неизвестно';
            const isCongratulated = friend.cong === true;
            const isToday = this.selectedDate.toDateString() === this.today.toDateString();

            html += `
                <div class="friend-item" data-friend-id="${friend.id}">
                    ${friend.imageUrl ? `
                        <img src="${friend.imageUrl}"
                             alt="${displayName}"
                             class="friend-avatar"
                             onerror="this.onerror=null; this.style.display='none'; this.parentElement.querySelector('.friend-avatar-placeholder').style.display='flex'">
                    ` : ''}
                    <div class="friend-avatar-placeholder" ${friend.imageUrl ? 'style="display: none;"' : ''}>
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="friend-info">
                        <div class="friend-name">${this.escapeHtml(displayName)}</div>
                        <div class="friend-details">
                            <div class="friend-date">
                                <i class="fas fa-birthday-cake"></i>
                                ${this.formatDateShort(birthDate)}
                            </div>
                            <div class="friend-age">${age} лет</div>
                            ${friend.email ? `
                                <div class="friend-email">
                                    <i class="fas fa-envelope"></i>
                                    ${this.escapeHtml(friend.email)}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="friend-actions">
                        ${isToday && !isCongratulated ? `
                            <button class="congratulate-btn"
                                    onclick="app.handleCongratulateClick(${friend.id}, '${this.escapeHtml(displayName)}')"
                                    title="Отправить поздравление">
                                <i class="fas fa-envelope"></i>
                            </button>
                        ` : ''}
                        ${isCongratulated ? `
                            <div class="congratulated-badge" title="Поздравление отправлено">
                                <i class="fas fa-check-circle"></i>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        this.selectedDateFriendsElement.innerHTML = html;
    }

    async handleCongratulateClick(friendId, friendName) {
        const confirmed = confirm(`Отправить поздравление для ${friendName}?`);
        if (confirmed) {
            const button = document.querySelector(`.congratulate-btn[onclick*="${friendId}"]`);
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }

            const success = await this.sendCongratulation(friendId, friendName);

            if (button) {
                if (success) {
                    button.innerHTML = '<i class="fas fa-check"></i>';
                    button.classList.add('success');
                    setTimeout(() => {
                        button.style.display = 'none';
                        const friendItem = button.closest('.friend-item');
                        if (friendItem) {
                            const actionsDiv = friendItem.querySelector('.friend-actions');
                            actionsDiv.innerHTML = `
                                <div class="congratulated-badge" title="Поздравление отправлено">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                            `;
                        }
                    }, 1000);
                } else {
                    button.disabled = false;
                    button.innerHTML = '<i class="fas fa-envelope"></i>';
                }
            }
        }
    }

    renderUpcomingBirthdays(friends) {
        if (!friends || friends.length === 0) {
            this.upcomingBirthdaysList.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center;">
                        Нет предстоящих дней рождений
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        friends.forEach(friend => {
            const birthDate = this.parseDate(friend.birthDate);
            if (!birthDate) {
                console.warn('Invalid birth date:', friend.birthDate);
                return;
            }

            const nextBirthday = this.getNextBirthday(birthDate);
            const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
            const age = this.calculateAge(birthDate, nextBirthday);
            const displayName = friend.fio || 'Неизвестно';

            let daysClass = 'future';
            if (daysUntil === 0) daysClass = 'today';
            else if (daysUntil === 1) daysClass = 'tomorrow';
            else if (daysUntil <= 3) daysClass = 'soon';

            html += `
                <tr>
                    <td class="friend-name-cell">
                        <div class="friend-name-with-avatar">
                            ${friend.imageUrl ? `
                                <img src="${friend.imageUrl}"
                                     alt="${displayName}"
                                     class="avatar-small"
                                     onerror="this.onerror=null; this.style.display='none'; this.parentElement.querySelector('.avatar-placeholder-small').style.display='flex'">
                            ` : ''}
                            <div class="avatar-placeholder-small" ${friend.imageUrl ? 'style="display: none;"' : ''}>
                                <i class="fas fa-user"></i>
                            </div>
                            <span>${this.escapeHtml(displayName)}</span>
                        </div>
                    </td>
                    <td>${this.formatDateShort(birthDate)}</td>
                    <td>
                        <span class="days-until ${daysClass}">
                            ${daysUntil === 0 ? 'Сегодня!' :
                              daysUntil === 1 ? 'Завтра' :
                              `Через ${daysUntil} дн.`}
                        </span>
                    </td>
                </tr>
            `;
        });

        this.upcomingBirthdaysList.innerHTML = html;
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

        console.error('Unable to parse date:', dateString);
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

    setupPagination(totalPages) {
        this.totalPages = totalPages;
        const pagination = document.getElementById('pagination');
        const pageNumbers = document.getElementById('page-numbers');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;

        let pageNumbersHtml = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbersHtml += `
                <div class="page-number ${i === this.currentPage ? 'active' : ''}"
                     onclick="app.changePageTo(${i})">
                    ${i}
                </div>
            `;
        }

        pageNumbers.innerHTML = pageNumbersHtml;
    }

    changePage(delta) {
        const newPage = this.currentPage + delta;
        if (newPage < 1 || newPage > this.totalPages) return;
        this.currentPage = newPage;
        this.loadUpcomingBirthdays();
    }

    changePageTo(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.loadUpcomingBirthdays();
    }

    updateMonthYearDisplay() {
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];

        const month = monthNames[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        this.currentMonthYear.textContent = `${month} ${year}`;
    }

    formatDate(date) {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
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
    app = new MainApp();
    window.app = app;
});