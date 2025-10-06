// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Smooth scrolling for navigation links
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(15, 23, 42, 0.95)';
    } else {
        navbar.style.background = 'rgba(15, 23, 42, 0.9)';
    }
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('aos-animate');
        }
    });
}, observerOptions);

// Observe all elements with data-aos attribute
document.querySelectorAll('[data-aos]').forEach(el => {
    observer.observe(el);
});

// Demo interaction simulation
function simulateDemo() {
    const voiceInput = document.querySelector('.voice-input');
    const processing = document.querySelector('.processing');
    const result = document.querySelector('.result');
    
    // Hide all steps initially
    voiceInput.style.display = 'none';
    processing.style.display = 'none';
    result.style.display = 'none';
    
    // Show steps sequentially
    setTimeout(() => {
        voiceInput.style.display = 'flex';
        voiceInput.style.animation = 'fadeIn 0.5s ease';
    }, 1000);
    
    setTimeout(() => {
        voiceInput.style.display = 'none';
        processing.style.display = 'flex';
        processing.style.animation = 'fadeIn 0.5s ease';
    }, 4000);
    
    setTimeout(() => {
        processing.style.display = 'none';
        result.style.display = 'flex';
        result.style.animation = 'fadeIn 0.5s ease';
    }, 7000);
    
    // Loop the demo
    setTimeout(simulateDemo, 12000);
}

// Add fadeIn animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);

// Floating cards animation
function animateFloatingCards() {
    const cards = document.querySelectorAll('.floating-cards .card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 2}s`;
    });
}

// Particle animation enhancement
function createParticles() {
    const container = document.querySelector('.hero-bg-animation');
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
    }
}

// Typing animation for demo text
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.textContent = '';
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Interactive demo commands
const demoCommands = [
    "Deploy an ERC20 token called MyToken with 1000 total supply",
    "Call the transfer function to send 100 tokens to 0x742d...35cc",
    "Check my current 0G balance",
    "Show me the 0G visualization for recent transactions"
];

let currentCommand = 0;

function cycleDemoCommands() {
    const voiceText = document.querySelector('.voice-text');
    typeWriter(voiceText, demoCommands[currentCommand]);
    currentCommand = (currentCommand + 1) % demoCommands.length;
}

// Email form handling
document.querySelector('.contact-form button').addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.querySelector('.email-input').value;
    if (email && email.includes('@')) {
        alert('Thank you for your interest! We\'ll notify you when early access is available.');
        document.querySelector('.email-input').value = '';
    } else {
        alert('Please enter a valid email address.');
    }
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelector('.hero-bg-animation');
    if (parallax) {
        parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// Loading animation for processing state
function animateLoadingDots() {
    const dots = document.querySelectorAll('.loading-dots span');
    dots.forEach((dot, index) => {
        dot.style.animationDelay = `${index * 0.16}s`;
    });
}

// Network card hover effects
document.querySelectorAll('.network-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-5px)';
        card.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.2)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
    });
});

// Feature cards stagger animation
function animateFeatureCards() {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Initialize all animations
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    animateFloatingCards();
    animateFeatureCards();
    simulateDemo();
    cycleDemoCommands();
    setInterval(cycleDemoCommands, 15000);
    animateLoadingDots();
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll reveal animation
const scrollReveal = () => {
    const reveals = document.querySelectorAll('.feature-card, .network-card, .doc-card');
    
    reveals.forEach(element => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < windowHeight - elementVisible) {
            element.classList.add('reveal');
        }
    });
};

window.addEventListener('scroll', scrollReveal);

