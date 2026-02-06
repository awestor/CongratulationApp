class LoginValidator {
    constructor() {
        this.activeAlerts = new Set();
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        const switchToRegister = document.getElementById('switchToRegister');

        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/register';
            });
        }

        this.setupPasswordToggles();
        this.setupInputListeners();
        this.setupFormValidation();
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
        const alert = document.getElementById('loginAlert');
        if (alert && alert.style.display !== 'none') {
            this.hideAlert(alert);
        }
    }

    setupFormValidation() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        loginForm.addEventListener('submit', (e) => {
            if (!this.validateForm()) {
                e.preventDefault();
            }
        });
    }

    validateForm() {
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        this.clearErrors(['email', 'password']);

        return this.validateLoginForm(email, password);
    }

    validateLoginForm(email, password) {
        let isValid = true;

        if (!email) {
            this.showError('email', 'Поле обязательно для заполнения');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showError('email', 'Введите корректный email адрес');
            isValid = false;
        }

        if (!password) {
            this.showError('password', 'Поле обязательно для заполнения');
            isValid = false;
        }

        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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

    hideAlert(element) {
        if (element.style.display === 'none') return;

        element.classList.add('hiding');

        setTimeout(() => {
            element.style.display = 'none';
            element.classList.remove('hiding');
        }, 500);
    }
}

if (document.getElementById('loginForm')) {
    document.addEventListener('DOMContentLoaded', () => {
        new LoginValidator();
    });
}