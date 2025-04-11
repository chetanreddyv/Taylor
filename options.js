document.addEventListener('DOMContentLoaded', () => {
  // Load saved API key
  chrome.storage.local.get(['chatgptApiKey'], (result) => {
    if (result.chatgptApiKey) {
      document.getElementById('apiKey').value = result.chatgptApiKey;
    }
  });

  // Save settings when button is clicked
  document.getElementById('saveButton').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    
    chrome.storage.local.set({ chatgptApiKey: apiKey }, () => {
      showStatus('Settings saved successfully!', 'success');
    });
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}