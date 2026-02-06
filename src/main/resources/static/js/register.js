class RegisterManager {
    constructor() {
        this.activeAlerts = new Set();
        this.csrfToken = this.getCsrfToken();
        this.csrfHeaderName = this.getCsrfHeaderName();
        this.init();
    }

    getCsrfToken() {
        const metaToken = document.querySelector('meta[name="_csrf"]');
        return metaToken ? metaToken.getAttribute('content') : null;
    }

    getCsrfHeaderName() {
        const metaHeader = document.querySelector('meta[name="_csrf_header"]');
        return metaHeader ? metaHeader.getAttribute('content') : 'X-CSRF-TOKEN';
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        const switchToLogin = document.getElementById('switchToLogin');

        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/login';
            });
        }

        this.setupPasswordToggles();
        this.setupInputListeners();
        this.disableBrowserPasswordIcons();
        this.setupRegisterForm();
    }

    disableBrowserPasswordIcons() {
        const style = document.createElement('style');
        style.textContent = `
            input[type="password"]::-ms-reveal,
            input[type="password"]::-ms-clear {
                display: none !important;
            }

            input[type="password"]::-webkit-credentials-auto-fill-button {
                display: none !important;
                visibility: hidden !important;
                position: absolute !important;
                right: -9999px !important;
            }

            input[type="password"]::-moz-focus-inner {
                border: 0 !important;
            }

            input:-webkit-autofill,
            input:-webkit-autofill:hover,
            input:-webkit-autofill:focus {
                -webkit-box-shadow: 0 0 0px 1000px #f8f9fa inset !important;
                transition: background-color 5000s ease-in-out 0s;
            }
        `;
        document.head.appendChild(style);
    }

    setupPasswordToggles() {
        const toggleButtons = document.querySelectorAll('.toggle-password');
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const input = e.currentTarget.previousElementSibling;
                const icon = e.currentTarget.querySelector('i');

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }

                input.focus();
            });
        });
    }

    setupInputListeners() {
        const allInputs = document.querySelectorAll('.auth-form input');
        allInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.hideAlertOnInput();
                this.clearError(input.id);
            });

            input.addEventListener('focus', () => {
                this.hideAlertOnInput();
            });
        });
    }

    hideAlertOnInput() {
        const alert = document.getElementById('registerAlert');
        if (alert && alert.style.display !== 'none') {
            this.hideAlert(alert);
        }
    }

    setupRegisterForm() {
        const registerForm = document.getElementById('registerForm');
        if (!registerForm) return;

        this.setupRealTimeValidation();

        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
    }

    setupRealTimeValidation() {
        const emailInput = document.getElementById('regEmail');
        const loginInput = document.getElementById('login');
        const passwordInput = document.getElementById('regPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        if (emailInput) {
            emailInput.addEventListener('blur', () => this.validateEmail(emailInput.value));
        }

        if (loginInput) {
            loginInput.addEventListener('blur', () => this.validateLogin(loginInput.value));
        }

        if (passwordInput) {
            passwordInput.addEventListener('blur', () => {
                this.validatePassword(passwordInput.value);
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('blur', () => {
                this.validatePasswordConfirmation(
                    document.getElementById('regPassword').value,
                    confirmPasswordInput.value
                );
            });
        }
    }

    isHtmlResponse(contentType) {
        return contentType && contentType.includes('text/html');
    }

    isJsonResponse(contentType) {
        return contentType && contentType.includes('application/json');
    }

    async handleRegister() {
        const email = document.getElementById('regEmail').value;
        const login = document.getElementById('login').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const registerBtn = document.getElementById('registerBtn');
        const spinner = document.getElementById('registerSpinner');
        const alert = document.getElementById('registerAlert');

        this.clearErrors(['regEmail', 'login', 'regPassword', 'confirmPassword']);
        this.hideAlert(alert);

        if (!this.validateRegisterForm(email, login, password, confirmPassword)) {
            return;
        }

        registerBtn.disabled = true;
        spinner.style.display = 'inline-block';

        try {
            const csrfHeaderName = this.getCsrfHeaderName();

            const formData = new URLSearchParams();
            formData.append('email', email);
            formData.append('login', login);
            formData.append('password', password);

            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            };

            if (this.csrfToken && csrfHeaderName) {
                headers[csrfHeaderName] = this.csrfToken;
            }

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            const contentType = response.headers.get('content-type');

            if (this.isHtmlResponse(contentType)) {
                this.showAlert(alert, 'error', 'Ошибка сервера: получен HTML вместо JSON. Проверьте настройки контроллера.');
                return;
            }

            if (response.status === 403) {
                throw new Error('CSRF токен недействителен или отсутствует');
            }

            if (response.ok) {
                try {
                    const data = await response.json();
                    this.showAlert(alert, 'success', data.message || 'Регистрация успешна!');

                    setTimeout(() => {
                        window.location.href = data.redirect || '/login';
                    }, 2000);
                } catch (jsonError) {
                    console.error('Ошибка парсинга JSON:', jsonError);
                    this.showAlert(alert, 'success', 'Регистрация успешна!');

                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                }
            } else if (response.status === 500) {
                if (this.isJsonResponse(contentType)) {
                    try {
                        const errorData = await response.json();
                        this.showAlert(alert, 'error', errorData.message || 'Ошибка сервера. Попробуйте позже.');
                    } catch (jsonError) {
                        this.showAlert(alert, 'error', 'Ошибка сервера. Попробуйте позже.');
                    }
                } else {
                    this.showAlert(alert, 'error', 'Ошибка сервера. Попробуйте позже.');
                }
            } else if (response.status === 400) {
                if (this.isJsonResponse(contentType)) {
                    try {
                        const errorData = await response.json();
                        if (errorData.errors) {
                            Object.keys(errorData.errors).forEach(key => {
                                this.showError(key, errorData.errors[key]);
                            });
                        }
                        this.showAlert(alert, 'error', errorData.message || 'Ошибка регистрации');
                    } catch (jsonError) {
                        this.showAlert(alert, 'error', 'Ошибка при обработке данных');
                    }
                } else {
                    this.showAlert(alert, 'error', 'Ошибка регистрации');
                }
            } else {
                this.showAlert(alert, 'error', `Ошибка ${response.status}`);
            }
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            if (error.message.includes('CSRF')) {
                this.showAlert(alert, 'error', 'Ошибка безопасности. Пожалуйста, обновите страницу и попробуйте снова.');
            } else {
                this.showAlert(alert, 'error', 'Ошибка соединения с сервером');
            }
        } finally {
            registerBtn.disabled = false;
            spinner.style.display = 'none';
        }
    }

    validateRegisterForm(email, login, password, confirmPassword) {
        let isValid = true;

        if (!this.validateEmail(email)) {
            isValid = false;
        }

        if (!this.validateLogin(login)) {
            isValid = false;
        }

        if (!this.validatePassword(password)) {
            isValid = false;
        }

        if (!this.validatePasswordConfirmation(password, confirmPassword)) {
            isValid = false;
        }

        return isValid;
    }

    validateEmail(email) {
        if (!email) {
            this.showError('regEmail', 'Поле обязательно для заполнения');
            return false;
        }

        if (!this.isValidEmail(email)) {
            this.showError('regEmail', 'Введите корректный email адрес');
            return false;
        }

        this.clearError('regEmail');
        return true;
    }

    validateLogin(login) {
        if (!login) {
            this.showError('login', 'Поле обязательно для заполнения');
            return false;
        }

        if (login.length < 6) {
            this.showError('login', 'Минимум 6 символов');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(login)) {
            this.showError('login', 'Только буквы, цифры и подчеркивания');
            return false;
        }

        this.clearError('login');
        return true;
    }

    validatePassword(password) {
        if (!password) {
            this.showError('regPassword', 'Поле обязательно для заполнения');
            return false;
        }

        let errors = [];

        if (password.length < 8) {
            errors.push('Минимум 8 символов');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Строчные буквы латинского алфавита');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Заглавные буквы латинского алфавита');
        }
        if (!/\d/.test(password)) {
            errors.push('Цифры');
        }
        if (!/[!$%^()_+\-=\[\]{};:'",.<>]/.test(password)) {
            errors.push('Специальные символы (!$%^()_+-=[]{};:\",.<>)');
        }

        if (errors.length > 0) {
            const message = 'Требования: ' + errors.join(', ');
            this.showError('regPassword', message);
            return false;
        }

        this.clearError('regPassword');
        return true;
    }

    validatePasswordConfirmation(password, confirmPassword) {
        if (!confirmPassword) {
            this.showError('confirmPassword', 'Поле обязательно для заполнения');
            return false;
        }

        if (password !== confirmPassword) {
            this.showError('confirmPassword', 'Пароли не совпадают');
            return false;
        }

        this.clearError('confirmPassword');
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showAlert(element, type, message) {
        element.textContent = message;
        element.className = `alert ${type}`;
        element.style.display = 'flex';
        element.style.opacity = '1';
        element.classList.remove('hiding');

        const alertId = Date.now();
        this.activeAlerts.add(alertId);

        setTimeout(() => {
            if (this.activeAlerts.has(alertId)) {
                this.hideAlert(element);
            }
        }, 25000);
    }

    hideAlert(element) {
        if (element.style.display === 'none') return;

        element.classList.add('hiding');

        setTimeout(() => {
            element.style.display = 'none';
            element.classList.remove('hiding');
        }, 500);
    }

    showError(inputId, message) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.classList.add('error');

        let tooltip = input.parentNode.querySelector('.error-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'error-tooltip';

            input.parentNode.appendChild(tooltip);
        }

        tooltip.textContent = message;
    }

    clearError(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.classList.remove('error');

        const tooltip = input.parentNode.querySelector('.error-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    clearErrors(inputIds) {
        inputIds.forEach(id => this.clearError(id));
    }
}

if (document.getElementById('registerForm')) {
    document.addEventListener('DOMContentLoaded', () => {
        new RegisterManager();
    });
}