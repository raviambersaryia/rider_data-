document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('securitySearchInput');
  const searchBtn = document.getElementById('securitySearchBtn');
  const emptyState = document.getElementById('securityEmptyState');
  const resultCard = document.getElementById('securityResultCard');

  const statusBadge = document.getElementById('verificationStatusBadge');
  const badgeIcon = document.getElementById('badgeIcon');
  const badgeText = document.getElementById('badgeText');

  const verifyName = document.getElementById('riderVerifyName');
  const verifyStore = document.getElementById('riderVerifyStore');
  const verifyEmpNo = document.getElementById('riderVerifyEmpNo');
  const verifyPhone = document.getElementById('riderVerifyPhone');
  const verifyEmail = document.getElementById('riderVerifyEmail');
  const verifyStatus = document.getElementById('riderVerifyStatus');
  const verifyNominee = document.getElementById('riderVerifyNominee');
  const verifyPhoto = document.getElementById('riderVerifyPhoto');

  // Set API base url
  const isLocalDev = 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      !window.location.origin.startsWith('http');

  const API_BASE_URL = (isLocalDev && window.location.port !== '5001'
      ? 'http://localhost:5001'
      : window.location.origin) + '/api';

  async function handleVerification() {
    const query = searchInput.value.trim();
    
    // Clear previous results
    resultCard.style.display = 'none';
    emptyState.style.display = 'block';

    if (!query) {
      alert('Please enter a Mobile Number or Employee ID.');
      return;
    }

    // Must be numeric only
    if (!/^\d+$/.test(query)) {
      alert('Security lookup requires a numeric Mobile Number or Employee ID.');
      return;
    }

    try {
      // Call api/search with query
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, status: 'all' })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to search');
      }

      const riders = result.data || [];
      
      // Look for exact match on phone or employee number
      const matchingRider = riders.find(
        r => String(r.employeeNo) === query || String(r.employeePhone) === query
      );

      if (matchingRider) {
        // Render verified state
        emptyState.style.display = 'none';
        resultCard.style.display = 'block';

        statusBadge.className = 'verification-badge badge-verified';
        badgeIcon.textContent = '✅';
        badgeText.textContent = 'RIDER VERIFIED';

        verifyName.textContent = matchingRider.employeeName || 'N/A';
        verifyStore.textContent = `${matchingRider.brandName || 'N/A'} • ${matchingRider.storeName || 'N/A'}`;
        verifyEmpNo.textContent = matchingRider.employeeNo || 'N/A';
        verifyPhone.textContent = matchingRider.employeePhone || 'N/A';
        verifyEmail.textContent = matchingRider.employeeEmail || 'N/A';
        verifyStatus.textContent = (matchingRider.insuranceStatus || 'N/A').toUpperCase();
        verifyNominee.textContent = matchingRider.nomineeName 
          ? `${matchingRider.nomineeName} (${matchingRider.nomineeRelationship || 'N/A'})` 
          : 'N/A';

        // Render photo
        verifyPhoto.innerHTML = '';
        if (matchingRider.profilePhoto) {
          const img = document.createElement('img');
          img.src = matchingRider.profilePhoto;
          img.alt = matchingRider.employeeName || 'Rider';
          verifyPhoto.appendChild(img);
        } else {
          const span = document.createElement('span');
          span.textContent = (matchingRider.employeeName || '👤').charAt(0).toUpperCase();
          verifyPhoto.appendChild(span);
        }
      } else {
        // Render unverified state
        emptyState.style.display = 'none';
        resultCard.style.display = 'block';

        statusBadge.className = 'verification-badge badge-unverified';
        badgeIcon.textContent = '❌';
        badgeText.textContent = 'NOT FOUND / UNVERIFIED';

        verifyName.textContent = 'Rider Not Found';
        verifyStore.textContent = '—';
        verifyEmpNo.textContent = '—';
        verifyPhone.textContent = '—';
        verifyEmail.textContent = '—';
        verifyStatus.textContent = '—';
        verifyNominee.textContent = '—';
        verifyPhoto.innerHTML = '<span>❓</span>';
      }

    } catch (error) {
      console.error('Error during verification:', error);
      alert('Verification lookup failed. Please try again.');
    }
  }

  // Event listeners
  searchBtn.addEventListener('click', handleVerification);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleVerification();
    }
  });
});
