// Initialize storage on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['jobCounter', 'savedJobs'], (result) => {
    const defaults = {
      jobCounter: 0,
      savedJobs: []
    };

    // Set defaults if they don't exist
    if (result.jobCounter === undefined) {
      chrome.storage.local.set({ jobCounter: defaults.jobCounter });
    }
    if (result.savedJobs === undefined) {
      chrome.storage.local.set({ savedJobs: defaults.savedJobs });
    }
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveJob') {
    chrome.storage.local.get(['savedJobs'], (result) => {
      const savedJobs = result.savedJobs || [];
      savedJobs.push(message.jobData);

      chrome.storage.local.set({ savedJobs }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true });
        }
      });
    });

    return true; // Required for async response
  }
});