/**
 * ========================================
 * RIDER INSURANCE REGISTRATION APP
 * Frontend connected to Flask Python API
 * ========================================
 */

const isLocalDev = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    !window.location.origin.startsWith('http');

const API_BASE_URL = (isLocalDev && window.location.port !== '5001'
    ? 'http://localhost:5001'
    : window.location.origin) + '/api';

// ========================================
// STATE MANAGEMENT
// ========================================

let appState = {
    riders: [],
    filteredRiders: [],
    editingRiderId: null,
    deleteRiderId: null,
    isDarkMode: localStorage.getItem('darkMode') === 'true',
    statusFilter: 'all',
    searchTerm: '',
    selectedProfilePhoto: null,
    sortBy: 'name'
};

// ========================================
// DOM ELEMENTS
// ========================================

const registrationModal = document.getElementById('registrationModal');
const registrationForm = document.getElementById('registrationForm');
const formTitle = document.getElementById('formTitle');
const successPopup = document.getElementById('successPopup');
const deleteModal = document.getElementById('deleteModal');
const successBtn = document.getElementById('successBtn');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
const deleteCancelBtn = document.getElementById('deleteCancelBtn');
const addRiderBtn = document.getElementById('addRiderBtn');
const exportBtn = document.getElementById('exportBtn');
const searchBtn = document.getElementById('searchBtn');
const resetSearchBtn = document.getElementById('resetSearchBtn');
const searchInput = document.getElementById('searchInput');
const statusFilterSelect = document.getElementById('statusFilter');
const themeToggle = document.getElementById('themeToggle');
const ridersContainer = document.getElementById('ridersContainer');
const emptyState = document.getElementById('emptyState');
const closeFormBtn = document.getElementById('closeFormBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const totalRidersEl = document.getElementById('totalRiders');
const activeRidersEl = document.getElementById('activeRiders');
const pendingInsuranceEl = document.getElementById('pendingInsurance');
const completedInsuranceEl = document.getElementById('completedInsurance');
const expiringPoliciesEl = document.getElementById('expiringPolicies');
const recentlyActivatedEl = document.getElementById('recentlyActivated');
const profilePhotoInput = document.getElementById('profilePhoto');
const photoPreview = document.getElementById('photoPreview');

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Application initialized. API URL:', API_BASE_URL);
    
    // Apply saved theme
    if (appState.isDarkMode) {
        document.body.classList.add('dark-mode');
        updateThemeIcon();
    }

    // Set up event listeners
    setupEventListeners();

    // Load data from API
    loadDashboardData();
});

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Form buttons
    if (addRiderBtn) addRiderBtn.addEventListener('click', openNewRegistrationForm);
    if (closeFormBtn) closeFormBtn.addEventListener('click', closeRegistrationForm);
    if (cancelFormBtn) cancelFormBtn.addEventListener('click', closeRegistrationForm);
    if (registrationForm) registrationForm.addEventListener('submit', handleFormSubmit);

    // Search functionality
    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
    if (resetSearchBtn) resetSearchBtn.addEventListener('click', handleResetSearch);
    if (statusFilterSelect) statusFilterSelect.addEventListener('change', handleFilterChange);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    // Profile photo preview
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', handleProfilePhotoChange);
    }

    // Export functionality
    if (exportBtn) exportBtn.addEventListener('click', handleExport);

    // Theme toggle
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    // Success popup
    if (successBtn) successBtn.addEventListener('click', closeSuccessPopup);

    // Delete confirmation
    if (deleteConfirmBtn) deleteConfirmBtn.addEventListener('click', confirmDelete);
    if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeleteModal);
    
    const deleteCloseBtn = document.getElementById('deleteCloseBtn');
    if (deleteCloseBtn) deleteCloseBtn.addEventListener('click', closeDeleteModal);

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === registrationModal) closeRegistrationForm();
        if (e.target === deleteModal) closeDeleteModal();
    });
}

// ========================================
// FORM MANAGEMENT
// ========================================

/**
 * Opens the registration form for adding a new rider
 */