// Add CSS for reveal animation
const revealStyle = document.createElement('style');
revealStyle.textContent = `
    .feature-card, .network-card, .doc-card {
        opacity: 0;
        transform: translateY(50px);
        transition: all 0.6s ease;
    }
    
    .feature-card.reveal, .network-card.reveal, .doc-card.reveal {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(revealStyle);

// Initialize scroll reveal
scrollReveal();

// Coming Soon Modal System
function showComingSoonModal(feature) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'coming-soon-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeComingSoonModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-tools"></i> Feature Coming Soon!</h3>
                <button class="modal-close" onclick="closeComingSoonModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>We're building something amazing for you. This feature is currently under development.</p>
                
                <div class="feature-details">
                    <h4>What We're Working On:</h4>
                    <ul>
                        <li><i class="fas fa-check"></i> Interactive documentation with live examples</li>
                        <li><i class="fas fa-check"></i> Step-by-step guided tutorials</li>
                        <li><i class="fas fa-check"></i> Real-time 0G network integration</li>
                        <li><i class="fas fa-check"></i> Live command testing interface</li>
                    </ul>
                </div>

                <div class="roadmap-status">
                    <h4>Current Progress:</h4>
                    <div class="status-item completed">
                        <i class="fas fa-check-circle"></i>
                        <span>0G Storage Integration - COMPLETED</span>
                    </div>
                    <div class="status-item in-progress">
                        <i class="fas fa-cog fa-spin"></i>
                        <span>Interactive Documentation - IN PROGRESS</span>
                    </div>
                    <div class="status-item coming-soon">
                        <i class="fas fa-clock"></i>
                        <span>Live Network Integration - COMING SOON</span>
                    </div>
                </div>

                <div class="notification-signup">
                    <h4><i class="fas fa-bell"></i> Get Notified When It's Ready:</h4>
                    <div class="email-form-modal">
                        <input type="email" class="email-input-modal" placeholder="Enter your email address">
                        <button class="btn-primary-modal" onclick="handleModalNotification('${feature}')">
                            <i class="fas fa-paper-plane"></i> Notify Me
                        </button>
                    </div>
                    <div class="success-message-modal" style="display: none;">
                        <i class="fas fa-check-circle"></i> Thanks! We'll notify you when this feature is ready.
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeComingSoonModal()">Close</button>
            </div>
        </div>
    `;

    // Add modal styles
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        .coming-soon-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: modalFadeIn 0.3s ease;
        }

        @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }

        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
        }

        .modal-content {
            background: rgba(15, 15, 15, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 2rem;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            z-index: 10001;
            animation: modalSlideIn 0.3s ease;
        }

        @keyframes modalSlideIn {
            from { opacity: 0; transform: translateY(-50px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h3 {
            color: #fff;
            font-size: 1.5rem;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .modal-header h3 i {
            color: #00d4ff;
        }

        .modal-close {
            background: none;
            border: none;
            color: #b0b0b0;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            transition: all 0.3s ease;
        }

        .modal-close:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.1);
        }

        .modal-body {
            color: #b0b0b0;
            line-height: 1.6;
        }

        .modal-body p {
            margin-bottom: 1.5rem;
        }

        .feature-details, .roadmap-status, .notification-signup {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 1.5rem;
            margin: 1.5rem 0;
        }

        .feature-details h4, .roadmap-status h4, .notification-signup h4 {
            color: #fff;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .feature-details h4 i, .roadmap-status h4 i, .notification-signup h4 i {
            color: #00d4ff;
        }

        .feature-details ul {
            list-style: none;
            padding: 0;
        }

        .feature-details li {
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .feature-details i {
            color: #00d4ff;
            font-size: 0.8rem;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
        }

        .status-item i {
            width: 20px;
            text-align: center;
        }

        .status-item.completed {
            color: #28ca42;
        }

        .status-item.completed i {
            color: #28ca42;
        }

        .status-item.in-progress {
            color: #00d4ff;
        }

        .status-item.coming-soon {
            color: #b0b0b0;
        }

        .email-form-modal {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
        }

        .email-input-modal {
            flex: 1;
            padding: 0.75rem 1rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 25px;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 0.9rem;
        }

        .email-input-modal:focus {
            outline: none;
            border-color: #00d4ff;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
        }

        .email-input-modal::placeholder {
            color: #888;
        }

        .btn-primary-modal {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 25px;
            background: linear-gradient(135deg, #00d4ff, #ff00ff);
            color: #fff;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            white-space: nowrap;
        }

        .btn-primary-modal:hover {
            transform: translateY(-1px);
            box-shadow: 0 5px 15px rgba(0, 212, 255, 0.3);
        }

        .success-message-modal, .error-message-modal {
            margin-top: 1rem;
            padding: 0.75rem;
            border-radius: 8px;
            font-size: 0.9rem;
            display: none;
        }

        .success-message-modal {
            background: rgba(40, 202, 66, 0.2);
            border: 1px solid rgba(40, 202, 66, 0.3);
            color: #28ca42;
        }

        .error-message-modal {
            background: rgba(255, 71, 87, 0.2);
            border: 1px solid rgba(255, 71, 87, 0.3);
            color: #ff4757;
        }

        .modal-footer {
            margin-top: 2rem;
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
        }

        .btn-secondary {
            padding: 0.75rem 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 25px;
            background: transparent;
            color: #fff;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: #00d4ff;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .modal-content {
                width: 95%;
                padding: 1.5rem;
                margin: 1rem;
            }

            .email-form-modal {
                flex-direction: column;
            }

            .modal-footer {
                flex-direction: column;
            }
        }

        /* Prevent body scroll when modal is open */
        body.modal-open {
            overflow: hidden;
        }
    `;

    document.head.appendChild(modalStyles);
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');

    // Add event listeners
    const closeButton = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    
    closeButton.addEventListener('click', closeComingSoonModal);
    overlay.addEventListener('click', closeComingSoonModal);

    // Handle escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeComingSoonModal();
        }
    };
    document.addEventListener('keydown', escapeHandler);

    // Store escape handler for cleanup
    modal.escapeHandler = escapeHandler;
}

function closeComingSoonModal() {
    const modal = document.querySelector('.coming-soon-modal');
    const styles = document.querySelector('style:last-child');
    
    if (modal) {
        //  escape handler
        document.removeEventListener('keydown', modal.escapeHandler);
        
        //  fade out animation
        modal.style.animation = 'modalFadeOut 0.3s ease';
        
        setTimeout(() => {
            modal.remove();
            if (styles && styles.textContent.includes('coming-soon-modal')) {
                styles.remove();
            }
            document.body.classList.remove('modal-open');
        }, 300);
    }
}

function handleModalNotification(feature) {
    const emailInput = document.querySelector('.email-input-modal');
    const notifyBtn = document.querySelector('.btn-primary-modal');
    const successMessage = document.querySelector('.success-message-modal');
    const errorMessage = document.querySelector('.error-message-modal');
    
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email)) {
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        return;
    }
    
    // Show loading state
    notifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
    notifyBtn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        console.log(`Email notification signup for ${feature}:`, email);
        
        // Show success message
        errorMessage.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Reset button
        notifyBtn.innerHTML = '<i class="fas fa-check"></i> Subscribed!';
        notifyBtn.style.background = 'linear-gradient(135deg, #28ca42, #20a020)';
        
        // Clear input
        emailInput.value = '';
        
        // Reset button after delay
        setTimeout(() => {
            notifyBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Notify Me';
            notifyBtn.disabled = false;
            notifyBtn.style.background = 'linear-gradient(135deg, #00d4ff, #ff00ff)';
            successMessage.style.display = 'none';
        }, 3000);
        
    }, 1500);
}

//  fade out animation
const fadeOutStyles = document.createElement('style');
fadeOutStyles.textContent = `
    @keyframes modalFadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); }
    }
`;
document.head.appendChild(fadeOutStyles);
