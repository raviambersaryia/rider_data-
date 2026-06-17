const isLocalDev = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    !window.location.origin.startsWith('http');

const API_BASE_URL = (isLocalDev && window.location.port !== '5001'
    ? 'http://localhost:5001'
    : window.location.origin) + '/api';

function getQueryParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
}

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

let isUnlocked = false;

async function initProfilePage() {
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
        mirror: false
    });

    const riderId = getQueryParam('id');
    isUnlocked = getQueryParam('verified') === 'true';

    const heroSection = document.getElementById('profileHero');
    const notFound = document.getElementById('profileNotFound');
    const themeToggle = document.getElementById('themeToggle');

    if (!riderId) {
        if (heroSection) heroSection.classList.add('hidden');
        if (notFound) notFound.classList.remove('hidden');
        return;
    }

    // Try fetching rider details from API
    let rider = null;
    try {
        console.log(`Fetching rider profile for ID: ${riderId}`);
        const response = await fetch(`${API_BASE_URL}/riders/${riderId}`);
        const result = await response.json();
        if (response.ok && result.success) {
            rider = result.data;
            console.log('Successfully fetched rider from API:', rider);
        }
    } catch (error) {
        console.warn('API fetch failed, falling back to local storage:', error);
    }

    // Fallback to local storage if API fetch failed
    if (!rider) {
        const localRiders = JSON.parse(localStorage.getItem('riders') || localStorage.getItem('ridersData') || '[]');
        rider = localRiders.find(item => String(item.id) === String(riderId));
        if (rider) {
            console.log('Successfully loaded rider from local storage fallback:', rider);
        }
    }

    if (!rider) {
        if (heroSection) heroSection.classList.add('hidden');
        if (notFound) notFound.classList.remove('hidden');
        if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
        return;
    }

    // Bind verification button logic
    const verifyInput = document.getElementById('profileUnlockInput');
    const verifyBtn = document.getElementById('profileUnlockBtn');
    const verifyError = document.getElementById('profileUnlockError');

    if (verifyBtn && verifyInput) {
        const doUnlock = () => {
            const val = verifyInput.value.trim();
            if (!val) {
                verifyError.textContent = 'Please enter verification details.';
                verifyError.style.display = 'block';
                return;
            }
            if (val === String(rider.employeePhone) || val === String(rider.employeeNo)) {
                isUnlocked = true;
                verifyError.style.display = 'none';
                renderRiderProfile(rider);
            } else {
                verifyError.textContent = 'Verification failed. Incorrect Employee ID or Mobile Number.';
                verifyError.style.display = 'block';
            }
        };
        verifyBtn.addEventListener('click', doUnlock);
        verifyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doUnlock();
        });
    }

    renderRiderProfile(rider);
    
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    
    const downloadBtn = document.getElementById('downloadCertificateBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!isUnlocked) {
                alert('🔒 Please verify and unlock the profile to download the certificate.');
                return;
            }
            downloadCertificate(rider);
        });
    }
    
    const printBtn = document.getElementById('printSummaryBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            if (!isUnlocked) {
                alert('🔒 Please verify and unlock the profile to print the summary.');
                return;
            }
            printSummary();
        });
    }
}