function openNewRegistrationForm() {
    appState.editingRiderId = null;
    appState.selectedProfilePhoto = null;
    formTitle.textContent = 'New Rider Registration';
    registrationForm.reset();
    clearAllErrors();
    updatePhotoPreview();
    
    // Enable editing on key fields (like Employee No, which is read-only during edit)
    document.getElementById('employeeNo').disabled = false;
    
    registrationModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the registration form modal
 */
function closeRegistrationForm() {
    registrationModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    registrationForm.reset();
    clearAllErrors();
    appState.selectedProfilePhoto = null;
    updatePhotoPreview();
}

/**
 * Clears all error messages from the form
 */
function clearAllErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(error => {
        error.classList.remove('show');
        error.textContent = '';
    });

    const errorInputs = document.querySelectorAll('.error');
    errorInputs.forEach(input => {
        input.classList.remove('error');
    });
}

/**
 * Handles form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    clearAllErrors();

    // Collect form data
    const formData = {
        brandName: document.getElementById('brandName').value.trim(),
        storeName: document.getElementById('storeName').value.trim(),
        employeeNo: document.getElementById('employeeNo').value.trim(),
        employeeName: document.getElementById('employeeName').value.trim(),
        employeeEmail: document.getElementById('employeeEmail').value.trim(),
        employeePhone: document.getElementById('employeePhone').value.trim(),
        employeeGender: document.getElementById('employeeGender').value,
        employeeDOB: document.getElementById('employeeDOB').value,
        panNumber: document.getElementById('panNumber').value.trim().toUpperCase(),
        employeeAddress: document.getElementById('employeeAddress').value.trim(),
        employeeCity: document.getElementById('employeeCity').value.trim(),
        employeeState: document.getElementById('employeeState').value,
        employeePinCode: document.getElementById('employeePinCode').value.trim(),
        nomineeName: document.getElementById('nomineeName').value.trim(),
        nomineeGender: document.getElementById('nomineeGender').value,
        nomineeDOB: document.getElementById('nomineeDOB').value,
        nomineeRelationship: document.getElementById('nomineeRelationship').value
    };

    // Validate form
    if (!validateForm(formData)) {
        console.warn('Form validation failed');
        // Scroll modal body to top to see first errors
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) modalContent.scrollTop = 0;
        return;
    }

    const submitBtn = registrationForm.querySelector('.btn-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.loading-spinner');
    
    // Show loading spinner
    if (btnText) btnText.style.display = 'none';
    if (spinner) spinner.style.display = 'inline-block';
    submitBtn.disabled = true;

    try {
        if (appState.editingRiderId) {
            await updateRider(appState.editingRiderId, formData);
            closeRegistrationForm();
            showSuccessPopup('Update Successful!', 'Rider details have been updated successfully.');
        } else {
            await addNewRider(formData);
            closeRegistrationForm();
            showSuccessPopup('Registration Successful!', 'New rider has been registered successfully.');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert(error.message || 'Error occurred while saving rider.');
    } finally {
        if (btnText) btnText.style.display = 'inline';
        if (spinner) spinner.style.display = 'none';
        submitBtn.disabled = false;
    }
}

/**
 * Validates registration form inputs
 */
