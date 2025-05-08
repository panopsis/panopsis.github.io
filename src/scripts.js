document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    const emailLink = document.getElementById('emailLink');
    if (emailLink) {
        const encodedEmail = 'bWlrZUBwYW5vcHNpcy5jbw==';
        
        try {
            const decodedEmail = atob(encodedEmail);
            emailLink.href = 'mailto:' + decodedEmail + '?subject=Let\'s get started';
            emailLink.textContent = 'Get started: ' + decodedEmail;
            console.log('Email link configured successfully');
        } catch (e) {
            console.error('Failed to decode email:', e);
        }
    }

    document.documentElement.style.setProperty('--primary-accent-rgb', '255, 103, 0');
    document.documentElement.style.setProperty('--secondary-accent-rgb', '0, 208, 201');
});