function renderRiderProfile(rider) {
    const photo = document.querySelector('#profileAvatar img');
    const statusBadge = document.getElementById('policyBadge');
    const eligibilityBadge = document.getElementById('eligibilityBadge');
    const profileName = document.getElementById('profileName');
    const profileId = document.getElementById('profileId');
    const employeeNo = document.getElementById('employeeNo');
    const storeName = document.getElementById('storeName');
    const brandName = document.getElementById('brandName');
    const insuranceStatusLabel = document.getElementById('insuranceStatusLabel');
    const policyNumberLabel = document.getElementById('policyNumberLabel');
    const daysRemainingLabel = document.getElementById('daysRemainingLabel');
    const completionStatusLabel = document.getElementById('completionStatusLabel');
    const insuranceProviderLabel = document.getElementById('insuranceProviderLabel');
    const startDateLabel = document.getElementById('startDateLabel');
    const endDateLabel = document.getElementById('endDateLabel');
    const coverageAmountLabel = document.getElementById('coverageAmountLabel');
    const eligibilityLabel = document.getElementById('eligibilityLabel');
    const nomineeNameLabel = document.getElementById('nomineeNameLabel');
    const nomineeRelationshipLabel = document.getElementById('nomineeRelationshipLabel');
    const nomineeDobLabel = document.getElementById('nomineeDobLabel');
    const timelineList = document.getElementById('timelineList');
    const verifyCard = document.getElementById('profileVerificationCard');

    // Handle verification card display
    if (verifyCard) {
        verifyCard.style.display = isUnlocked ? 'none' : 'block';
    }

    // Display profile photo if set
    if (photo) {
        if (isUnlocked && rider.profilePhoto) {
            photo.src = rider.profilePhoto;
        } else {
            photo.src = "https://via.placeholder.com/180x180.png?text=LOCKED";
        }
    }

    // Set insurance statuses
    const insStatus = rider.insuranceStatus || 'pending';
    if (statusBadge) {
        statusBadge.textContent = isUnlocked ? `${capitalize(insStatus)} Insurance` : '*****';
        statusBadge.className = `status-label status-${isUnlocked && insStatus === 'inactive' ? 'inactive' : 'active'}`;
    }
    
    const eligStatus = rider.insuranceEligibilityStatus || 'pending';
    if (eligibilityBadge) {
        eligibilityBadge.textContent = isUnlocked ? capitalize(eligStatus) : '*****';
        eligibilityBadge.className = `status-label status-${isUnlocked && eligStatus === 'ineligible' ? 'inactive' : 'eligible'}`;
    }

    if (profileName) profileName.textContent = rider.employeeName || 'Rider Name';
    if (profileId) profileId.textContent = isUnlocked ? `Rider ID: ${rider.id}` : 'Rider ID: *****';
    if (employeeNo) employeeNo.textContent = isUnlocked ? `Employee No: ${rider.employeeNo || '—'}` : 'Employee No: *****';
    if (storeName) storeName.textContent = `Store: ${rider.storeName || '—'}`;
    if (brandName) brandName.textContent = `Brand: ${rider.brandName || '—'}`;

    if (insuranceStatusLabel) insuranceStatusLabel.textContent = isUnlocked ? capitalize(insStatus) : '*****';
    if (policyNumberLabel) policyNumberLabel.textContent = isUnlocked ? (rider.insurancePolicyNumber || '—') : '*****';
    if (insuranceProviderLabel) insuranceProviderLabel.textContent = isUnlocked ? (rider.insuranceProvider || '—') : '*****';
    if (startDateLabel) startDateLabel.textContent = isUnlocked ? formatDate(rider.insuranceStartDate) : '*****';
    if (endDateLabel) endDateLabel.textContent = isUnlocked ? formatDate(rider.insuranceEndDate) : '*****';
    
    if (coverageAmountLabel) {
        coverageAmountLabel.textContent = isUnlocked ? (rider.coverageAmount ? `₹ ${Number(rider.coverageAmount).toLocaleString('en-IN')}` : '—') : '*****';
    }
    if (eligibilityLabel) eligibilityLabel.textContent = isUnlocked ? capitalize(eligStatus) : '*****';
    
    if (nomineeNameLabel) nomineeNameLabel.textContent = isUnlocked ? (rider.nomineeName || '—') : '*****';
    if (nomineeRelationshipLabel) nomineeRelationshipLabel.textContent = isUnlocked ? (rider.nomineeRelationship || '—') : '*****';
    if (nomineeDobLabel) nomineeDobLabel.textContent = isUnlocked ? formatDate(rider.nomineeDOB) : '*****';

    const daysRemaining = getDaysRemaining(rider.insuranceEndDate);
    if (daysRemainingLabel) {
        daysRemainingLabel.textContent = isUnlocked ? (daysRemaining >= 0 ? `${daysRemaining} days` : 'Expired') : '*****';
    }
    
    if (completionStatusLabel) {
        completionStatusLabel.textContent = isUnlocked ? (insStatus === 'active' ? 'Policy Active' : insStatus === 'inactive' ? 'Policy Inactive' : 'Pending Activation') : '*****';
    }

    if (timelineList) {
        if (isUnlocked) {
            renderTimeline(rider, timelineList, daysRemaining);
        } else {
            timelineList.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 2rem;">🔒 Timeline is locked.</div>';
        }
    }
}