function validateForm(data) {
    let isValid = true;

    // Required fields check
    if (!validateRequired(data.brandName, 'brandName', 'Brand name is required')) isValid = false;
    if (!validateRequired(data.storeName, 'storeName', 'Store name is required')) isValid = false;
    if (!validateRequired(data.employeeNo, 'employeeNo', 'Employee number is required')) isValid = false;
    
    if (!validateRequired(data.employeeName, 'employeeName', 'Employee name is required')) isValid = false;
    if (data.employeeName && data.employeeName.length < 3) {
        showError('employeeName', 'Name must be at least 3 characters');
        isValid = false;
    }

    // Email validation
    if (!validateRequired(data.employeeEmail, 'employeeEmail', 'Email is required')) isValid = false;
    if (data.employeeEmail && !validateEmail(data.employeeEmail)) {
        showError('employeeEmail', 'Please enter a valid email address');
        isValid = false;
    }

    // Phone validation
    if (!validateRequired(data.employeePhone, 'employeePhone', 'Mobile number is required')) isValid = false;
    if (data.employeePhone && !validatePhone(data.employeePhone)) {
        showError('employeePhone', 'Mobile number must be exactly 10 digits');
        isValid = false;
    }

    // Gender validation
    if (!validateRequired(data.employeeGender, 'employeeGender', 'Please select gender')) isValid = false;

    // DOB validation
    if (!validateRequired(data.employeeDOB, 'employeeDOB', 'Date of birth is required')) isValid = false;
    if (data.employeeDOB && !validateDOB(data.employeeDOB, 18)) {
        showError('employeeDOB', 'Employee must be at least 18 years old');
        isValid = false;
    }

    // PAN validation
    if (!validateRequired(data.panNumber, 'panNumber', 'PAN number is required')) isValid = false;
    if (data.panNumber && !validatePAN(data.panNumber)) {
        showError('panNumber', 'Invalid PAN format (AAAAA0000A)');
        isValid = false;
    }

    // Address validation
    if (!validateRequired(data.employeeAddress, 'employeeAddress', 'Address is required')) isValid = false;
    if (data.employeeAddress && data.employeeAddress.length < 5) {
        showError('employeeAddress', 'Address must be at least 5 characters');
        isValid = false;
    }

    // City validation
    if (!validateRequired(data.employeeCity, 'employeeCity', 'City is required')) isValid = false;

    // State validation
    if (!validateRequired(data.employeeState, 'employeeState', 'Please select state')) isValid = false;

    // Pin Code validation
    if (!validateRequired(data.employeePinCode, 'employeePinCode', 'Pin code is required')) isValid = false;
    if (data.employeePinCode && !validatePinCode(data.employeePinCode)) {
        showError('employeePinCode', 'Pin code must be exactly 6 digits');
        isValid = false;
    }

    // Nominee Name validation
    if (!validateRequired(data.nomineeName, 'nomineeName', 'Nominee name is required')) isValid = false;
    if (data.nomineeName && data.nomineeName.length < 3) {
        showError('nomineeName', 'Nominee name must be at least 3 characters');
        isValid = false;
    }

    // Nominee Gender validation
    if (!validateRequired(data.nomineeGender, 'nomineeGender', 'Please select nominee gender')) isValid = false;

    // Nominee DOB validation
    if (!validateRequired(data.nomineeDOB, 'nomineeDOB', 'Nominee date of birth is required')) isValid = false;

    // Nominee Relationship validation
    if (!validateRequired(data.nomineeRelationship, 'nomineeRelationship', 'Please select nominee relationship')) isValid = false;



    return isValid;
}

/**
 * Validates a positive numeric field
 */
function validatePositiveNumber(value) {
    return !isNaN(value) && Number(value) >= 0;
}

/**
 * Handles profile photo selection and preview
 */
function handleProfilePhotoChange(event) {
    const file = event.target.files[0];
    if (!file) {
        appState.selectedProfilePhoto = null;
        updatePhotoPreview();
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        appState.selectedProfilePhoto = e.target.result;
        updatePhotoPreview();
    };
    reader.readAsDataURL(file);
}

/**
 * Updates the profile photo preview element
 */
function updatePhotoPreview() {
    if (!photoPreview) return;

    photoPreview.innerHTML = '';
    if (appState.selectedProfilePhoto) {
        const img = document.createElement('img');
        img.src = appState.selectedProfilePhoto;
        img.alt = 'Profile Photo Preview';
        photoPreview.appendChild(img);
        return;
    }

    const placeholder = document.createElement('span');
    placeholder.textContent = 'No photo';
    photoPreview.appendChild(placeholder);
}

/**
 * Validates required fields
 */
function validateRequired(value, fieldId, message) {
    if (!value) {
        showError(fieldId, message);
        return false;
    }
    return true;
}

/**
 * Validates email format
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates phone number (10 digits)
 */
function validatePhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}

/**
 * Validates PAN number format (AAAAA0000A)
 */
function validatePAN(pan) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
}

/**
 * Validates pin code (6 digits)
 */
function validatePinCode(pinCode) {
    const pinRegex = /^\d{6}$/;
    return pinRegex.test(pinCode);
}

/**
 * Validates date of birth (must be at least minAge years old)
 */
function validateDOB(dob, minAge = 0) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age >= minAge && birthDate < today;
}

/**
 * Shows error message for a field
 */
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + 'Error');

    if (field) {
        field.classList.add('error');
        if (field.parentElement) {
            field.parentElement.classList.add('error');
        }
    }

    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}

// ========================================
// CRUD OPERATIONS
// ========================================

/**
 * Adds a new rider via API
 */
async function addNewRider(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/riders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (response.ok && result.success) {
            console.log('Rider added:', result);
            await loadRidersFromAPI();
        } else {
            throw new Error(result.error || 'Failed to add rider');
        }
    } catch (error) {
        console.error('Error adding rider:', error);
        throw error;
    }
}

/**
 * Updates an existing rider via API
 */
async function updateRider(riderId, formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/riders/${riderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (response.ok && result.success) {
            console.log('Rider updated:', result);
            await loadRidersFromAPI();
        } else {
            throw new Error(result.error || 'Failed to update rider');
        }
    } catch (error) {
        console.error('Error updating rider:', error);
        throw error;
    }
}

/**
 * Deletes a rider via API
 */
async function deleteRider(riderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/riders/${riderId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (response.ok && result.success) {
            console.log('Rider deleted:', result);
            await loadRidersFromAPI();
        } else {
            throw new Error(result.error || 'Failed to delete rider');
        }
    } catch (error) {
        console.error('Error deleting rider:', error);
        throw error;
    }
}

/**
 * Gets a rider by ID via API
 */
async function getRiderById(riderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/riders/${riderId}`);
        const result = await response.json();
        if (result.success) {
            return result.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching rider:', error);
        return null;
    }
}

/**
 * Loads all riders from API
 */
async function loadRidersFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/riders`);
        const result = await response.json();
        if (result.success) {
            appState.riders = result.data || [];
            appState.filteredRiders = [...appState.riders];
            
            // Cache to local storage so the profile detail pages can access them if offline
            localStorage.setItem('riders', JSON.stringify(appState.riders));
            localStorage.setItem('ridersData', JSON.stringify(appState.riders));
            
            renderRiders(appState.riders);
            await loadDashboardStats();
            return appState.riders;
        }
    } catch (error) {
        console.error('Error loading riders:', error);
    }
    return [];
}

// ========================================
// EDIT FUNCTIONALITY
// ========================================

/**
 * Opens edit form for a rider - loads from API
 */