function getDaysRemaining(endDateValue) {
    if (!endDateValue) return -1;
    const now = new Date();
    const endDate = new Date(endDateValue);
    if (Number.isNaN(endDate.getTime())) return -1;
    return Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
}

function renderTimeline(rider, timelineList, daysRemaining) {
    timelineList.innerHTML = '';
    const steps = [
        {
            title: 'Registration Created',
            description: rider.createdAt ? formatDate(rider.createdAt) : 'Pending',
            completed: Boolean(rider.createdAt),
            icon: '📝'
        },
        {
            title: 'Policy Issued',
            description: rider.insurancePolicyNumber || 'Not issued',
            completed: Boolean(rider.insurancePolicyNumber && rider.insuranceProvider),
            icon: '📄'
        },
        {
            title: rider.insuranceStatus === 'active' ? 'Coverage Active' : 'Coverage Pending',
            description: rider.insuranceStatus ? capitalize(rider.insuranceStatus) : 'Pending',
            completed: rider.insuranceStatus === 'active',
            icon: rider.insuranceStatus === 'active' ? '✅' : '⏳'
        },
        {
            title: daysRemaining < 0 ? 'Policy Expired' : 'Expiry Alert',
            description: daysRemaining < 0 ? `Expired ${Math.abs(daysRemaining)} days ago` : `${daysRemaining} days remaining`,
            completed: daysRemaining >= 0,
            icon: daysRemaining < 0 ? '⚠️' : '⏰',
            expired: daysRemaining < 0
        }
    ];

    steps.forEach(step => {
        const item = document.createElement('div');
        item.className = `timeline-step ${step.completed ? 'completed' : ''} ${step.expired ? 'expired' : ''}`;
        item.innerHTML = `
            <div class="timeline-icon">${step.icon}</div>
            <div class="timeline-content">
              <strong>${step.title}</strong>
              <span>${step.description}</span>
            </div>
        `;
        timelineList.appendChild(item);
    });
}

function downloadCertificate(rider) {
    const content = [
        'RIDER INSURANCE CERTIFICATE',
        '--------------------------------------',
        `Name: ${rider.employeeName || '—'}`,
        `Rider ID: ${rider.id}`,
        `Employee No: ${rider.employeeNo || '—'}`,
        `Brand: ${rider.brandName || '—'}`,
        `Store: ${rider.storeName || '—'}`,
        `Policy Number: ${rider.insurancePolicyNumber || '—'}`,
        `Provider: ${rider.insuranceProvider || '—'}`,
        `Start Date: ${formatDate(rider.insuranceStartDate)}`,
        `End Date: ${formatDate(rider.insuranceEndDate)}`,
        `Coverage: ₹ ${Number(rider.coverageAmount || 0).toLocaleString('en-IN')}`,
        `Eligibility: ${capitalize(rider.insuranceEligibilityStatus || 'Pending')}`,
        `Status: ${capitalize(rider.insuranceStatus || 'Pending')}`,
        '--------------------------------------',
        'This certificate confirms the rider insurance details as recorded in the Rider Insurance Portal.'
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `insurance-certificate-${rider.employeeNo || rider.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function printSummary() {
    window.print();
}

function capitalize(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

window.addEventListener('DOMContentLoaded', initProfilePage);