async function editRider(riderId) {
    const rider = await getRiderById(riderId);
    if (!rider) {
        console.error('Rider not found');
        return;
    }

    appState.editingRiderId = riderId;
    formTitle.textContent = 'Edit Rider Information';

    // Populate form fields from API data (handles both db structures transparently)
    document.getElementById('brandName').value = rider.brandName || '';
    document.getElementById('storeName').value = rider.storeName || '';
    document.getElementById('employeeNo').value = rider.employeeNo || '';
    document.getElementById('employeeName').value = rider.employeeName || '';
    document.getElementById('employeeEmail').value = rider.employeeEmail || '';
    document.getElementById('employeePhone').value = rider.employeePhone || '';
    document.getElementById('employeeGender').value = rider.employeeGender || '';
    document.getElementById('employeeDOB').value = rider.employeeDOB || '';
    document.getElementById('panNumber').value = rider.panNumber || '';
    document.getElementById('employeeAddress').value = rider.employeeAddress || '';
    document.getElementById('employeeCity').value = rider.employeeCity || '';
    document.getElementById('employeeState').value = rider.employeeState || '';
    document.getElementById('employeePinCode').value = rider.employeePinCode || '';
    
    document.getElementById('nomineeName').value = rider.nomineeName || '';
    document.getElementById('nomineeGender').value = rider.nomineeGender || '';
    document.getElementById('nomineeDOB').value = rider.nomineeDOB || '';
    document.getElementById('nomineeRelationship').value = rider.nomineeRelationship || '';
    

    
    // Prevent changing employee number during edit (unique identifier key constraint)
    document.getElementById('employeeNo').disabled = true;

    // Open modal
    registrationModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ========================================
// DELETE FUNCTIONALITY
// ========================================

/**
 * Opens delete confirmation modal
 */
function openDeleteConfirmation(riderId) {
    appState.deleteRiderId = riderId;
    deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Closes delete confirmation modal
 */
function closeDeleteModal() {
    deleteModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    appState.deleteRiderId = null;
}

/**
 * Confirms and executes deletion
 */
async function confirmDelete() {
    if (appState.deleteRiderId) {
        try {
            await deleteRider(appState.deleteRiderId);
            closeDeleteModal();
            showSuccessPopup(
                'Rider Deleted',
                'Rider record has been successfully deleted.'
            );
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Failed to delete rider record.');
        }
    }
}

// ========================================
// SEARCH AND FILTER
// ========================================

/**
 * Handles search functionality
 */
async function handleSearch() {
    appState.searchTerm = searchInput.value.trim().toLowerCase();
    await filterRiders();
}

async function handleFilterChange() {
    appState.statusFilter = statusFilterSelect.value;
    await filterRiders();
}

async function filterRiders() {
    const query = appState.searchTerm;
    const status = appState.statusFilter;
    
    try {
        const response = await fetch(`${API_BASE_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, status })
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
            appState.filteredRiders = result.data || [];
            renderRiders(appState.filteredRiders);
            console.log(`Loaded ${appState.filteredRiders.length} filtered results from API`);
        } else {
            throw new Error(result.error || 'Search failed');
        }
    } catch (error) {
        console.error('Search error, using local fallback:', error);
        
        // Local fallback filtering
        appState.filteredRiders = appState.riders.filter(rider => {
            const matchesSearch = !query || [
                rider.employeeName,
                rider.employeeEmail,
                rider.employeeNo,
                rider.employeePhone,
                rider.brandName,
                rider.storeName
            ].some(value => value && value.toLowerCase().includes(query));

            const matchesStatus = status === 'all' || rider.insuranceStatus === status;

            return matchesSearch && matchesStatus;
        });

        renderRiders(appState.filteredRiders);
    }
}

/**
 * Resets search and shows all riders
 */
async function handleResetSearch() {
    searchInput.value = '';
    statusFilterSelect.value = 'all';
    appState.searchTerm = '';
    appState.statusFilter = 'all';
    appState.filteredRiders = [...appState.riders];
    renderRiders(appState.riders);
}

// ========================================
// RENDERING FUNCTIONS
// ========================================

/**
 * Updates dashboard statistics
 */
function updateStatistics(stats) {
    if (totalRidersEl) animateCounter(totalRidersEl, stats.total_riders || 0);
    if (activeRidersEl) animateCounter(activeRidersEl, stats.active_riders || 0);
    if (pendingInsuranceEl) animateCounter(pendingInsuranceEl, stats.pending_insurance || 0);
    if (completedInsuranceEl) animateCounter(completedInsuranceEl, stats.completed_insurance || 0);
    if (expiringPoliciesEl) animateCounter(expiringPoliciesEl, stats.expiring_policies || 0);
    if (recentlyActivatedEl) animateCounter(recentlyActivatedEl, stats.recently_activated || 0);
}

/**
 * Animates counter values
 */
function animateCounter(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    if (currentValue === targetValue) {
        element.textContent = targetValue;
        return;
    }
    
    const increment = Math.ceil((targetValue - currentValue) / 10) || (targetValue > currentValue ? 1 : -1);
    let count = currentValue;

    const interval = setInterval(() => {
        count += increment;
        if ((increment > 0 && count >= targetValue) || (increment < 0 && count <= targetValue)) {
            count = targetValue;
            clearInterval(interval);
        }
        element.textContent = count;
    }, 30);
}

/**
 * Renders riders in the container
 */
function renderRiders(riders) {
    ridersContainer.innerHTML = '';

    if (riders.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    riders.forEach((rider) => {
        const riderCard = createRiderCard(rider);
        ridersContainer.appendChild(riderCard);
    });
}

/**
 * Creates a rider card element
 */
function createRiderCard(rider) {
    const card = document.createElement('div');
    card.className = 'rider-card';

    // Format fields
    const statusClass = rider.insuranceStatus || 'inactive';
    const employeeName = rider.employeeName || 'N/A';
    const employeeNo = rider.employeeNo || 'N/A';
    const employeeEmail = rider.employeeEmail || 'N/A';
    const employeePhone = rider.employeePhone || 'N/A';
    const employeeCity = rider.employeeCity || 'N/A';
    const employeeState = rider.employeeState || 'N/A';
    const brandName = rider.brandName || 'N/A';
    const storeName = rider.storeName || 'N/A';
    const nomineeName = rider.nomineeName || 'N/A';
    const nomineeRelationship = rider.nomineeRelationship || 'N/A';
    
    let photoHtml = `<span>${employeeName.charAt(0).toUpperCase() || '👤'}</span>`;
    if (rider.profilePhoto) {
        photoHtml = `<img src="${rider.profilePhoto}" alt="${escapeHtml(employeeName)}" />`;
    }

    card.innerHTML = `
        <div class="rider-photo">
            ${photoHtml}
        </div>
        <div class="rider-info">
            <div class="rider-header">
                <div>
                    <h3 class="rider-name">
                        <a href="rider-profile.html?id=${encodeURIComponent(rider.id)}" class="rider-name-link">${escapeHtml(employeeName)}</a>
                    </h3>
                    <p class="rider-meta">${escapeHtml(brandName)} • ${escapeHtml(storeName)}</p>
                </div>
                <span class="rider-status ${statusClass}">${capitalize(statusClass)}</span>
            </div>

            <div class="rider-details">
                <div class="rider-info-item">
                    <span class="rider-info-label">ID / Emp No:</span>
                    <span class="rider-info-value">${escapeHtml(employeeNo)}</span>
                </div>
                <div class="rider-info-item">
                    <span class="rider-info-label">📧 Email:</span>
                    <span class="rider-info-value" title="${escapeHtml(employeeEmail)}">${escapeHtml(employeeEmail)}</span>
                </div>
                <div class="rider-info-item">
                    <span class="rider-info-label">📱 Phone:</span>
                    <span class="rider-info-value">${escapeHtml(employeePhone)}</span>
                </div>
                <div class="rider-info-item">
                    <span class="rider-info-label">📍 Location:</span>
                    <span class="rider-info-value">${escapeHtml(employeeCity)}, ${escapeHtml(employeeState)}</span>
                </div>
                <div class="rider-info-item">
                    <span class="rider-info-label">👤 Nominee:</span>
                    <span class="rider-info-value">${escapeHtml(nomineeName)} (${nomineeRelationship})</span>
                </div>
            </div>

            <div class="rider-actions">
                <button class="rider-action-btn rider-edit-btn" onclick="editRider('${rider.id}')">
                    ✏️ Edit
                </button>
                
            </div>
        </div>
    `;

    return card;
}

// ========================================
// SUCCESS POPUP
// ========================================

/**
 * Shows success popup
 */
function showSuccessPopup(title, message) {
    document.getElementById('successTitle').textContent = title;
    document.getElementById('successMessage').textContent = message;
    successPopup.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Closes success popup
 */
function closeSuccessPopup() {
    successPopup.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ========================================
// EXPORT FUNCTIONALITY
// ========================================

/**
 * Handles data export
 */
function handleExport() {
    if (appState.riders.length === 0) {
        alert('No riders to export');
        return;
    }

    // Create CSV content
    const csvContent = generateCSV(appState.riders);

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `riders_export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('Data exported successfully');
}

/**
 * Generates CSV content from riders data
 */
function generateCSV(riders) {
    const headers = [
        'ID',
        'Brand Name',
        'Store Name',
        'Employee No',
        'Employee Name',
        'Email',
        'Phone',
        'Gender',
        'Date of Birth',
        'PAN',
        'Address',
        'City',
        'State',
        'Pin Code',
        'Nominee Name',
        'Nominee Gender',
        'Nominee DOB',
        'Nominee Relationship',
        'Insurance Status',
        'Policy Number',
        'Provider',
        'Policy Start',
        'Policy End',
        'Coverage Amount',
        'Eligibility Status',
        'Created At'
    ];

    let csv = headers.join(',') + '\n';

    riders.forEach(rider => {
        const row = [
            rider.id,
            `"${rider.brandName || ''}"`,
            `"${rider.storeName || ''}"`,
            rider.employeeNo || '',
            `"${rider.employeeName || ''}"`,
            rider.employeeEmail || '',
            rider.employeePhone || '',
            rider.employeeGender || '',
            rider.employeeDOB || '',
            rider.panNumber || '',
            `"${rider.employeeAddress || ''}"`,
            rider.employeeCity || '',
            rider.employeeState || '',
            rider.employeePinCode || '',
            `"${rider.nomineeName || ''}"`,
            rider.nomineeGender || '',
            rider.nomineeDOB || '',
            rider.nomineeRelationship || '',
            rider.insuranceStatus || '',
            rider.insurancePolicyNumber || '',
            rider.insuranceProvider || '',
            rider.insuranceStartDate || '',
            rider.insuranceEndDate || '',
            rider.coverageAmount || '',
            rider.insuranceEligibilityStatus || '',
            rider.createdAt || ''
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

// ========================================
// THEME TOGGLE
// ========================================

/**
 * Toggles between dark and light theme
 */
function toggleTheme() {
    appState.isDarkMode = !appState.isDarkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', appState.isDarkMode);
    updateThemeIcon();
    console.log('Theme toggled:', appState.isDarkMode ? 'Dark' : 'Light');
}

/**
 * Updates theme icon based on current theme
 */
function updateThemeIcon() {
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = appState.isDarkMode ? '☀️' : '🌙';
}

// ========================================
// API DATA MANAGEMENT
// ========================================

/**
 * Load all dashboard data from Flask API
 */
async function loadDashboardData() {
    try {
        await loadRidersFromAPI();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Failed to load data. Make sure the Flask API is running.');
    }
}

/**
 * Load stats separately to animate counters
 */
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        const result = await response.json();
        
        if (response.ok && result.success) {
            updateStatistics(result);
        } else {
            // Compute locally if stats endpoint fails
            const stats = computeLocalStats();
            updateStatistics(stats);
        }
    } catch (error) {
        console.warn('Stats API failed. Computing statistics locally.');
        const stats = computeLocalStats();
        updateStatistics(stats);
    }
}

/**
 * Local statistics fallback computation
 */
function computeLocalStats() {
    const riders = appState.riders;
    const total = riders.length;
    const active = riders.filter(r => r.insuranceStatus === 'active').length;
    const pending = riders.filter(r => r.insuranceStatus === 'pending').length;
    const completed = riders.filter(r => r.insuranceStatus === 'completed').length;
    
    // Expiring (active and expiry in <= 30 days)
    const now = new Date();
    const expiring = riders.filter(r => {
        if (r.insuranceStatus !== 'active' || !r.insuranceEndDate) return false;
        const end = new Date(r.insuranceEndDate);
        const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
    }).length;
    
    // Recently activated (active and created/updated within 7 days)
    const recently = riders.filter(r => {
        if (r.insuranceStatus !== 'active') return false;
        const dateStr = r.updatedAt || r.createdAt;
        if (!dateStr) return false;
        const updated = new Date(dateStr);
        const diffDays = Math.ceil((now - updated) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    }).length;

    return {
        total_riders: total,
        active_riders: active,
        pending_insurance: pending,
        completed_insurance: completed,
        expiring_policies: expiring,
        recently_activated: recently
    };
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Capitalizes first letter
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

console.log('Rider Insurance Registration App - script.js loaded successfully');
